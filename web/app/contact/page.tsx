import type { Metadata } from 'next'
import { ContactScreen } from '@/src/components/store/info-screen'

export const metadata: Metadata = { title: 'Contact' }
export default function ContactPage() { return <ContactScreen /> }
