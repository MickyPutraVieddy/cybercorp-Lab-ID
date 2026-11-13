// Environment access. No secrets are ever returned from here to client code:
// only NEXT_PUBLIC_* values are defined in the browser bundle, everything else is undefined there.

export type AppEnv = 'development' | 'lab' | 'production'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getAppEnv(): AppEnv {
  const value = process.env.APP_ENV
  if (value === 'lab' || value === 'production' || value === 'development') return value
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null
}

export function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null
}

/** Returns the configured owner UUID only if it is a syntactically valid UUID. */
export function getOwnerUserId(): string | null {
  const value = process.env.SUPABASE_OWNER_USER_ID?.trim()
  return value && UUID_RE.test(value) ? value.toLowerCase() : null
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (explicit) return explicit
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
