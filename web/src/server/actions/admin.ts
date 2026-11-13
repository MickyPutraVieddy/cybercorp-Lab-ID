'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/src/supabase/admin'
import { getCurrentUser } from '@/src/server/session'
import { isRole } from '@/src/server/roles'
import { logSecurityEvent } from '@/src/server/security-events'
import { isUuid } from '@/src/server/validation'
import type { FormState } from './types'

/**
 * Role change. Checks happen server-side TWICE: here (authenticated actor, role allowed to try) and again inside
 * Postgres change_user_role() (hierarchy rules, owner protection, no self-change). The audit row is written by
 * a DB trigger, so it exists even if this code path were bypassed.
 */
export async function changeUserRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await getCurrentUser()
  if (!actor) return { status: 'error', code: 'not_signed_in' }
  const targetId = formData.get('targetId')
  const newRole = formData.get('role')

  if (actor.role !== 'owner' && actor.role !== 'super_admin') {
    await logSecurityEvent({ eventType: 'authorization_denied', actorId: actor.id, endpoint: '/admin/users', method: 'POST', status: 403, metadata: { reason: 'role_change_not_allowed', role: actor.role } })
    return { status: 'error', code: 'forbidden' }
  }
  if (!isUuid(targetId) || !isRole(newRole) || newRole === 'owner') return { status: 'error', code: 'invalid_request' }

  const admin = createSupabaseAdminClient()
  if (!admin) return { status: 'error', code: 'not_configured' }
  const { data, error } = await admin.rpc('change_user_role', { p_actor: actor.id, p_target: targetId, p_new_role: newRole })
  await logSecurityEvent({
    eventType: 'role_change_attempt',
    actorId: actor.id,
    endpoint: '/admin/users',
    method: 'POST',
    status: error ? 403 : 200,
    metadata: { target: targetId, requested_role: newRole, result: error ? 'rejected' : String(data) },
  })
  if (error) return { status: 'error', code: 'role_rejected' }
  revalidatePath('/admin/users')
  return { status: 'success', code: data === 'unchanged' ? 'role_unchanged' : 'role_changed' }
}
