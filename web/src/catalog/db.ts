import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from '@/src/server/env'
import { createSupabaseAdminClient } from '@/src/supabase/admin'
import { products as staticProducts } from './products'
import type { Product, ProductCategory } from './types'

export const PRODUCT_BUCKET = 'product-images'

export type ProductRow = {
  id: string
  slug: string
  category: ProductCategory
  name_en: string
  name_id: string
  description_en: string
  description_id: string
  specifications: unknown
  price_idr: number
  stock: number
  rating: number | string
  review_count: number
  is_new: boolean
  best_seller: boolean
  published: boolean
  image_path: string | null
}

function parseSpecs(value: unknown): Product['specifications'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const { en, id } = item as { en?: unknown; id?: unknown }
    return typeof en === 'string' && en ? [{ en, id: typeof id === 'string' && id ? id : en }] : []
  })
}

export function publicImageUrl(path: string | null | undefined): string | null {
  const config = getSupabasePublicConfig()
  if (!path || !config) return null
  return `${config.url.replace(/\/+$/, '')}/storage/v1/object/public/${PRODUCT_BUCKET}/${path}`
}

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    name: { en: row.name_en, id: row.name_id },
    description: { en: row.description_en, id: row.description_id },
    specifications: parseSpecs(row.specifications),
    priceIdr: row.price_idr,
    stock: row.stock,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    isNew: row.is_new,
    bestSeller: row.best_seller,
    imageUrl: publicImageUrl(row.image_path),
    published: row.published,
  }
}

function anonClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig()
  if (!config) return null
  return createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

/**
 * Storefront catalog: published products from Supabase.
 * Falls back to the bundled demo list ONLY when Supabase is not configured or the table does not exist yet,
 * so the site never goes blank. An existing-but-empty table is respected (returns []).
 */
export async function loadCatalog(): Promise<Product[]> {
  const supabase = anonClient()
  if (!supabase) return staticProducts
  const { data, error } = await supabase.from('products').select('*').eq('published', true).order('id', { ascending: true })
  if (error || !data) return staticProducts
  return (data as ProductRow[]).map(rowToProduct)
}

/** Admin view: every product incl. drafts. Service role, so call ONLY after a permission check. */
export async function loadCatalogForAdmin(): Promise<{ products: Product[]; source: 'database' | 'fallback'; error?: string }> {
  const admin = createSupabaseAdminClient()
  if (!admin) return { products: staticProducts, source: 'fallback', error: 'service_role_missing' }
  const { data, error } = await admin.from('products').select('*').order('id', { ascending: true })
  if (error || !data) return { products: staticProducts, source: 'fallback', error: error?.code ?? 'query_failed' }
  return { products: (data as ProductRow[]).map(rowToProduct), source: 'database' }
}

export async function loadProductBySlug(slug: string): Promise<Product | undefined> {
  const supabase = anonClient()
  if (!supabase) return staticProducts.find((p) => p.slug === slug)
  const { data, error } = await supabase.from('products').select('*').eq('slug', slug).eq('published', true).maybeSingle()
  if (error) return staticProducts.find((p) => p.slug === slug)
  return data ? rowToProduct(data as ProductRow) : undefined
}
