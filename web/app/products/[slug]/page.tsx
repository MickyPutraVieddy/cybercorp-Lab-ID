import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug, products } from '@/src/catalog/products'
import { ProductDetailScreen } from '@/src/components/store/product-detail-screen'

type ProductPageProps = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }))
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)
  return product ? { title: product.name.en, description: product.description.en } : { title: 'Product not found' }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) notFound()
  return <ProductDetailScreen product={product} />
}
