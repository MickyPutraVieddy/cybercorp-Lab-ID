import type { Metadata } from 'next'
import { InfoScreen } from '@/src/components/store/info-screen'

export const metadata: Metadata = { title: 'About us' }
export default function AboutPage() { return <InfoScreen kind="about" /> }
