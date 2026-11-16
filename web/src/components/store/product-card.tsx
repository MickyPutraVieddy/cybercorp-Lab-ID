'use client'

import Image from 'next/image'
import Link from './static-link'
import { useState } from 'react'
import { Check, Plus, Star } from 'lucide-react'
import { categories } from '@/src/catalog/products'
import type { Product } from '@/src/catalog/types'
import { useStore } from '@/src/store/store-provider'

const artworkByCategory = {
  packs: '/artwork/packs.svg',
  camp: '/artwork/camp.svg',
  apparel: '/artwork/apparel.svg',
  travel: '/artwork/travel.svg',
  hydration: '/artwork/hydration.svg',
  essentials: '/artwork/essentials.svg',
}

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, formatPrice, language, t } = useStore()
  const [justAdded, setJustAdded] = useState(false)
  const category = categories.find((item) => item.id === product.category)

  function handleAdd() {
    addToCart(product.id)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1400)
  }

  return (
    <article className="product-card">
      <Link className="product-art" href={`/products/${product.slug}`} aria-label={`${product.name[language]} — ${t('description')}`}>
        <Image src={product.imageUrl ?? artworkByCategory[product.category]} alt={`Illustrative ${category?.name[language].toLowerCase()} artwork`} width={600} height={620} />
        <span className="product-badges">
          {product.bestSeller && <span className="product-badge">{t('bestSellers')}</span>}
          {product.isNew && <span className="product-badge">{t('newThisSeason')}</span>}
        </span>
      </Link>
      <div className="product-meta">
        <span>{category?.name[language]}</span>
        <span className="product-rating"><Star aria-hidden="true" size={12} fill="currentColor" /> {product.rating.toFixed(1)} <span>({product.reviewCount})</span></span>
      </div>
      <Link className="product-name" href={`/products/${product.slug}`}>{product.name[language]}</Link>
      <div className="product-bottom">
        <span className="product-price">{formatPrice(product.priceIdr)}</span>
        <button className="quick-add" type="button" disabled={product.stock < 1} onClick={handleAdd} aria-label={product.stock < 1 ? `${product.name[language]} — ${t('soldOut')}` : `${t('addToBag')}: ${product.name[language]}`}>
          {justAdded ? <Check aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
        </button>
      </div>
      <span className="stock-note" aria-live="polite">{product.stock < 1 ? t('soldOut') : justAdded ? t('adding') : ''}</span>
    </article>
  )
}

export { artworkByCategory }
