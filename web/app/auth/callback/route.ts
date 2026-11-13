import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createSupabaseServerClient, SupabaseNotConfiguredError } from '@/src/supabase/server'
import { logSecurityEvent } from '@/src/server/security-events'
import { sanitizeNext } from '@/src/server/validation'

const OTP_TYPES: readonly string[] = ['signup', 'recovery', 'email', 'invite', 'magiclink', 'email_change']

// Handles BOTH Supabase email-link styles: PKCE `?code=` (default templates) and `?token_hash=&type=` (custom templates).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const code = params.get('code')
  const tokenHash = params.get('token_hash')
  const type = params.get('type')
  const next = sanitizeNext(params.get('next'), '/home')
  const fail = () => NextResponse.redirect(new URL('/?mode=login&error=callback_failed', request.url))

  let supabase
  try {
    supabase = await createSupabaseServerClient()
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) return NextResponse.redirect(new URL('/?mode=login', request.url))
    throw error
  }

  let ok = false
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash })
    ok = !error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    ok = !error
  }
  if (!ok) {
    await logSecurityEvent({ eventType: 'auth_callback_failed', endpoint: '/auth/callback', method: 'GET', status: 400 })
    return fail()
  }

  const destination = type === 'recovery' ? '/reset-password' : next
  const target = new URL(destination, request.url)
  if (destination === '/home' || destination === '/dashboard') target.searchParams.set('notice', 'confirmed')
  const response = NextResponse.redirect(target)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
