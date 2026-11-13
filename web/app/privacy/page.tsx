import type { Metadata } from 'next'
import { InfoScreen } from '@/src/components/store/info-screen'

export const metadata: Metadata = { title: 'Privacy' }
export default function PrivacyPage() { return <InfoScreen kind="privacy" /> }
