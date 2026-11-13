import type { Metadata } from 'next'
import Link from 'next/link'
import { RoleForm } from '@/src/components/admin/role-form'
import { requirePermission } from '@/src/server/rbac'
import { assignableRoles, isRole, ROLE_LABELS, type Role } from '@/src/server/roles'
import { createSupabaseServerClient } from '@/src/supabase/server'

export const metadata: Metadata = { title: 'Users' }
const PAGE_SIZE = 25

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await requirePermission('users.read', '/admin/users')
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const supabase = await createSupabaseServerClient()
  // RLS: only staff can read other users' profiles/roles. Anyone else would get zero rows.
  const { data: profiles, error } = await supabase
    .from('profiles').select('id,email,full_name,created_at').order('created_at', { ascending: false }).range(from, from + PAGE_SIZE)
  const rows = (profiles ?? []).slice(0, PAGE_SIZE)
  const hasMore = (profiles ?? []).length > PAGE_SIZE
  const ids = rows.map((row) => row.id as string)
  const { data: roleRows } = ids.length ? await supabase.from('user_roles').select('user_id,role').in('user_id', ids) : { data: [] }
  const roleOf = new Map<string, Role>()
  for (const row of roleRows ?? []) if (isRole(row.role)) roleOf.set(row.user_id as string, row.role)

  return (
    <main id="main-content">
      <div className="page-intro"><span className="eyebrow">USERS</span><h1>User management</h1>
        <p>Role changes are validated again inside the database. The owner can never be modified here; nobody can change their own role.</p></div>
      {error ? <p className="form-error" role="alert">Could not load users.</p> : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Change role</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const role = roleOf.get(row.id as string) ?? 'user'
              const options = assignableRoles(actor.role, role, row.id === actor.id)
              return (
                <tr key={row.id as string}>
                  <td>{(row.full_name as string) || '—'}</td>
                  <td>{row.email as string}</td>
                  <td><span className="role-pill">{ROLE_LABELS[role]}</span></td>
                  <td>{new Date(row.created_at as string).toLocaleDateString('en-US')}</td>
                  <td>{options.length ? <RoleForm targetId={row.id as string} current={role} options={options} /> : <small>—</small>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="auth-links">
        {page > 1 ? <Link href={`/admin/users?page=${page - 1}`}>← Newer</Link> : null}{' '}
        {hasMore ? <Link href={`/admin/users?page=${page + 1}`}>Older →</Link> : null}
      </p>
    </main>
  )
}
