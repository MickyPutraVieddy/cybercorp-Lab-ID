'use client'

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import { getProductById } from '@/src/catalog/products'
import type { CartLine } from '@/src/catalog/types'
import { translate, type Language, type MessageKey } from './messages'

export type Currency = 'IDR' | 'USD'

type StoreContextValue = {
  cart: CartLine[]
  cartCount: number
  language: Language
  currency: Currency
  hydrated: boolean
  setLanguage: (language: Language) => void
  setCurrency: (currency: Currency) => void
  addToCart: (productId: string, quantity?: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  t: (key: MessageKey) => string
  formatPrice: (priceIdr: number) => string
}

const STORAGE_KEY = 'lets-test-it-prototype-v1'
const USD_IDR_ASSUMPTION = 15800
const INITIAL_STATE = { cart: [] as CartLine[], language: 'en' as Language, currency: 'IDR' as Currency }
type PersistedState = typeof INITIAL_STATE
const StoreContext = createContext<StoreContextValue | null>(null)

let persistedSnapshot: PersistedState = INITIAL_STATE
let loadedFromBrowser = false
let clientHasHydrated = false
const storeListeners = new Set<() => void>()
const hydrationListeners = new Set<() => void>()

function loadBrowserState() {
  if (loadedFromBrowser || typeof window === 'undefined') return
  loadedFromBrowser = true
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    const parsed: unknown = JSON.parse(saved)
    if (typeof parsed !== 'object' || parsed === null) return
    const stored = parsed as { cart?: unknown; language?: unknown; currency?: unknown }
    persistedSnapshot = {
      cart: validCart(stored.cart),
      language: stored.language === 'en' || stored.language === 'id' ? stored.language : 'en',
      currency: stored.currency === 'IDR' || stored.currency === 'USD' ? stored.currency : 'IDR',
    }
  } catch {
    persistedSnapshot = INITIAL_STATE
  }
}

function subscribeToStore(listener: () => void) {
  storeListeners.add(listener)
  if (typeof window !== 'undefined') {
    loadBrowserState()
    window.addEventListener('storage', handleStorageChange)
  }
  return () => {
    storeListeners.delete(listener)
    if (typeof window !== 'undefined') window.removeEventListener('storage', handleStorageChange)
  }
}

function handleStorageChange(event: StorageEvent) {
  if (event.key !== STORAGE_KEY && event.key !== null) return
  loadedFromBrowser = false
  loadBrowserState()
  storeListeners.forEach((listener) => listener())
}

function subscribeToHydration(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined
  clientHasHydrated = true
  hydrationListeners.add(listener)
  return () => hydrationListeners.delete(listener)
}

function updatePersistedState(update: (current: PersistedState) => PersistedState) {
  loadBrowserState()
  persistedSnapshot = update(persistedSnapshot)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedSnapshot))
    } catch {
      // The prototype remains usable when browser storage is unavailable or full.
    }
  }
  storeListeners.forEach((listener) => listener())
}

function getStoreSnapshot() { return persistedSnapshot }
function getServerSnapshot() { return INITIAL_STATE }
function getHydrationSnapshot() { return clientHasHydrated }
function getServerHydrationSnapshot() { return false }

function validCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null || !('productId' in entry) || !('quantity' in entry)) return []
    const productId = entry.productId
    const quantity = entry.quantity
    const product = typeof productId === 'string' ? getProductById(productId) : undefined
    if (!product || !Number.isInteger(quantity) || typeof quantity !== 'number' || quantity < 1 || product.stock < 1) return []
    return [{ productId: product.id, quantity: Math.min(quantity, product.stock) }]
  })
}

export function formatStorePrice(priceIdr: number, currency: Currency, language: Language): string {
  const locale = language === 'id' ? 'id-ID' : 'en-US'
  const amount = currency === 'IDR' ? priceIdr : priceIdr / USD_IDR_ASSUMPTION
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount)
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribeToStore, getStoreSnapshot, getServerSnapshot)
  const hydrated = useSyncExternalStore(subscribeToHydration, getHydrationSnapshot, getServerHydrationSnapshot)
  const { cart, currency, language } = state

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<StoreContextValue>(() => {
    const addToCart = (productId: string, quantity = 1) => {
      const product = getProductById(productId)
      if (!product || product.stock < 1) return
      updatePersistedState((current) => {
        const existing = current.cart.find((line) => line.productId === productId)
        const nextCart = existing
          ? current.cart.map((line) => line.productId === productId
            ? { ...line, quantity: Math.min(line.quantity + quantity, product.stock) }
            : line)
          : [...current.cart, { productId, quantity: Math.min(quantity, product.stock) }]
        return { ...current, cart: nextCart }
      })
    }

    const updateQuantity = (productId: string, quantity: number) => {
      const product = getProductById(productId)
      if (quantity < 1) {
        updatePersistedState((current) => ({ ...current, cart: current.cart.filter((line) => line.productId !== productId) }))
        return
      }
      if (!product || product.stock < 1) return
      updatePersistedState((current) => ({
        ...current,
        cart: current.cart.map((line) => line.productId === productId
          ? { ...line, quantity: Math.min(Math.floor(quantity), product.stock) }
          : line),
      }))
    }

    return {
      cart,
      cartCount: cart.reduce((count, line) => count + line.quantity, 0),
      language,
      currency,
      hydrated,
      setLanguage: (nextLanguage) => updatePersistedState((current) => ({ ...current, language: nextLanguage })),
      setCurrency: (nextCurrency) => updatePersistedState((current) => ({ ...current, currency: nextCurrency })),
      addToCart,
      updateQuantity,
      removeFromCart: (productId) => updatePersistedState((current) => ({ ...current, cart: current.cart.filter((line) => line.productId !== productId) })),
      clearCart: () => updatePersistedState((current) => ({ ...current, cart: [] })),
      t: (key) => translate(language, key),
      formatPrice: (priceIdr) => formatStorePrice(priceIdr, currency, language),
    }
  }, [cart, currency, hydrated, language])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used within StoreProvider')
  return context
}
