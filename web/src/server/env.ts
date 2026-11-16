// Environment access. No secrets are ever returned from here to client code:
// only NEXT_PUBLIC_* values are defined in the browser bundle, everything else is undefined there.

export type AppEnv = 'development' | 'lab' | 'production'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getAppEnv(): AppEnv {
  const value = process.env.APP_ENV
  if (value === 'lab' || value === 'production' || value === 'development') return value
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

/** First non-empty value among the given env var names (trimmed; stray quotes/spaces from copy-paste removed). */
function firstEnv(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '')
    if (value) return value
  }
  return null
}

/**
 * Supabase URL + public (anon / publishable) key.
 * The Vercel <-> Supabase integration creates several differently named variables, so every known name is accepted.
 * This is safe because no browser-side Supabase client exists: these values are only ever read on the server.
 */
export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = firstEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL')
  const anonKey = firstEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
  )
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null
}

/** Service-role (legacy JWT) key or the newer sb_secret_... key. Server-only; bypasses RLS. */
export function getServiceRoleKey(): string | null {
  return firstEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY')
}

/** Which variables are present (booleans only, never values). Used by /api/health. */
export function describeSupabaseEnv() {
  const has = (name: string) => Boolean(process.env[name]?.trim())
  return {
    url: has('NEXT_PUBLIC_SUPABASE_URL') ? 'NEXT_PUBLIC_SUPABASE_URL' : has('SUPABASE_URL') ? 'SUPABASE_URL' : null,
    publicKey:
      ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY'].find(has) ?? null,
    serviceKey: ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'].find(has) ?? null,
    ownerUserId: has('SUPABASE_OWNER_USER_ID'),
    siteUrl: has('NEXT_PUBLIC_SITE_URL'),
  }
}

/** Returns the configured owner UUID only if it is a syntactically valid UUID. */
export function getOwnerUserId(): string | null {
  const value = process.env.SUPABASE_OWNER_USER_ID?.trim()
  return value && UUID_RE.test(value) ? value.toLowerCase() : null
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (explicit) return explicit
  // Vercel: prefer the stable production domain (email links must match Supabase's Redirect URLs allow-list).
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
