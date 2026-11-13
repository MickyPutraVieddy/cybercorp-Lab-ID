import { getProductById, getProductBySlug, products } from './products'
import type { Product } from './types'

export interface CatalogService {
  listProducts(): Promise<Product[]>
  findById(id: string): Promise<Product | undefined>
  findBySlug(slug: string): Promise<Product | undefined>
}

export const demoCatalogService: CatalogService = {
  async listProducts() {
    return products
  },
  async findById(id) {
    return getProductById(id)
  },
  async findBySlug(slug) {
    return getProductBySlug(slug)
  },
}
