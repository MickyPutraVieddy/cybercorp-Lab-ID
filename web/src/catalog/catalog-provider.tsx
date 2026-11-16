'use client'

import { createContext, useContext } from 'react'
import { products as staticProducts } from './products'
import { setCatalog } from './registry'
import type { Product } from './types'

const CatalogContext = createContext<Product[]>(staticProducts)

export function CatalogProvider({ products, children }: { products: Product[]; children: React.ReactNode }) {
  // Idempotent: keeps the module-level registry in step with what was rendered, before any child reads it.
  setCatalog(products)
  return <CatalogContext.Provider value={products}>{children}</CatalogContext.Provider>
}

export function useProducts(): Product[] {
  return useContext(CatalogContext)
}
