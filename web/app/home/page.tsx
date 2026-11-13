import type { Metadata } from 'next'
import { HomeScreen } from '@/src/components/store/home-screen'

export const metadata: Metadata = { title: 'Home' }

// Store home page (behind login — see proxy.ts). `notice` only selects a fixed banner text, never rendered raw.
export default async function StoreHomePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams
  return <HomeScreen notice={notice === 'confirmed' ? 'confirmed' : undefined} />
}
