import type { Metadata } from 'next'
import { requirePermission } from '@/src/server/rbac'
import { createSupabaseServerClient } from '@/src/supabase/server'

export const metadata: Metadata = { title: 'Audit logs' }

export default async function AdminAuditPage() {
  await requirePermission('audit.read', '/admin/audit')
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('audit_logs').select('id,created_at,actor_id,action,target_type,target_id,metadata').order('created_at', { ascending: false }).limit(100)
  return (
    <main id="main-content">
      <div className="page-intro"><span className="eyebrow">AUDIT</span><h1>Audit logs</h1><p>Append-only. Latest 100 entries.</p></div>
      {error ? <p className="form-error" role="alert">Could not load audit logs.</p> : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Time (UTC)</th><th>Action</th><th>Actor</th><th>Target</th><th>Details</th></tr></thead>
          <tbody>
            {(data ?? []).map((row) => (
              <tr key={row.id as string}>
                <td>{new Date(row.created_at as string).toISOString().replace('T', ' ').slice(0, 19)}</td>
                <td>{row.action as string}</td>
                <td><code>{row.actor_id ? String(row.actor_id).slice(0, 8) : 'system'}</code></td>
                <td>{row.target_type as string}{row.target_id ? ` · ${String(row.target_id).slice(0, 8)}` : ''}</td>
                <td><code>{JSON.stringify(row.metadata)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
