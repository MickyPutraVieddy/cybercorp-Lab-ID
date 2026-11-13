'use client'

import Image from 'next/image'
import Link from './static-link'
import { useState } from 'react'
import { ArrowRight, Check, Minus, Plus, ShieldCheck, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { categories, products } from '@/src/catalog/products'
import type { Product } from '@/src/catalog/types'
import { useStore } from '@/src/store/store-provider'
import { artworkByCategory, ProductCard } from './product-card'

export function ProductDetailScreen({ product }: { product: Product }) {
  const { addToCart, formatPrice, language, t } = useStore()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const category = categories.find((item) => item.id === product.category)
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4)

  function handleAdd() {
    addToCart(product.id, quantity)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
  }

  return (
    <main id="main-content" className="page-wrap">
      <div className="breadcrumbs"><Link href="/">{t('home')}</Link><span aria-hidden="true">/</span><Link href="/catalog">{t('catalog')}</Link><span aria-hidden="true">/</span><span>{product.name[language]}</span></div>
      <section className="product-detail">
        <div className="product-detail-art">
          <Image src={artworkByCategory[product.category]} alt={`Original ${category?.name[language].toLowerCase()} illustration; product photography will be added later`} width={760} height={780} priority />
        </div>
        <div className="product-detail-copy">
          <span className="eyebrow">{category?.name[language]}</span>
          <h1>{product.name[language]}</h1>
          <div className="detail-rating"><span className="product-rating"><Star aria-hidden="true" size={14} fill="currentColor" /> {product.rating.toFixed(1)}</span><span>({product.reviewCount} {t('reviews')})</span><span>·</span><span>{t('sampleReviews')}</span></div>
          <p className="detail-price">{formatPrice(product.priceIdr)}</p>
          <p className="detail-description">{product.description[language]}</p>
          <p className="stock-status">{product.stock < 1 ? t('soldOut') : product.stock < 6 ? `${t('lowStock')} · ${product.stock}` : `${t('inStock')} · ${product.stock}`}</p>
          <div className="quantity-row">
            <span className="form-hint">{t('quantity')}</span>
            <div className="quantity-stepper" aria-label={t('quantity')}>
              <button type="button" aria-label={language === 'id' ? 'Kurangi jumlah' : 'Decrease quantity'} disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))}><Minus aria-hidden="true" size={14} /></button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" aria-label={language === 'id' ? 'Tambah jumlah' : 'Increase quantity'} disabled={quantity >= product.stock} onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))}><Plus aria-hidden="true" size={14} /></button>
            </div>
          </div>
          <Button type="button" className="store-button min-h-11 w-full rounded-full" disabled={product.stock < 1} onClick={handleAdd}>
            {added ? <Check data-icon="inline-start" aria-hidden="true" /> : <Plus data-icon="inline-start" aria-hidden="true" />}
            {added ? t('adding') : t('addToBag')}
          </Button>
          <div className="detail-disclaimer"><ShieldCheck aria-hidden="true" size={14} /> {t('demoDisclaimer')}</div>
          <h2 className="mt-8 font-serif text-2xl font-medium tracking-tight text-foreground">{t('specifications')}</h2>
          <ul className="spec-list">{product.specifications.map((specification) => <li key={specification.en}><Check aria-hidden="true" size={15} />{specification[language]}</li>)}</ul>
          <h2 className="mt-7 font-serif text-2xl font-medium tracking-tight text-foreground">{t('description')}</h2>
          <p className="detail-description">{product.description[language]}</p>
        </div>
      </section>
      <section className="home-section" aria-labelledby="related-title">
        <div className="section-heading"><div><span className="eyebrow">{t('oneMoreThing')}</span><h2 id="related-title">{t('related')}</h2></div><Link className="text-link" href="/catalog">{t('viewAll')} <ArrowRight aria-hidden="true" size={15} /></Link></div>
        <div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div>
      </section>
    </main>
  )
}
