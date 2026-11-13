'use client'

import Image from 'next/image'
import Link from './static-link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/src/store/store-provider'

export function StoreFooter() {
  const { t } = useStore()
  const pathname = usePathname()
  if (pathname === '/') return null

  return (
    <footer className="site-footer">
      <div className="page-wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="brand" href="/home">
              <Image className="brand-mark" src="/brand-mark.svg" alt="" width={38} height={38} />
              <span className="brand-wordmark">LET&apos;S TEST IT<small>OUTDOOR &amp; TRAVEL</small></span>
            </Link>
            <p>{t('footerTagline')}</p>
          </div>
          <nav className="footer-column" aria-label={t('footerShop')}>
            <h3>{t('footerShop')}</h3>
            <Link href="/catalog">{t('catalog')}</Link>
            <Link href="/catalog?new=true">{t('newArrivals')}</Link>
            <Link href="/cart">{t('bag')}</Link>
          </nav>
          <nav className="footer-column" aria-label={t('footerSupport')}>
            <h3>{t('footerSupport')}</h3>
            <Link href="/help">{t('faq')}</Link>
            <Link href="/contact">{t('contact')}</Link>
            <Link href="/help#shipping">{t('shipping')}</Link>
          </nav>
          <nav className="footer-column" aria-label={t('footerCompany')}>
            <h3>{t('footerCompany')}</h3>
            <Link href="/about">{t('about')}</Link>
            <Link href="/careers">{t('careers')}</Link>
            <Link href="/privacy">{t('privacy')}</Link>
            <Link href="/terms">{t('terms')}</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Let&apos;s Test It · {t('fictionalStoreCaption')}</span>
          <span className="prototype-note">{t('demoDisclaimer')}</span>
        </div>
      </div>
    </footer>
  )
}
