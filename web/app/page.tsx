import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { IntroScreen } from '@/src/components/intro/intro-screen'
import { isSupabaseConfigured } from '@/src/server/env'
import { getCurrentUser } from '@/src/server/session'
import { sanitizeNext } from '@/src/server/validation'

export const metadata: Metadata = { title: 'Welcome' }

// First page of the site: introduction + login/register. Signed-in visitors skip straight to the store home page.
export default async function IntroPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string; error?: string; notice?: string }> }) {
  const params = await searchParams
  const user = await getCurrentUser()
  if (user) {
    const target = sanitizeNext(params.next, '/home')
    redirect(target === '/' ? '/home' : target)
  }
  const next = sanitizeNext(params.next, '')
  return (
    <IntroScreen
      initialMode={params.mode === 'register' ? 'register' : 'login'}
      next={next === '/' ? '' : next}
      configured={isSupabaseConfigured()}
      error={params.error}
      notice={params.notice}
    />
  )
}
