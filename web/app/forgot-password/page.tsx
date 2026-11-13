import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/src/components/auth/auth-shell'
import { ForgotPasswordForm } from '@/src/components/auth/auth-forms'
import { FormMessage, T } from '@/src/components/auth/form-message'
import { isSupabaseConfigured } from '@/src/server/env'

export const metadata: Metadata = { title: 'Forgot password' }

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return (
    <AuthShell eyebrow="ACCOUNT" title={<T k="forgotTitle" />} lead={<T k="forgotLead" />}>
      {!isSupabaseConfigured() ? <FormMessage state={{ status: 'error', code: 'not_configured' }} /> : null}
      {params.error === 'recovery_expired' ? <FormMessage state={{ status: 'error', code: 'recovery_expired' }} /> : null}
      <ForgotPasswordForm />
      <p className="auth-links"><Link href="/login"><T k="backToLogin" /></Link></p>
    </AuthShell>
  )
}
