import type { Metadata, Viewport } from 'next'
import { StoreFooter } from '@/src/components/store/store-footer'
import { StoreHeader } from '@/src/components/store/store-header'
import { CatalogProvider } from '@/src/catalog/catalog-provider'
import { loadCatalog } from '@/src/catalog/db'
import { StoreProvider } from '@/src/store/store-provider'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: "Let's Test It — Outdoor & Travel Gear",
    template: "%s | Let's Test It",
  },
  description: 'Thoughtful outdoor and travel gear for the long way around. Explore the illustrative prototype storefront.',
  applicationName: "Let's Test It",
  icons: { icon: '/icon.svg' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f6f3eb',
}

// Products come from Supabase on every request (admin edits show up immediately); the bundled demo list is only a fallback.
export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const catalog = await loadCatalog()
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <CatalogProvider products={catalog}>
        <StoreProvider>
          <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:p-3 focus:text-foreground" href="#main-content">Skip to content</a>
          <StoreHeader />
          {children}
          <StoreFooter />
        </StoreProvider>
        </CatalogProvider>
      </body>
    </html>
  )
}
