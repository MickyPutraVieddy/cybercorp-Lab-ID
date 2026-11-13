import type { Metadata } from 'next'
import { InfoScreen } from '@/src/components/store/info-screen'

export const metadata: Metadata = { title: 'Help center' }
export default function HelpPage() { return <InfoScreen kind="help" /> }
