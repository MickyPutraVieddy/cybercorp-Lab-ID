import 'server-only'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/src/supabase/server'
import { getCurrentUser, type CurrentUser } from '@/src/server/session'
import { isStaff } from '@/src/server/roles'
import { logSecurityEvent } from '@/src/server/security-events'

export async function requireUser(nextPath = '/settings'): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect(`/?mode=login&next=${encodeURIComponent(nextPath)}`)
  return user
}

export async function requireStaff(nextPath = '/admin'): Promise<CurrentUser> {
  const user = await requireUser(nextPath)
  if (!isStaff(user.role)) {
    await logSecurityEvent({ eventType: 'authorization_denied', actorId: user.id, endpoint: nextPath, method: 'GET', status: 403, metadata: { reason: 'not_staff', role: user.role } })
    redirect('/settings?notice=forbidden')
  }
  return user
}

/** Owner always passes. Everyone else needs a matching row in role_permissions (read under RLS). */
export async function hasPermission(user: CurrentUser, permission: string): Promise<boolean> {
  if (user.role === 'owner') return true
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission')
    .eq('role', user.role)
    .eq('permission', permission)
    .limit(1)
  return !error && Array.isArray(data) && data.length > 0
}

export async function requirePermission(permission: string, nextPath = '/admin'): Promise<CurrentUser> {
  const user = await requireStaff(nextPath)
  if (!(await hasPermission(user, permission))) {
    await logSecurityEvent({ eventType: 'authorization_denied', actorId: user.id, endpoint: nextPath, method: 'GET', status: 403, metadata: { reason: 'missing_permission', permission } })
    redirect('/admin?notice=forbidden')
  }
  return user
}
