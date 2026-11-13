import { redirect } from 'next/navigation'

// The login form now lives on the intro page (/). This route is kept so old links, email links and bookmarks still work.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; notice?: string }> }) {
  const params = await searchParams
  const query = new URLSearchParams({ mode: 'login' })
  for (const key of ['next', 'error', 'notice'] as const) {
    const value = params[key]
    if (typeof value === 'string' && value) query.set(key, value)
  }
  redirect(`/?${query.toString()}`)
}
