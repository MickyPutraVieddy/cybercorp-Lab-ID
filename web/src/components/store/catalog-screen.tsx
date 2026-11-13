'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from './static-link'
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react'
import { categories, products } from '@/src/catalog/products'
import type { ProductCategory } from '@/src/catalog/types'
import { useStore } from '@/src/store/store-provider'
import { ProductCard } from './product-card'

const PAGE_SIZE = 12

type SortValue = 'featured' | 'price-low' | 'price-high' | 'rating' | 'newest'

export function CatalogScreen() {
  const { language, t } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ProductCategory | 'all'>('all')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sort, setSort] = useState<SortValue>('featured')
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const timeout = window.setTimeout(() => {
      setQuery(params.get('q') ?? '')
      const categoryParam = params.get('category')
      if (categories.some((item) => item.id === categoryParam)) setCategory(categoryParam as ProductCategory)
      if (params.get('new') === 'true') setSort('newest')
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(language === 'id' ? 'id-ID' : 'en-US')
    const results = products.filter((product) => {
      const categoryMatches = category === 'all' || product.category === category
      const availabilityMatches = !availableOnly || product.stock > 0
      const searchable = [product.name.en, product.name.id, product.description.en, product.description.id].join(' ').toLocaleLowerCase(language === 'id' ? 'id-ID' : 'en-US')
      return categoryMatches && availabilityMatches && (!normalizedQuery || searchable.includes(normalizedQuery))
    })

    return [...results].sort((first, second) => {
      if (sort === 'price-low') return first.priceIdr - second.priceIdr
      if (sort === 'price-high') return second.priceIdr - first.priceIdr
      if (sort === 'rating') return second.rating - first.rating
      if (sort === 'newest') return Number(Boolean(second.isNew)) - Number(Boolean(first.isNew))
      return Number(Boolean(second.bestSeller)) - Number(Boolean(first.bestSeller))
    })
  }, [availableOnly, category, language, query, sort])

  function clearFilters() {
    setQuery('')
    setCategory('all')
    setAvailableOnly(false)
    setSort('featured')
    setVisible(PAGE_SIZE)
  }

  return (
    <main id="main-content" className="page-wrap">
      <div className="page-intro">
        <div className="breadcrumbs"><Link href="/">{t('home')}</Link><span aria-hidden="true">/</span><span>{t('catalog')}</span></div>
        <span className="eyebrow">{t('catalogEyebrow')}</span>
        <h1>{t('catalog')}</h1>
        <p>{t('catalogIntro')}</p>
      </div>
      <div className="catalog-toolbar">
        <div className="catalog-filters">
          <label className="sr-only" htmlFor="catalog-search">{t('search')}</label>
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" size={15} />
            <input className="form-control min-h-10 pl-9" id="catalog-search" value={query} onChange={(event) => { setQuery(event.target.value); setVisible(PAGE_SIZE) }} placeholder={t('searchPlaceholder')} />
          </div>
          <label className="sr-only" htmlFor="category-filter">{t('filterCategory')}</label>
          <select className="catalog-select" id="category-filter" value={category} onChange={(event) => { setCategory(event.target.value as ProductCategory | 'all'); setVisible(PAGE_SIZE) }}>
            <option value="all">{t('allCategories')}</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name[language]}</option>)}
          </select>
          <label className="sr-only" htmlFor="sort-filter">{t('sort')}</label>
          <select className="catalog-select" id="sort-filter" value={sort} onChange={(event) => setSort(event.target.value as SortValue)}>
            <option value="featured">{t('featuredSort')}</option>
            <option value="price-low">{t('priceLow')}</option>
            <option value="price-high">{t('priceHigh')}</option>
            <option value="rating">{t('topRated')}</option>
            <option value="newest">{t('sortNewest')}</option>
          </select>
          <label className="inline-flex min-h-10 items-center gap-2 rounded border border-border px-3 text-xs text-foreground">
            <input className="accent-primary" type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
            {t('availableOnly')}
          </label>
        </div>
        <span className="result-count" aria-live="polite">{`${filtered.length} ${language === 'id' ? 'produk' : 'products'}`}</span>
      </div>
      <section className="catalog-grid-wrap" aria-label={t('catalog')}>
        {filtered.length > 0 ? (
          <>
            <div className="product-grid">{filtered.slice(0, visible).map((product) => <ProductCard key={product.id} product={product} />)}</div>
            {visible < filtered.length && <div className="load-more"><button className="outline-action" type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>{t('showMore')} <ArrowRight aria-hidden="true" size={14} /></button></div>}
          </>
        ) : (
          <div className="empty-state">
            <SlidersHorizontal aria-hidden="true" size={26} />
            <h2>{t('noResults')}</h2>
            <p>{t('noResultsText')}</p>
            <button className="outline-action" type="button" onClick={clearFilters}>{t('clearFilters')}</button>
          </div>
        )}
      </section>
    </main>
  )
}
