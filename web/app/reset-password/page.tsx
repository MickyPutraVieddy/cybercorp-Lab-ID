import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/src/components/auth/auth-shell'
import { ResetPasswordForm } from '@/src/components/auth/auth-forms'
import { T } from '@/src/components/auth/form-message'
import { getCurrentUser } from '@/src/server/session'

export const metadata: Metadata = { title: 'Reset password' }

export default async function ResetPasswordPage() {
  // The recovery link (via /auth/callback) creates a session; without one there is nothing to reset.
  const user = await getCurrentUser()
  if (!user) redirect('/forgot-password?error=recovery_expired')
  return (
    <AuthShell eyebrow="ACCOUNT" title={<T k="resetTitle" />}>
      <ResetPasswordForm />
    </AuthShell>
  )
}
