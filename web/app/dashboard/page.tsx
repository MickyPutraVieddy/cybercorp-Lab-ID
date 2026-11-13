import { redirect } from 'next/navigation'

// The old account dashboard became /settings. Kept as a redirect so existing links (e.g. email templates) keep working.
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams
  redirect(notice === 'confirmed' ? '/home?notice=confirmed' : notice ? `/settings?notice=${encodeURIComponent(notice)}` : '/settings')
}
