import 'server-only'
import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/src/supabase/admin'
import { createSupabaseServerClient, SupabaseNotConfiguredError } from '@/src/supabase/server'
import { getOwnerUserId } from '@/src/server/env'
import { isRole, type Role } from '@/src/server/roles'
import { logSecurityEvent } from '@/src/server/security-events'

export type CurrentUser = {
  id: string
  email: string
  fullName: string
  role: Role
  createdAt: string
  emailConfirmedAt: string
  rolesAvailable: boolean
}

/**
 * Reads the role from public.user_roles (never from user_metadata). If the authenticated, email-confirmed user's
 * UUID equals SUPABASE_OWNER_USER_ID and no owner exists yet, the owner is assigned through the service-role-only,
 * idempotent bootstrap_owner() function. Failure to bootstrap never grants anything.
 */
export async function resolveAppRole(
  supabase: SupabaseClient,
  userId: string,
  emailConfirmed: boolean,
): Promise<{ role: Role; available: boolean }> {
  const read = async () => {
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle()
    if (error) return { role: 'user' as Role, available: false }
    return { role: isRole(data?.role) ? data.role : ('user' as Role), available: true }
  }
  let result = await read()
  const ownerId = getOwnerUserId()
  if (result.available && result.role !== 'owner' && ownerId && ownerId === userId && emailConfirmed) {
    const admin = createSupabaseAdminClient()
    if (admin) {
      const { data, error } = await admin.rpc('bootstrap_owner', { p_owner_id: userId })
      await logSecurityEvent({
        eventType: error ? 'owner_bootstrap_failed' : 'owner_bootstrap',
        actorId: userId,
        classification: error ? 'suspicious' : 'normal',
        metadata: { result: error ? 'error' : String(data) },
      })
      if (!error) result = await read()
    }
  }
  return result
}

/** Validated against the Supabase Auth server (getUser), not just the cookie contents. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  let supabase: SupabaseClient
  try {
    supabase = await createSupabaseServerClient()
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) return null
    throw error
  }
  const { data, error } = await supabase.auth.getUser()
  const user = data?.user
  if (error || !user || !user.email_confirmed_at) return null

  const { role, available } = await resolveAppRole(supabase, user.id, true)
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: (profile?.full_name as string | undefined) || '',
    role,
    createdAt: user.created_at,
    emailConfirmedAt: user.email_confirmed_at,
    rolesAvailable: available,
  }
})
