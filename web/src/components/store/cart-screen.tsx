'use client'

import Image from 'next/image'
import Link from './static-link'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { getProductById } from '@/src/catalog/products'
import { useStore } from '@/src/store/store-provider'
import { artworkByCategory } from './product-card'

export function CartScreen() {
  const { cart, formatPrice, hydrated, language, removeFromCart, t, updateQuantity } = useStore()
  const lines = cart.flatMap((line) => {
    const product = getProductById(line.productId)
    return product ? [{ ...line, product }] : []
  })
  const subtotal = lines.reduce((total, line) => total + line.product.priceIdr * line.quantity, 0)

  if (!hydrated) return <main id="main-content" className="page-wrap"><div className="empty-state" role="status">{language === 'id' ? 'Memuat tas...' : 'Loading your bag…'}</div></main>

  if (lines.length === 0) {
    return (
      <main id="main-content" className="page-wrap">
        <div className="page-intro"><div className="breadcrumbs"><Link href="/">{t('home')}</Link><span aria-hidden="true">/</span><span>{t('bag')}</span></div><span className="eyebrow">YOUR NEXT TRIP STARTS HERE</span><h1>{t('bag')}</h1></div>
        <section className="empty-state">
          <ShoppingBag aria-hidden="true" size={30} />
          <h2>{t('emptyBag')}</h2>
          <p>{t('emptyBagText')}</p>
          <Link className={buttonVariants({ className: 'store-button min-h-11 rounded-full px-6' })} href="/catalog">{t('continueShopping')}</Link>
        </section>
      </main>
    )
  }

  return (
    <main id="main-content" className="page-wrap">
      <div className="page-intro"><div className="breadcrumbs"><Link href="/">{t('home')}</Link><span aria-hidden="true">/</span><span>{t('bag')}</span></div><span className="eyebrow">YOUR NEXT TRIP STARTS HERE</span><h1>{t('bag')}</h1><p>{lines.reduce((total, line) => total + line.quantity, 0)} {language === 'id' ? 'barang di tas' : 'items in your bag'}</p></div>
      <div className="cart-layout">
        <section className="cart-lines" aria-label={t('bag')}>
          {lines.map(({ product, quantity }) => (
            <article className="cart-line" key={product.id}>
              <Link className="cart-line-art" href={`/products/${product.slug}`}><Image src={artworkByCategory[product.category]} alt={`Illustration for ${product.name[language]}`} width={150} height={150} /></Link>
              <div>
                <h2><Link href={`/products/${product.slug}`}>{product.name[language]}</Link></h2>
                <p>{formatPrice(product.priceIdr)} · {product.stock < 1 ? t('soldOut') : t('inStock')}</p>
                <div className="cart-line-controls">
                  <div className="small-stepper" aria-label={t('quantity')}>
                    <button type="button" aria-label={language === 'id' ? 'Kurangi jumlah' : 'Decrease quantity'} disabled={quantity <= 1} onClick={() => updateQuantity(product.id, quantity - 1)}><Minus aria-hidden="true" size={12} /></button>
                    <output>{quantity}</output>
                    <button type="button" aria-label={language === 'id' ? 'Tambah jumlah' : 'Increase quantity'} disabled={quantity >= product.stock} onClick={() => updateQuantity(product.id, quantity + 1)}><Plus aria-hidden="true" size={12} /></button>
                  </div>
                  <button className="remove-link inline-flex items-center gap-1" type="button" onClick={() => removeFromCart(product.id)}><Trash2 aria-hidden="true" size={12} />{t('remove')}</button>
                </div>
              </div>
              <span className="cart-line-total">{formatPrice(product.priceIdr * quantity)}</span>
            </article>
          ))}
          <div className="pt-5"><Link className="text-link" href="/catalog">{t('continueShopping')}</Link></div>
        </section>
        <aside className="summary-card" aria-label={t('estimatedTotal')}>
          <h2>{language === 'id' ? 'Ringkasan' : 'Order summary'}</h2>
          <div className="summary-row"><span>{t('subtotal')}</span><span>{formatPrice(subtotal)}</span></div>
          <div className="summary-row"><span>{t('shipping')}</span><span>{language === 'id' ? 'Dihitung berikutnya' : 'Calculated next'}</span></div>
          <div className="summary-row total"><span>{t('estimatedTotal')}</span><span>{formatPrice(subtotal)}</span></div>
          <Link className={buttonVariants({ className: 'store-button mt-4 min-h-11 w-full rounded-full' })} href="/checkout">{t('checkout')}</Link>
          <p className="prototype-small">{t('safeCheckout')}</p>
        </aside>
      </div>
    </main>
  )
}
