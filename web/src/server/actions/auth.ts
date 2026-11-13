'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient, SupabaseNotConfiguredError } from '@/src/supabase/server'
import { getSiteUrl } from '@/src/server/env'
import { homeForRole } from '@/src/server/roles'
import { getCurrentUser, resolveAppRole } from '@/src/server/session'
import { hashIdentifier, logSecurityEvent } from '@/src/server/security-events'
import { isValidEmail, normalizeEmail, passwordProblem, sanitizeNext, validateFullName } from '@/src/server/validation'
import type { FormState } from './types'

async function client() {
  try {
    return await createSupabaseServerClient()
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) return null
    throw error
  }
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = normalizeEmail(formData.get('email'))
  const password = str(formData, 'password')
  const next = str(formData, 'next')
  const fields = { email }
  const supabase = await client()
  if (!supabase) return { status: 'error', code: 'not_configured', fields }
  if (!isValidEmail(email) || password.length === 0 || password.length > 200) {
    return { status: 'error', code: 'invalid_credentials', fields }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    await logSecurityEvent({ eventType: 'login_failed', endpoint: '/login', method: 'POST', status: 401, metadata: { identifier: hashIdentifier(email), reason: error?.code ?? 'unknown' } })
    if (error?.code === 'email_not_confirmed') return { status: 'error', code: 'email_not_confirmed', fields }
    if (error?.status === 429 || error?.code === 'over_request_rate_limit') return { status: 'error', code: 'rate_limited', fields }
    return { status: 'error', code: 'invalid_credentials', fields }
  }

  const { role } = await resolveAppRole(supabase, data.user.id, Boolean(data.user.email_confirmed_at))
  await logSecurityEvent({ eventType: 'login_success', actorId: data.user.id, endpoint: '/login', method: 'POST', status: 200 })
  redirect(sanitizeNext(next, homeForRole(role)))
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullNameRaw = str(formData, 'fullName')
  const email = normalizeEmail(formData.get('email'))
  const password = str(formData, 'password')
  const confirm = str(formData, 'confirmPassword')
  const accepted = formData.get('terms') === 'on'
  const fields = { fullName: fullNameRaw, email }

  const supabase = await client()
  if (!supabase) return { status: 'error', code: 'not_configured', fields }
  const fullName = validateFullName(fullNameRaw)
  if (!fullName) return { status: 'error', code: 'name_invalid', fields }
  if (!isValidEmail(email)) return { status: 'error', code: 'email_invalid', fields }
  const problem = passwordProblem(password)
  if (problem) return { status: 'error', code: problem, fields }
  if (password !== confirm) return { status: 'error', code: 'password_mismatch', fields }
  if (!accepted) return { status: 'error', code: 'terms_required', fields }

  // NOTE: only full_name is sent. No role is ever read from the request; the DB trigger always creates role 'user'.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/home` },
  })
  if (error) {
    await logSecurityEvent({ eventType: 'signup_failed', endpoint: '/register', method: 'POST', status: 400, metadata: { identifier: hashIdentifier(email), reason: error.code ?? 'unknown' } })
    if (error.code === 'weak_password') return { status: 'error', code: 'password_weak', fields }
    if (error.status === 429 || error.code === 'over_request_rate_limit' || error.code === 'over_email_send_rate_limit') return { status: 'error', code: 'rate_limited', fields }
    return { status: 'error', code: 'register_failed', fields }
  }
  if (data.session) {
    // A session at signup means "Confirm email" is OFF in Supabase. We require confirmation: undo and report.
    await supabase.auth.signOut()
    await logSecurityEvent({ eventType: 'auth_misconfiguration', actorId: data.user?.id ?? null, endpoint: '/register', method: 'POST', classification: 'suspicious', metadata: { reason: 'email_confirmation_disabled' } })
    return { status: 'error', code: 'confirmation_disabled', fields }
  }
  await logSecurityEvent({ eventType: 'signup_requested', endpoint: '/register', method: 'POST', status: 200, metadata: { identifier: hashIdentifier(email) } })
  // Same response whether or not the email already exists (no account enumeration).
  return { status: 'success', code: 'register_check_email' }
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = normalizeEmail(formData.get('email'))
  const supabase = await client()
  if (!supabase) return { status: 'error', code: 'not_configured', fields: { email } }
  if (!isValidEmail(email)) return { status: 'error', code: 'email_invalid', fields: { email } }
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password` })
  await logSecurityEvent({ eventType: 'password_recovery_requested', endpoint: '/forgot-password', method: 'POST', status: error ? 400 : 200, metadata: { identifier: hashIdentifier(email) } })
  if (error && (error.status === 429 || error.code === 'over_email_send_rate_limit')) return { status: 'error', code: 'rate_limited', fields: { email } }
  return { status: 'success', code: 'recovery_sent' }
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = str(formData, 'password')
  const confirm = str(formData, 'confirmPassword')
  const supabase = await client()
  if (!supabase) return { status: 'error', code: 'not_configured' }
  const { data } = await supabase.auth.getUser()
  if (!data.user) return { status: 'error', code: 'recovery_expired' }
  const problem = passwordProblem(password)
  if (problem) return { status: 'error', code: problem }
  if (password !== confirm) return { status: 'error', code: 'password_mismatch' }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { status: 'error', code: error.code === 'weak_password' ? 'password_weak' : 'update_failed' }
  await supabase.auth.signOut({ scope: 'others' })
  await logSecurityEvent({ eventType: 'password_changed', actorId: data.user.id, endpoint: '/reset-password', method: 'POST', status: 200, metadata: { via: 'recovery' } })
  redirect('/settings?notice=password-updated')
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = str(formData, 'currentPassword')
  const password = str(formData, 'password')
  const confirm = str(formData, 'confirmPassword')
  const user = await getCurrentUser()
  if (!user) redirect('/?mode=login&next=%2Fsettings')
  const supabase = await client()
  if (!supabase) return { status: 'error', code: 'not_configured' }
  const problem = passwordProblem(password)
  if (problem) return { status: 'error', code: problem }
  if (password !== confirm) return { status: 'error', code: 'password_mismatch' }
  // Re-authenticate with the current password before allowing a change.
  const check = await supabase.auth.signInWithPassword({ email: user.email, password: current })
  if (check.error) {
    await logSecurityEvent({ eventType: 'password_change_failed', actorId: user.id, endpoint: '/settings', method: 'POST', status: 401, metadata: { reason: 'wrong_current_password' } })
    return { status: 'error', code: 'current_password_wrong' }
  }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { status: 'error', code: error.code === 'weak_password' ? 'password_weak' : 'update_failed' }
  await supabase.auth.signOut({ scope: 'others' })
  await logSecurityEvent({ eventType: 'password_changed', actorId: user.id, endpoint: '/settings', method: 'POST', status: 200, metadata: { via: 'dashboard' } })
  return { status: 'success', code: 'password_updated' }
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user) redirect('/?mode=login&next=%2Fsettings')
  const supabase = await client()
  if (!supabase) return { status: 'error', code: 'not_configured' }
  const fullName = validateFullName(formData.get('fullName'))
  if (!fullName) return { status: 'error', code: 'name_invalid', fields: { fullName: str(formData, 'fullName') } }
  // RLS + column privilege: a user can update only full_name on their own row.
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
  if (error) return { status: 'error', code: 'update_failed', fields: { fullName } }
  return { status: 'success', code: 'profile_saved', fields: { fullName } }
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser()
  const supabase = await client()
  if (supabase) await supabase.auth.signOut()
  if (user) await logSecurityEvent({ eventType: 'logout', actorId: user.id, endpoint: '/logout', method: 'POST', status: 200 })
  redirect('/')
}
