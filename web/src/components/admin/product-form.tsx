'use client'

import { useActionState } from 'react'
import { createProductAction, deleteProductAction, updateProductAction } from '@/src/server/actions/products'
import { idleState } from '@/src/server/actions/types'
import { categories } from '@/src/catalog/products'
import type { Product } from '@/src/catalog/types'

const MESSAGES: Record<string, string> = {
  product_created: 'Product saved to the database.',
  product_updated: 'Changes saved to the database.',
  product_deleted: 'Product deleted.',
  name_invalid: 'Name must be 2–120 characters.',
  slug_invalid: 'Slug may only contain lowercase letters, numbers and single hyphens.',
  slug_taken: 'That slug is already used by another product.',
  category_invalid: 'Pick a category.',
  price_invalid: 'Price must be a whole number in IDR.',
  stock_invalid: 'Stock must be a whole number (0 or more).',
  description_invalid: 'Descriptions are limited to 1000 characters.',
  specs_invalid: 'Max 8 specification lines, each up to 120 characters.',
  image_too_large: 'Image is larger than 2 MB.',
  image_type_invalid: 'Image must be a real PNG, JPEG or WebP file.',
  image_upload_failed: 'Image upload failed. Is the product-images bucket created (run supabase/APPLY_ALL.sql)?',
  schema_missing: 'The products table does not exist yet. Run supabase/APPLY_ALL.sql in the Supabase SQL Editor.',
  save_failed: 'The database rejected the change.',
  not_found: 'Product not found.',
  forbidden: 'Your role is not allowed to manage products.',
  not_signed_in: 'Session expired. Log in again.',
  not_configured: 'Server is missing the Supabase service-role key.',
  invalid_request: 'Invalid request.',
}

function Notice({ code, status }: { code?: string; status: string }) {
  if (!code) return null
  return <p className={status === 'error' ? 'form-error' : 'form-success'} role="status">{MESSAGES[code] ?? code}</p>
}

export function ProductForm({ product }: { product?: Product }) {
  const editing = Boolean(product)
  const [state, action, pending] = useActionState(editing ? updateProductAction : createProductAction, idleState)
  const f = state.fields ?? {}
  const value = (key: string, fallback: string) => (state.status === 'error' && key in f ? f[key] : fallback)
  const specs = product?.specifications.map((s) => (s.id !== s.en ? `${s.en} | ${s.id}` : s.en)).join('\n') ?? ''
  // key resets uncontrolled inputs after a successful create so the form is empty again.
  return (
    <form key={state.status === 'success' && !editing ? 'done' : 'form'} className="pm-form" action={action}>
      {editing ? <input type="hidden" name="id" value={product!.id} /> : null}
      <label>Name (English)<input name="name_en" required maxLength={120} defaultValue={value('name_en', product?.name.en ?? '')} /></label>
      <label>Name (Indonesia)<input name="name_id" maxLength={120} defaultValue={value('name_id', product?.name.id ?? '')} placeholder="Same as English if empty" /></label>
      <label>Slug (URL)<input name="slug" maxLength={80} defaultValue={value('slug', product?.slug ?? '')} placeholder="auto from name" /></label>
      <label>Category
        <select name="category" required defaultValue={value('category', product?.category ?? '')}>
          <option value="" disabled>Choose…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name.en}</option>)}
        </select>
      </label>
      <label>Price (IDR)<input name="price_idr" inputMode="numeric" required defaultValue={value('price_idr', product ? String(product.priceIdr) : '')} /></label>
      <label>Stock<input name="stock" inputMode="numeric" required defaultValue={value('stock', product ? String(product.stock) : '0')} /></label>
      <label className="wide">Description (English)<textarea name="description_en" rows={3} maxLength={1000} defaultValue={value('description_en', product?.description.en ?? '')} /></label>
      <label className="wide">Description (Indonesia)<textarea name="description_id" rows={3} maxLength={1000} defaultValue={value('description_id', product?.description.id ?? '')} /></label>
      <label className="wide">Specifications — one per line, <code>English | Indonesia</code><textarea name="specifications" rows={4} defaultValue={value('specifications', specs)} /></label>
      <label className="wide">Product image (PNG / JPEG / WebP, max 2 MB){product?.imageUrl ? <small> — current image is kept unless you choose a new one</small> : null}
        <input type="file" name="image" accept="image/png,image/jpeg,image/webp" />
      </label>
      {product?.imageUrl ? <label className="check"><input type="checkbox" name="remove_image" /> Remove current image</label> : null}
      <div className="pm-checks">
        <label className="check"><input type="checkbox" name="published" defaultChecked={product ? product.published !== false : true} /> Published (visible in store)</label>
        <label className="check"><input type="checkbox" name="is_new" defaultChecked={Boolean(product?.isNew)} /> New</label>
        <label className="check"><input type="checkbox" name="best_seller" defaultChecked={Boolean(product?.bestSeller)} /> Best seller</label>
      </div>
      <div className="wide pm-actions">
        <button className="admin-button primary" type="submit" disabled={pending}>{pending ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button>
        <Notice code={state.code} status={state.status} />
      </div>
    </form>
  )
}

export function DeleteProductForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(deleteProductAction, idleState)
  return (
    <form action={action} className="pm-delete">
      <input type="hidden" name="id" value={id} />
      <button className="admin-button danger" type="submit" disabled={pending} aria-label={`Delete ${name}`}>{pending ? '…' : 'Delete'}</button>
      <Notice code={state.status === 'error' ? state.code : undefined} status={state.status} />
    </form>
  )
}
