import type { Metadata } from 'next'
import { InfoScreen } from '@/src/components/store/info-screen'

export const metadata: Metadata = { title: 'Careers' }
export default function CareersPage() { return <InfoScreen kind="careers" /> }
