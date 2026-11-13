'use client'

import Image from 'next/image'
import Link from './static-link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Search, ShoppingBag, X } from 'lucide-react'
import { useStore } from '@/src/store/store-provider'
import { AuthNav } from '@/src/components/auth/auth-nav'

export function StoreHeader() {
  const { cartCount, currency, language, setCurrency, setLanguage, t } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  // The intro page (/) has its own top bar.
  if (pathname === '/') return null

  return (
    <>
      <div className="announcement">{t('announcement')}</div>
      <header className="site-header">
        <div className="page-wrap header-main">
          <button
            className="mobile-menu-button"
            type="button"
            aria-label={menuOpen ? t('close') : t('menu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
          </button>
          <Link className="brand" href="/home" aria-label="Let's Test It home">
            <Image className="brand-mark" src="/brand-mark.svg" alt="" width={38} height={38} priority />
            <span className="brand-wordmark">LET&apos;S TEST IT<small>OUTDOOR &amp; TRAVEL</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/catalog">{t('shop')}</Link>
            <Link href="/catalog?new=true">{t('newArrivals')}</Link>
            <Link href="/about">{t('ourStory')}</Link>
            <Link href="/help">{t('help')}</Link>
          </nav>
          <div className="header-tools">
            <form className="search-form" action="/catalog" role="search">
              <label className="sr-only" htmlFor="store-search">{t('search')}</label>
              <input id="store-search" name="q" placeholder={t('searchPlaceholder')} />
              <button type="submit" aria-label={t('search')}><Search aria-hidden="true" size={16} /></button>
            </form>
            <label className="sr-only" htmlFor="currency-select">{t('currency')}</label>
            <select className="header-select" id="currency-select" value={currency} onChange={(event) => setCurrency(event.target.value as 'IDR' | 'USD')}>
              <option value="IDR">IDR</option>
              <option value="USD">USD</option>
            </select>
            <label className="sr-only" htmlFor="language-select">{t('language')}</label>
            <select className="header-select" id="language-select" value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'id')}>
              <option value="en">EN</option>
              <option value="id">ID</option>
            </select>
            <AuthNav variant="desktop" />
            <Link className="header-icon-link" href="/cart" aria-label={`${t('bag')}, ${cartCount} ${language === 'id' ? 'barang' : 'items'}`}>
              <ShoppingBag aria-hidden="true" size={18} />
              <span className="bag-count" aria-live="polite">{cartCount}</span>
            </Link>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation">
            <Link href="/catalog" onClick={() => setMenuOpen(false)}>{t('shop')}</Link>
            <Link href="/catalog?new=true" onClick={() => setMenuOpen(false)}>{t('newArrivals')}</Link>
            <Link href="/about" onClick={() => setMenuOpen(false)}>{t('ourStory')}</Link>
            <Link href="/help" onClick={() => setMenuOpen(false)}>{t('help')}</Link>
            <AuthNav variant="mobile" onNavigate={() => setMenuOpen(false)} />
            <div className="mobile-nav-controls">
              <label className="sr-only" htmlFor="mobile-currency">{t('currency')}</label>
              <select id="mobile-currency" value={currency} onChange={(event) => setCurrency(event.target.value as 'IDR' | 'USD')}>
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
              </select>
              <label className="sr-only" htmlFor="mobile-language">{t('language')}</label>
              <select id="mobile-language" value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'id')}>
                <option value="en">English</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
            </div>
          </nav>
        )}
      </header>
    </>
  )
}
