import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, ArrowUpRight, Boxes, ClipboardCheck, Fingerprint, Package, ShieldAlert, ShieldCheck, Users, Waypoints } from 'lucide-react'
import { requireStaff, hasPermission } from '@/src/server/rbac'
import { createSupabaseServerClient } from '@/src/supabase/server'
import { ROLES, ROLE_LABELS } from '@/src/server/roles'

export const metadata: Metadata = { title: 'Security Lab Overview' }

const modules = [
  { title: 'Identity & access', desc: 'Review users, role assignments, and privilege boundaries.', href: '/admin/users', icon: Users, tone: 'violet', state: 'AVAILABLE' },
  { title: 'Product management', desc: 'Create, edit and remove products stored in Supabase.', href: '/admin/products', icon: Package, tone: 'blue', state: 'LIVE DATABASE' },
  { title: 'Audit trail', desc: 'Review recorded administrative and security-sensitive actions.', href: '/admin/audit', icon: ClipboardCheck, tone: 'amber', state: 'AVAILABLE' },
  { title: 'Red Team workspace', desc: 'Plan authorized attack simulations against isolated lab assets.', href: '#red-team', icon: Waypoints, tone: 'red', state: 'PLANNED' },
  { title: 'Blue Team monitoring', desc: 'Triage telemetry, investigate alerts, and validate detections.', href: '#blue-team', icon: ShieldCheck, tone: 'green', state: 'PLANNED' },
  { title: 'Security events', desc: 'Centralize authentication and authorization security signals.', href: '/admin/audit', icon: Activity, tone: 'cyan', state: 'AUDIT SOURCE' },
]

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const user = await requireStaff('/admin')
  const { notice } = await searchParams
  const supabase = await createSupabaseServerClient()
  const [roleResult, auditResult, canUsers, canProducts, canAudit, canRed, canBlue] = await Promise.all([
    supabase.from('user_roles').select('role').limit(1000),
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
    hasPermission(user, 'users.read'),
    hasPermission(user, 'products.manage'),
    hasPermission(user, 'audit.read'),
    hasPermission(user, 'red_team.manage'),
    hasPermission(user, 'blue_team.read'),
  ])
  const counts: Record<string, number> = {}
  for (const row of roleResult.data ?? []) counts[row.role as string] = (counts[row.role as string] ?? 0) + 1
  const totalUsers = Object.values(counts).reduce((a, b) => a + b, 0)
  const allowedModules = modules.filter(m => (m.title === 'Identity & access' ? canUsers : m.title === 'Product management' ? canProducts : m.title === 'Audit trail' || m.title === 'Security events' ? canAudit : m.title === 'Red Team workspace' ? canRed : m.title === 'Blue Team monitoring' ? canBlue : true))

  return <main className="admin-page">
    <div className="admin-page-heading"><div><span className="admin-eyebrow">LAB CONTROL CENTER / OVERVIEW</span><h1>Good to see you.</h1><p>Monitor your lab workspace, access controls, and security operations from one place.</p></div><div className="admin-heading-meta"><span className="live-indicator"/> SESSION ACTIVE <small>{user.email}</small></div></div>
    {notice === 'forbidden' ? <div className="admin-alert">Access denied. Your account does not have permission to open that module.</div> : null}
    <section className="admin-stat-grid">
      <article className="admin-stat-card"><span className="admin-stat-icon violet"><Users size={19}/></span><span className="admin-stat-label">REGISTERED ACCOUNTS</span><strong>{roleResult.error ? '—' : totalUsers}</strong><small>Across all assigned roles</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon blue"><Fingerprint size={19}/></span><span className="admin-stat-label">PRIVILEGE GROUPS</span><strong>{ROLES.length}</strong><small>Owner · Super Admin · Admin · User</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon amber"><ClipboardCheck size={19}/></span><span className="admin-stat-label">AUDIT RECORDS</span><strong>{auditResult.error ? '—' : auditResult.count ?? 0}</strong><small>Records visible to this environment</small></article>
      <article className="admin-stat-card"><span className="admin-stat-icon green"><ShieldCheck size={19}/></span><span className="admin-stat-label">ENVIRONMENT</span><strong className="stat-word">LAB</strong><small>Use dedicated test accounts</small></article>
    </section>
    <div className="admin-section-heading"><div><span className="admin-eyebrow">YOUR WORKSPACE</span><h2>Operations modules</h2></div><span className="admin-section-note">ACCESS CONTROLLED</span></div>
    <section className="admin-module-grid">
      {allowedModules.map((m) => { const Icon = m.icon; const content = <><div className="admin-module-top"><span className={`admin-module-icon ${m.tone}`}><Icon size={20}/></span><span className="admin-module-state">{m.state}</span></div><h3>{m.title}</h3><p>{m.desc}</p>{m.href.startsWith('#') ? <span className="admin-module-link muted">Planned module</span> : <span className="admin-module-link">Open module <ArrowUpRight size={15}/></span>}</>; return m.href.startsWith('#') ? <article key={m.title} className="admin-module-card planned">{content}</article> : <Link href={m.href} key={m.title} className="admin-module-card">{content}</Link> })}
    </section>
    <section className="admin-lab-banner"><div className="admin-lab-symbol"><ShieldAlert size={25}/></div><div><span className="admin-eyebrow">PURPLE TEAM PRINCIPLE</span><h2>Attack with intent. Defend with evidence.</h2><p>Run controlled simulations, capture telemetry, verify detections, and document remediation. Keep intentionally vulnerable exercises isolated from production.</p></div><span className="admin-lab-label">AUTHORIZED LAB ONLY</span></section>
    <div className="admin-bottom-grid">
      <section className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">ACCESS SNAPSHOT</span><h3>Accounts by role</h3></div>{canUsers ? <Link href="/admin/users">Manage users ↗</Link> : null}</div>
        {ROLES.map(role => <div className="role-meter-row" key={role}><span>{ROLE_LABELS[role]}</span><div className="role-meter"><i style={{ width: `${totalUsers ? (counts[role] ?? 0) / totalUsers * 100 : 0}%` }}/></div><b>{roleResult.error ? '—' : counts[role] ?? 0}</b></div>)}
        {roleResult.error ? <small className="admin-muted">Could not read role data. Check whether migration 0001 is applied.</small> : null}
      </section>
      <section className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">SECURITY CHECKLIST</span><h3>Lab readiness</h3></div><ShieldCheck size={19}/></div>
        <div className="check-row"><span className="check-mark">✓</span><span><b>Role-based access control</b><small>Server-side staff gate enabled</small></span></div>
        <div className="check-row"><span className="check-mark">✓</span><span><b>Audit trail foundation</b><small>Database-backed event history</small></span></div>
        <div className="check-row pending"><span>○</span><span><b>Centralized telemetry</b><small>Integration still to be implemented</small></span></div>
        <div className="check-row pending"><span>○</span><span><b>Detection engineering</b><small>Rules and alert triage are planned</small></span></div>
      </section>
    </div>
  </main>
}
