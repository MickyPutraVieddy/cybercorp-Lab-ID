'use client'

import Image from 'next/image'
import Link from './static-link'
import { ArrowRight, ArrowUpRight, Leaf, PackageCheck, RotateCcw } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useStore } from '@/src/store/store-provider'
import { categories, products } from '@/src/catalog/products'
import { NoticeBanner } from '@/src/components/auth/form-message'
import { NewsletterSignup } from './newsletter-signup'
import { ProductCard } from './product-card'

const tileColors = ['#e4e2d5', '#e7e3d8', '#e7dfd6', '#e5e2d7', '#e4e8e2', '#e9e3d8']
const reviewKeys = ['reviewOne', 'reviewTwo', 'reviewThree'] as const
const reviewAuthors = ['A. R.', 'M. T.', 'S. K.']

export function HomeScreen({ notice }: { notice?: 'confirmed' }) {
  const { language, t } = useStore()
  const featured = products.filter((product) => product.bestSeller).slice(0, 4)
  const newArrivals = products.filter((product) => product.isNew).slice(0, 4)

  return (
    <main id="main-content">
      <div className="page-wrap">
        {notice ? <div className="home-notice"><NoticeBanner code={notice} kind="notice" /></div> : null}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow">{t('homeEyebrow')}</span>
            <h1 className="display-title" id="hero-title">{t('homeTitle')}</h1>
            <p>{t('homeText')}</p>
            <div className="action-row">
              <Link className={buttonVariants({ className: 'store-button min-h-11 rounded-full px-6' })} href="/catalog">{t('exploreCollection')} <ArrowUpRight data-icon="inline-end" aria-hidden="true" /></Link>
              <Link className="text-link" href="/about">{t('aboutLink')} <ArrowRight aria-hidden="true" size={15} /></Link>
            </div>
          </div>
          <div className="hero-art">
            <Image src="/artwork/campaign.svg" alt="Original illustration of a traveler walking through a mountain landscape" width={920} height={720} priority />
            <span className="hero-note">A quieter kind of adventure</span>
          </div>
        </section>

        <section className="home-section" aria-labelledby="categories-title">
          <div className="section-heading">
            <div><span className="eyebrow">{t('directionEyebrow')}</span><h2 id="categories-title">{t('categories')}</h2></div>
            <p>{t('directionDescription')}</p>
          </div>
          <div className="category-grid">
            {categories.map((category, index) => (
              <Link className="category-tile" href={`/catalog?category=${category.id}`} key={category.id} style={{ backgroundColor: tileColors[index] }}>
                <Image src={`/artwork/${category.id}.svg`} alt="" width={260} height={260} />
                <span>{category.name[language]}<ArrowRight aria-hidden="true" size={14} /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-section" aria-labelledby="favorites-title">
          <div className="section-heading">
            <div><span className="eyebrow">{t('favoritesEyebrow')}</span><h2 id="favorites-title">{t('bestSellers')}</h2></div>
            <Link className="text-link" href="/catalog">{t('viewAll')} <ArrowRight aria-hidden="true" size={15} /></Link>
          </div>
          <div className="product-grid">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>

        <section className="story-band" aria-labelledby="story-title">
          <div>
            <span className="eyebrow">{t('storyEyebrow')}</span>
            <h2 id="story-title">{t('storyTitle')}</h2>
            <p>{t('storyText')}</p>
            <Link className="text-link" href="/about" style={{ color: '#f4eee3' }}>{t('storyLink')} <ArrowRight aria-hidden="true" size={15} /></Link>
          </div>
          <div className="story-details">
            <div className="story-point"><Leaf aria-hidden="true" size={19} /><strong>{t('consideredHeading')}</strong><span>{t('consideredText')}</span></div>
            <div className="story-point"><PackageCheck aria-hidden="true" size={19} /><strong>{t('usefulHeading')}</strong><span>{t('usefulText')}</span></div>
            <div className="story-point"><RotateCcw aria-hidden="true" size={19} /><strong>{t('repairableHeading')}</strong><span>{t('repairableText')}</span></div>
            <div className="story-point"><ArrowUpRight aria-hidden="true" size={19} /><strong>{t('unhurriedHeading')}</strong><span>{t('unhurriedText')}</span></div>
          </div>
        </section>

        <section className="home-section" aria-labelledby="new-arrivals-title">
          <div className="section-heading">
            <div><span className="eyebrow">{t('newEyebrow')}</span><h2 id="new-arrivals-title">{t('newThisSeason')}</h2></div>
            <Link className="text-link" href="/catalog?new=true">{t('newArrivals')} <ArrowRight aria-hidden="true" size={15} /></Link>
          </div>
          <div className="product-grid">{newArrivals.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>

        <section className="home-section" aria-labelledby="reviews-title">
          <div className="section-heading">
            <div><span className="eyebrow">{t('reviewEyebrow')}</span><h2 id="reviews-title">{t('customerNotes')}</h2></div>
            <span className="review-note">{t('sampleReviews')}</span>
          </div>
          <div className="review-grid">
            {reviewKeys.map((reviewKey, index) => (
              <figure className="review-card" key={reviewKey}>
                <div className="review-stars" aria-label={t('ratingA11y')}>{Array.from({ length: 5 }, (_, starIndex) => <span key={starIndex} aria-hidden="true">★</span>)}</div>
                <blockquote>{t(reviewKey)}</blockquote>
                <figcaption><cite>{reviewAuthors[index]} · {language === 'id' ? 'Ulasan contoh' : 'Sample review'}</cite></figcaption>
              </figure>
            ))}
          </div>
        </section>

        <NewsletterSignup />
      </div>
    </main>
  )
}
