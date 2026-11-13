import type { Metadata } from 'next'
import { SettingsView } from '@/src/components/account/settings-view'
import { requireUser } from '@/src/server/rbac'
import { isStaff } from '@/src/server/roles'
import { createSupabaseServerClient } from '@/src/supabase/server'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const user = await requireUser('/settings')
  const { notice } = await searchParams
  const supabase = await createSupabaseServerClient()

  // Both reads are RLS-scoped to the signed-in user. If migration 0003 is not applied the queries error and we degrade gracefully.
  const [profile, details] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).maybeSingle(),
    supabase.from('profile_details').select('phone, address_line, city, province, postal_code').eq('user_id', user.id).maybeSingle(),
  ])
  const detailsAvailable = !profile.error && !details.error

  return (
    <SettingsView
      email={user.email}
      role={user.role}
      isStaff={isStaff(user.role)}
      createdAt={user.createdAt}
      rolesAvailable={user.rolesAvailable}
      detailsAvailable={detailsAvailable}
      notice={notice}
      defaults={{
        fullName: user.fullName,
        username: (profile.data?.username as string | null | undefined) ?? '',
        phone: (details.data?.phone as string | null | undefined) ?? '',
        addressLine: (details.data?.address_line as string | null | undefined) ?? '',
        city: (details.data?.city as string | null | undefined) ?? '',
        province: (details.data?.province as string | null | undefined) ?? '',
        postalCode: (details.data?.postal_code as string | null | undefined) ?? '',
      }}
    />
  )
}
