import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getServiceRoleKey, getSupabasePublicConfig } from '@/src/server/env'

/**
 * Service-role client. BYPASSES RLS. Server-only (the `server-only` import makes the build fail if a client
 * component ever imports this file). Use only for: owner bootstrap, role-change RPC, security-event writes.
 */
export function createSupabaseAdminClient() {
  const config = getSupabasePublicConfig()
  const serviceKey = getServiceRoleKey()
  if (!config || !serviceKey) return null
  return createClient(config.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}
