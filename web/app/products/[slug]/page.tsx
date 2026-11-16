import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadProductBySlug } from '@/src/catalog/db'
import { ProductDetailScreen } from '@/src/components/store/product-detail-screen'

type ProductPageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await loadProductBySlug(slug)
  return product ? { title: product.name.en, description: product.description.en } : { title: 'Product not found' }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await loadProductBySlug(slug)
  if (!product) notFound()
  return <ProductDetailScreen product={product} />
}
