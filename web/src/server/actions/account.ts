'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient, SupabaseNotConfiguredError } from '@/src/supabase/server'
import { getCurrentUser } from '@/src/server/session'
import { logSecurityEvent } from '@/src/server/security-events'
import { parseOptionalText, parsePhone, parseUsername, validateFullName } from '@/src/server/validation'
import type { FormState } from './types'

async function client() {
  try {
    return await createSupabaseServerClient()
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) return null
    throw error
  }
}

function raw(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

/** Postgres / PostgREST errors that mean "the 0003 migration is not applied" (missing column or table). */
function isMissingSchema(error: { code?: string; message?: string }): boolean {
  return ['42703', '42P01', 'PGRST204', 'PGRST205'].includes(error.code ?? '')
}

/**
 * Updates the signed-in member's own profile (full name, username) and private contact/shipping details.
 * The user id always comes from the validated session, never from the form. RLS + column privileges enforce it again.
 */
export async function updateAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user) redirect('/?mode=login&next=%2Fsettings')
  const fields = {
    fullName: raw(formData, 'fullName'),
    username: raw(formData, 'username'),
    phone: raw(formData, 'phone'),
    addressLine: raw(formData, 'addressLine'),
    city: raw(formData, 'city'),
    province: raw(formData, 'province'),
    postalCode: raw(formData, 'postalCode'),
  }
  const supabase = await client()
  if (!supabase) return { status: 'error', code: 'not_configured', fields }

  const fullName = validateFullName(formData.get('fullName'))
  if (!fullName) return { status: 'error', code: 'name_invalid', fields }
  const username = parseUsername(formData.get('username'))
  if (!username.ok) return { status: 'error', code: 'username_invalid', fields }
  const phone = parsePhone(formData.get('phone'))
  if (!phone.ok) return { status: 'error', code: 'phone_invalid', fields }
  const addressLine = parseOptionalText(formData.get('addressLine'), 200)
  const city = parseOptionalText(formData.get('city'), 80)
  const province = parseOptionalText(formData.get('province'), 80)
  const postalCode = parseOptionalText(formData.get('postalCode'), 12)
  if (!addressLine.ok || !city.ok || !province.ok || !postalCode.ok) return { status: 'error', code: 'field_invalid', fields }

  const { error: profileError } = await supabase.from('profiles').update({ full_name: fullName, username: username.value }).eq('id', user.id)
  if (profileError) {
    if (profileError.code === '23505') return { status: 'error', code: 'username_taken', fields }
    if (isMissingSchema(profileError)) {
      // Migration 0003 not applied: still save the name (works with migration 0001 alone), report the rest as unavailable.
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
      return { status: 'error', code: 'settings_unavailable', fields }
    }
    return { status: 'error', code: 'update_failed', fields }
  }

  const { error: detailsError } = await supabase.from('profile_details').upsert(
    {
      user_id: user.id,
      phone: phone.value,
      address_line: addressLine.value,
      city: city.value,
      province: province.value,
      postal_code: postalCode.value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (detailsError) {
    if (isMissingSchema(detailsError)) return { status: 'error', code: 'settings_unavailable', fields }
    return { status: 'error', code: 'update_failed', fields }
  }

  // No personal data in the event: only that an update happened.
  await logSecurityEvent({ eventType: 'account_updated', actorId: user.id, endpoint: '/settings', method: 'POST', status: 200 })
  return { status: 'success', code: 'settings_saved', fields }
}
