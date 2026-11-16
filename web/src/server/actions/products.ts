'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { categories } from '@/src/catalog/products'
import { PRODUCT_BUCKET, type ProductRow } from '@/src/catalog/db'
import { getAppEnv } from '@/src/server/env'
import { hasPermission } from '@/src/server/rbac'
import { getCurrentUser, type CurrentUser } from '@/src/server/session'
import { logSecurityEvent } from '@/src/server/security-events'
import { isStaff } from '@/src/server/roles'
import { createSupabaseAdminClient } from '@/src/supabase/admin'
import type { FormState } from './types'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const CATEGORY_IDS: readonly string[] = categories.map((c) => c.id)

/** Server actions are public POST endpoints: authenticate + authorize again here, never trust the page that rendered the form. */
async function requireProductManager(): Promise<{ user: CurrentUser } | { error: FormState }> {
  const user = await getCurrentUser()
  if (!user) return { error: { status: 'error', code: 'not_signed_in' } }
  if (!isStaff(user.role) || !(await hasPermission(user, 'products.manage'))) {
    await logSecurityEvent({ eventType: 'authorization_denied', actorId: user.id, endpoint: '/admin/products', method: 'POST', status: 403, metadata: { reason: 'products_manage_missing' } })
    return { error: { status: 'error', code: 'forbidden' } }
  }
  return { user }
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}
function longText(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : ''
}
function int(formData: FormData, key: string): number | null {
  const raw = text(formData, key).replace(/[.,\s]/g, '')
  if (!/^\d{1,10}$/.test(raw)) return null
  return Number.parseInt(raw, 10)
}
function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

/** One specification per line: "English text | Teks Indonesia" (Indonesian part optional). */
function parseSpecs(raw: string): { en: string; id: string }[] | null {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length > 8) return null
  const specs: { en: string; id: string }[] = []
  for (const line of lines) {
    const [en, id] = line.split('|').map((part) => part.trim())
    if (!en || en.length > 120 || (id && id.length > 120)) return null
    specs.push({ en, id: id || en })
  }
  return specs
}

function imageKind(bytes: Uint8Array): { ext: string; mime: string } | null {
  if (bytes.length > 12 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: 'png', mime: 'image/png' }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return { ext: 'webp', mime: 'image/webp' }
  return null
}

type Parsed = {
  values: Omit<ProductRow, 'id' | 'rating' | 'review_count' | 'image_path'>
  file: File | null
}

function parseProduct(formData: FormData): { ok: true; data: Parsed; fields: Record<string, string> } | { ok: false; code: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {}
  for (const key of ['name_en', 'name_id', 'slug', 'category', 'description_en', 'description_id', 'specifications', 'price_idr', 'stock']) {
    fields[key] = typeof formData.get(key) === 'string' ? (formData.get(key) as string) : ''
  }
  const fail = (code: string) => ({ ok: false as const, code, fields })

  const nameEn = text(formData, 'name_en')
  const nameId = text(formData, 'name_id') || nameEn
  if (nameEn.length < 2 || nameEn.length > 120 || nameId.length > 120) return fail('name_invalid')
  const slug = text(formData, 'slug').toLowerCase() || slugify(nameEn)
  if (!SLUG_RE.test(slug) || slug.length > 80) return fail('slug_invalid')
  const category = text(formData, 'category')
  if (!CATEGORY_IDS.includes(category)) return fail('category_invalid')
  const price = int(formData, 'price_idr')
  if (price === null || price > 1_000_000_000) return fail('price_invalid')
  const stock = int(formData, 'stock')
  if (stock === null || stock > 1_000_000) return fail('stock_invalid')
  const descriptionEn = longText(formData, 'description_en')
  const descriptionId = longText(formData, 'description_id') || descriptionEn
  if (descriptionEn.length > 1000 || descriptionId.length > 1000) return fail('description_invalid')
  const specs = parseSpecs(longText(formData, 'specifications'))
  if (!specs) return fail('specs_invalid')

  const file = formData.get('image')
  const image = file instanceof File && file.size > 0 ? file : null
  if (image && image.size > MAX_IMAGE_BYTES) return fail('image_too_large')

  return {
    ok: true,
    fields,
    data: {
      file: image,
      values: {
        slug,
        category: category as ProductRow['category'],
        name_en: nameEn,
        name_id: nameId,
        description_en: descriptionEn,
        description_id: descriptionId,
        specifications: specs,
        price_idr: price,
        stock,
        is_new: formData.get('is_new') === 'on',
        best_seller: formData.get('best_seller') === 'on',
        published: formData.get('published') === 'on',
      },
    },
  }
}

type Admin = NonNullable<ReturnType<typeof createSupabaseAdminClient>>

async function uploadImage(admin: Admin, productId: string, file: File): Promise<{ path: string } | { code: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = imageKind(bytes) // magic bytes, not the client-supplied filename / content-type
  if (!kind) return { code: 'image_type_invalid' }
  const path = `${productId}/${randomUUID()}.${kind.ext}`
  const { error } = await admin.storage.from(PRODUCT_BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false, cacheControl: '31536000' })
  if (error) return { code: 'image_upload_failed' }
  return { path }
}

async function audit(admin: Admin, actorId: string, action: string, productId: string, metadata: Record<string, string | number | boolean>) {
  // audit_logs is append-only; a failed audit write must not hide that the product change itself succeeded.
  await admin.from('audit_logs').insert({ actor_id: actorId, action, target_type: 'product', target_id: productId, metadata, environment: getAppEnv() })
}

function refresh() {
  revalidatePath('/', 'layout')
  revalidatePath('/admin/products')
}

export async function createProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireProductManager()
  if ('error' in auth) return auth.error
  const admin = createSupabaseAdminClient()
  if (!admin) return { status: 'error', code: 'not_configured' }
  const parsed = parseProduct(formData)
  if (!parsed.ok) return { status: 'error', code: parsed.code, fields: parsed.fields }

  const id = `p-${Date.now().toString(36)}`
  let imagePath: string | null = null
  if (parsed.data.file) {
    const uploaded = await uploadImage(admin, id, parsed.data.file)
    if ('code' in uploaded) return { status: 'error', code: uploaded.code, fields: parsed.fields }
    imagePath = uploaded.path
  }
  const { error } = await admin.from('products').insert({ id, ...parsed.data.values, image_path: imagePath, created_by: auth.user.id, updated_by: auth.user.id })
  if (error) {
    if (imagePath) await admin.storage.from(PRODUCT_BUCKET).remove([imagePath])
    if (error.code === '23505') return { status: 'error', code: 'slug_taken', fields: parsed.fields }
    if (['42P01', 'PGRST205'].includes(error.code ?? '')) return { status: 'error', code: 'schema_missing', fields: parsed.fields }
    return { status: 'error', code: 'save_failed', fields: parsed.fields }
  }
  await audit(admin, auth.user.id, 'product_created', id, { slug: parsed.data.values.slug, price_idr: parsed.data.values.price_idr, stock: parsed.data.values.stock })
  refresh()
  return { status: 'success', code: 'product_created' }
}

export async function updateProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireProductManager()
  if ('error' in auth) return auth.error
  const admin = createSupabaseAdminClient()
  if (!admin) return { status: 'error', code: 'not_configured' }
  const id = text(formData, 'id')
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(id)) return { status: 'error', code: 'invalid_request' }
  const parsed = parseProduct(formData)
  if (!parsed.ok) return { status: 'error', code: parsed.code, fields: parsed.fields }

  const { data: existing, error: readError } = await admin.from('products').select('image_path').eq('id', id).maybeSingle()
  if (readError || !existing) return { status: 'error', code: 'not_found', fields: parsed.fields }

  let imagePath: string | null = existing.image_path as string | null
  const oldImage = imagePath
  if (formData.get('remove_image') === 'on') imagePath = null
  if (parsed.data.file) {
    const uploaded = await uploadImage(admin, id, parsed.data.file)
    if ('code' in uploaded) return { status: 'error', code: uploaded.code, fields: parsed.fields }
    imagePath = uploaded.path
  }
  const { error } = await admin.from('products').update({ ...parsed.data.values, image_path: imagePath, updated_by: auth.user.id }).eq('id', id)
  if (error) {
    if (imagePath && imagePath !== oldImage) await admin.storage.from(PRODUCT_BUCKET).remove([imagePath])
    return { status: 'error', code: error.code === '23505' ? 'slug_taken' : 'save_failed', fields: parsed.fields }
  }
  if (oldImage && oldImage !== imagePath) await admin.storage.from(PRODUCT_BUCKET).remove([oldImage])
  await audit(admin, auth.user.id, 'product_updated', id, { slug: parsed.data.values.slug, price_idr: parsed.data.values.price_idr, stock: parsed.data.values.stock, published: parsed.data.values.published })
  refresh()
  return { status: 'success', code: 'product_updated' }
}

export async function deleteProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireProductManager()
  if ('error' in auth) return auth.error
  const admin = createSupabaseAdminClient()
  if (!admin) return { status: 'error', code: 'not_configured' }
  const id = text(formData, 'id')
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(id)) return { status: 'error', code: 'invalid_request' }
  const { data: existing } = await admin.from('products').select('slug,image_path').eq('id', id).maybeSingle()
  if (!existing) return { status: 'error', code: 'not_found' }
  const { error } = await admin.from('products').delete().eq('id', id)
  if (error) return { status: 'error', code: 'save_failed' }
  if (existing.image_path) await admin.storage.from(PRODUCT_BUCKET).remove([existing.image_path as string])
  await audit(admin, auth.user.id, 'product_deleted', id, { slug: String(existing.slug) })
  refresh()
  return { status: 'success', code: 'product_deleted' }
}
