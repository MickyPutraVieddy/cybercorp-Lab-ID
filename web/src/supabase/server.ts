import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicConfig, isProduction } from '@/src/server/env'

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('SUPABASE_NOT_CONFIGURED')
  }
}

/** Server client bound to the request cookies (acts AS the signed-in user; RLS applies). */
export async function createSupabaseServerClient() {
  const config = getSupabasePublicConfig()
  if (!config) throw new SupabaseNotConfiguredError()
  const store = await cookies()
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            // No browser-side Supabase client exists, so session cookies can be HttpOnly.
            store.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure: isProduction() })
          }
        } catch {
          // Called from a Server Component (read-only cookies): proxy.ts refreshes the session instead.
        }
      },
    },
  })
}
