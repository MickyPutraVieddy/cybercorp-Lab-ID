'use client'

import Link from './static-link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ArrowLeft, Info } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { getProductById } from '@/src/catalog/products'
import { useStore } from '@/src/store/store-provider'

const FREE_SHIPPING_THRESHOLD = 1500000
const SHIPPING_FEES = { standard: 45000, express: 95000 } as const

type ShippingOption = 'standard' | 'express'

export function CheckoutScreen() {
  const router = useRouter()
  const { cart, clearCart, formatPrice, hydrated, language, t } = useStore()
  const [shipping, setShipping] = useState<ShippingOption>('standard')
  const [submitting, setSubmitting] = useState(false)
  const lines = cart.flatMap((line) => {
    const product = getProductById(line.productId)
    return product ? [{ ...line, product }] : []
  })
  const subtotal = lines.reduce((total, line) => total + line.product.priceIdr * line.quantity, 0)
  const shippingFee = shipping === 'standard' && subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEES[shipping]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || lines.length === 0) return
    setSubmitting(true)
    const orderCode = `DEMO-${Date.now().toString(36).toUpperCase()}`
    clearCart()
    router.push(`/order-confirmation/?order=${encodeURIComponent(orderCode)}`)
  }

  if (!hydrated) return <main id="main-content" className="page-wrap"><div className="empty-state" role="status">{language === 'id' ? 'Memuat ringkasan...' : 'Loading your summary…'}</div></main>

  if (lines.length === 0) {
    return (
      <main id="main-content" className="page-wrap">
        <div className="page-intro"><div className="breadcrumbs"><Link href="/">{t('home')}</Link><span aria-hidden="true">/</span><Link href="/cart">{t('bag')}</Link><span aria-hidden="true">/</span><span>{t('checkout')}</span></div><h1>{t('checkout')}</h1></div>
        <div className="empty-state"><h2>{t('emptyBag')}</h2><p>{t('emptyBagText')}</p><Link className={buttonVariants({ className: 'store-button min-h-11 rounded-full px-6' })} href="/catalog">{t('continueShopping')}</Link></div>
      </main>
    )
  }

  return (
    <main id="main-content" className="page-wrap">
      <div className="page-intro"><div className="breadcrumbs"><Link href="/">{t('home')}</Link><span aria-hidden="true">/</span><Link href="/cart">{t('bag')}</Link><span aria-hidden="true">/</span><span>{t('checkout')}</span></div><span className="eyebrow">A PREVIEW, NOT A PURCHASE</span><h1>{t('checkout')}</h1><p>{t('safeCheckout')}</p></div>
      <form className="checkout-layout" onSubmit={handleSubmit}>
        <div className="checkout-box">
          <section>
            <h2 className="mb-3 font-serif text-2xl font-medium text-foreground">{t('shipping')}</h2>
            <div className="shipping-options">
              <label className="shipping-option"><input type="radio" name="shipping" value="standard" checked={shipping === 'standard'} onChange={() => setShipping('standard')} /><span><strong>{t('shippingStandard')}</strong><small>{subtotal >= FREE_SHIPPING_THRESHOLD ? (language === 'id' ? 'Gratis untuk pesanan ini' : 'Complimentary on this order') : formatPrice(SHIPPING_FEES.standard)}</small></span></label>
              <label className="shipping-option"><input type="radio" name="shipping" value="express" checked={shipping === 'express'} onChange={() => setShipping('express')} /><span><strong>{t('shippingExpress')}</strong><small>{formatPrice(SHIPPING_FEES.express)}</small></span></label>
            </div>
          </section>
          <div className="simulation-banner"><Info aria-hidden="true" size={17} /><span>{t('safeCheckout')} {language === 'id' ? 'Jangan masukkan nama, alamat, atau detail pembayaran.' : 'Do not enter a name, address, or payment details.'}</span></div>
          <Button className="store-button min-h-12 w-full rounded-full" type="submit" disabled={submitting}>
            {submitting ? (language === 'id' ? 'Menyiapkan pratinjau…' : 'Preparing preview…') : t('simulateOrder')}
          </Button>
          <Link className="text-link justify-center" href="/cart"><ArrowLeft aria-hidden="true" size={14} />{t('bag')}</Link>
        </div>
        <aside className="summary-card" aria-label={t('estimatedTotal')}>
          <h2>{language === 'id' ? 'Ringkasan' : 'Order summary'}</h2>
          {lines.map(({ product, quantity }) => <div className="summary-row" key={product.id}><span>{product.name[language]} × {quantity}</span><span>{formatPrice(product.priceIdr * quantity)}</span></div>)}
          <div className="summary-row"><span>{t('subtotal')}</span><span>{formatPrice(subtotal)}</span></div>
          <div className="summary-row"><span>{t('shipping')}</span><span>{shippingFee === 0 ? (language === 'id' ? 'Gratis' : 'Free') : formatPrice(shippingFee)}</span></div>
          <div className="summary-row total"><span>{t('estimatedTotal')}</span><span>{formatPrice(subtotal + shippingFee)}</span></div>
          <p className="prototype-small">{language === 'id' ? 'Harga dan opsi pengiriman hanya contoh untuk prototipe.' : 'Prices and delivery choices are illustrative prototype data.'}</p>
        </aside>
      </form>
    </main>
  )
}
