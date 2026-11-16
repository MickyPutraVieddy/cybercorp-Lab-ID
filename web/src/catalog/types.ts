export type ProductCategory = 'packs' | 'camp' | 'apparel' | 'travel' | 'hydration' | 'essentials'

export type LocalizedCopy = {
  en: string
  id: string
}

export type Product = {
  id: string
  slug: string
  category: ProductCategory
  name: LocalizedCopy
  description: LocalizedCopy
  specifications: LocalizedCopy[]
  priceIdr: number
  stock: number
  rating: number
  reviewCount: number
  isNew?: boolean
  bestSeller?: boolean
  /** Public URL of an admin-uploaded image (Supabase Storage). Falls back to the category artwork when absent. */
  imageUrl?: string | null
  /** false = draft (visible to staff only). Static demo products are always published. */
  published?: boolean
}

export type CartLine = {
  productId: string
  quantity: number
}
