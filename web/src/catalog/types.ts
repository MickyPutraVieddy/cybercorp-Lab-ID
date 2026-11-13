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
}

export type CartLine = {
  productId: string
  quantity: number
}
