import type { Metadata } from 'next'
import { CatalogScreen } from '@/src/components/store/catalog-screen'

export const metadata: Metadata = { title: 'Shop all gear' }

export default function CatalogPage() {
  return <CatalogScreen />
}
