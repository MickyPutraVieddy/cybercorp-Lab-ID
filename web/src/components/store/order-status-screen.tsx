'use client'

import Link from './static-link'
import { useEffect, useState } from 'react'
import { ArrowRight, Check, PackageCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useStore } from '@/src/store/store-provider'

function useDemoOrderCode() {
  const [orderCode, setOrderCode] = useState('DEMO-PREVIEW')
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const candidate = new URLSearchParams(window.location.search).get('order')
      if (candidate && /^[A-Za-z0-9-]{4,40}$/.test(candidate)) setOrderCode(candidate)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])
  return orderCode
}

export function OrderConfirmationScreen() {
  const { language, t } = useStore()
  const orderCode = useDemoOrderCode()
  return (
    <main id="main-content" className="page-wrap">
      <section className="order-status">
        <span className="eyebrow">{t('demoConfirmation')}</span>
        <div className="timeline-marker size-12"><Check aria-hidden="true" size={22} /></div>
        <h1 className="display-title" style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}>{t('orderConfirmed')}</h1>
        <p className="detail-description">{t('orderNote')}</p>
        <code className="order-code">{orderCode}</code>
        <div className="simulation-banner"><PackageCheck aria-hidden="true" size={18} /><span>{language === 'id' ? 'Nomor ini hanya kode contoh dan tidak terhubung dengan pengiriman.' : 'This is a sample reference only and is not connected to a shipment.'}</span></div>
        <div className="action-row">
          <Link className={buttonVariants({ className: 'store-button min-h-11 rounded-full px-6' })} href={`/order-tracking/?order=${encodeURIComponent(orderCode)}`}>{t('trackOrder')} <ArrowRight data-icon="inline-end" aria-hidden="true" /></Link>
          <Link className="text-link" href="/catalog">{t('continueShopping')}</Link>
        </div>
      </section>
    </main>
  )
}

export function OrderTrackingScreen() {
  const { language, t } = useStore()
  const orderCode = useDemoOrderCode()
  const steps = language === 'id'
    ? ['Pesanan demo dibuat', 'Contoh sedang disiapkan', 'Contoh dalam perjalanan', 'Simulasi selesai']
    : ['Demo order previewed', 'Sample being prepared', 'Sample on its way', 'Simulation complete']

  return (
    <main id="main-content" className="page-wrap">
      <section className="order-status">
        <div className="breadcrumbs"><Link href="/">{t('home')}</Link><span aria-hidden="true">/</span><span>{t('tracking')}</span></div>
        <span className="eyebrow">{t('notLiveShipment')}</span>
        <h1 className="display-title" style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}>{t('tracking')}</h1>
        <p className="detail-description">{t('trackingNote')}</p>
        <code className="order-code">{orderCode}</code>
        <ol className="timeline">{steps.map((step) => <li key={step}><span className="timeline-marker"><Check aria-hidden="true" size={12} /></span><span>{step}</span></li>)}</ol>
        <div className="simulation-banner"><PackageCheck aria-hidden="true" size={18} /><span>{t('orderNote')}</span></div>
        <Link className="text-link" href="/catalog">{t('continueShopping')}</Link>
      </section>
    </main>
  )
}
