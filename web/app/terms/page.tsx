import type { Metadata } from 'next'
import { InfoScreen } from '@/src/components/store/info-screen'

export const metadata: Metadata = { title: 'Terms' }
export default function TermsPage() { return <InfoScreen kind="terms" /> }
