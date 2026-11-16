import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/src/supabase/admin'
import { describeSupabaseEnv, getSupabasePublicConfig } from '@/src/server/env'

export const dynamic = 'force-dynamic'

const TABLES = ['profiles', 'user_roles', 'role_permissions', 'audit_logs', 'security_events', 'profile_details', 'products'] as const

/**
 * Connection self-test. Returns ONLY booleans / variable NAMES, never values or keys.
 * Open https://<your-domain>/api/health after each deploy. Delete this file once everything is green if you prefer.
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }
  const env = describeSupabaseEnv()
  const config = getSupabasePublicConfig()
  const result: Record<string, unknown> = {
    env,
    configured: Boolean(config),
    authServerReachable: false,
    emailConfirmationRequired: null,
    serviceRoleWorks: false,
    tables: {} as Record<string, boolean>,
    hints: [] as string[],
  }
  const hints = result.hints as string[]

  if (!config) {
    hints.push('URL / anon (publishable) key not found. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY) in Vercel, then REDEPLOY.')
    return NextResponse.json(result, { headers })
  }

  try {
    const res = await fetch(`${config.url.replace(/\/+$/, '')}/auth/v1/settings`, {
      headers: { apikey: config.anonKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    result.authServerReachable = res.ok
    if (res.ok) {
      const settings = (await res.json()) as { mailer_autoconfirm?: boolean }
      result.emailConfirmationRequired = settings.mailer_autoconfirm === false
      if (settings.mailer_autoconfirm) hints.push('Supabase "Confirm email" is OFF. The register form will refuse accounts until you turn it ON (Authentication > Sign In / Providers > Email).')
    } else {
      hints.push(`Supabase Auth answered HTTP ${res.status}. The URL or the anon key is wrong (copy both from Supabase > Project Settings > API Keys).`)
    }
  } catch {
    hints.push('Could not reach the Supabase URL. Check NEXT_PUBLIC_SUPABASE_URL (must look like https://<ref>.supabase.co).')
  }

  const admin = createSupabaseAdminClient()
  if (!admin) {
    hints.push('Service-role key not found (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY). Needed for owner bootstrap, role changes, audit and product writes.')
    return NextResponse.json(result, { headers })
  }

  const tables = result.tables as Record<string, boolean>
  let serviceOk = false
  for (const table of TABLES) {
    const { error } = await admin.from(table).select('*', { count: 'exact', head: true })
    tables[table] = !error
    if (!error) serviceOk = true
    else if (error.message?.toLowerCase().includes('invalid api key') || error.code === 'PGRST301') serviceOk = false
  }
  result.serviceRoleWorks = serviceOk
  const missing = TABLES.filter((t) => !tables[t])
  if (!serviceOk && missing.length === TABLES.length) hints.push('Every table query failed: either the service-role key is wrong, or the SQL migrations have not been run yet (run supabase/APPLY_ALL.sql in the Supabase SQL Editor).')
  else if (missing.length) hints.push(`Missing tables: ${missing.join(', ')}. Run supabase/APPLY_ALL.sql in the Supabase SQL Editor (it is safe to re-run).`)
  if (!env.ownerUserId) hints.push('SUPABASE_OWNER_USER_ID is not set: nobody can become Owner/admin yet (see README-DEPLOY.md step 5).')

  return NextResponse.json(result, { headers })
}
