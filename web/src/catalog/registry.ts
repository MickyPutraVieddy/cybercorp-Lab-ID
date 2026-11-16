// Client-safe catalog registry. The root layout loads the catalog (Supabase, with the static demo list as fallback)
// and hands it to <CatalogProvider>, which stores it here so non-React code (cart restore in store-provider) sees the same data.
import { products as staticProducts } from './products'
import type { Product } from './types'

let current: Product[] = staticProducts

export function setCatalog(list: Product[]) {
  current = list
}

export function getCatalogProducts(): Product[] {
  return current
}

export function getProductById(id: string): Product | undefined {
  return current.find((product) => product.id === id)
}

export function getProductBySlug(slug: string): Product | undefined {
  return current.find((product) => product.slug === slug)
}
