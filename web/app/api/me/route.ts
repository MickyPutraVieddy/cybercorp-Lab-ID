import { NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/src/server/env'
import { getCurrentUser } from '@/src/server/session'

// Read-only, minimal, used only to render the header (Login/Register vs Dashboard/Logout). NOT an authorization source.
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }
  if (!isSupabaseConfigured()) return NextResponse.json({ configured: false, authenticated: false }, { headers })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ configured: true, authenticated: false }, { headers })
  return NextResponse.json(
    { configured: true, authenticated: true, role: user.role, name: user.fullName || user.email.split('@')[0] },
    { headers },
  )
}
