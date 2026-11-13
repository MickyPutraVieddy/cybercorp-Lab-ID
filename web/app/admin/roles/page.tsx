import type { Metadata } from 'next'
import { requireStaff } from '@/src/server/rbac'
import { ROLES, ROLE_LABELS } from '@/src/server/roles'
import { createSupabaseServerClient } from '@/src/supabase/server'

export const metadata: Metadata = { title: 'Roles & permissions' }

export default async function AdminRolesPage() {
  await requireStaff('/admin/roles')
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('role_permissions').select('role,permission').order('permission')
  const byRole = new Map<string, string[]>()
  for (const row of data ?? []) byRole.set(row.role as string, [...(byRole.get(row.role as string) ?? []), row.permission as string])
  return (
    <main id="main-content">
      <div className="page-intro"><span className="eyebrow">ROLES</span><h1>Roles &amp; permissions</h1>
        <p>Read-only in this phase. Permission edits will be owner-only and audited by a database trigger.</p></div>
      {error ? <p className="form-error" role="alert">Could not load permissions (migration 0002 applied?).</p> : null}
      <div className="dash-grid">
        {ROLES.map((role) => (
          <section className="dash-card" key={role}>
            <h2>{ROLE_LABELS[role]}</h2>
            <ul className="perm-list">{(byRole.get(role) ?? []).map((permission) => <li key={permission}>{permission}</li>)}</ul>
          </section>
        ))}
      </div>
      <ul className="rules-list">
        <li>Exactly one owner (database-enforced). Assigned only by the server-side bootstrap using SUPABASE_OWNER_USER_ID.</li>
        <li>Owner can set super_admin / admin / user on any non-owner account.</li>
        <li>Super admin can only move accounts between user and admin; cannot touch the owner or other super admins.</li>
        <li>Admin cannot change any roles. No one can change their own role.</li>
      </ul>
    </main>
  )
}
