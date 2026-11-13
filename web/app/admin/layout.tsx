import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, Archive, ArrowLeft, Bell, Boxes, ClipboardList, Command, FileText, FlaskConical, LayoutDashboard, Package, Settings2, Shield, ShieldCheck, ShoppingBag, Users, UserCog, Waypoints } from 'lucide-react'
import { hasPermission, requireStaff } from '@/src/server/rbac'
import { ROLE_LABELS } from '@/src/server/roles'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireStaff('/admin')
  const [canUsers, canAudit, canProducts, canRed, canBlue] = await Promise.all([
    hasPermission(user, 'users.read'),
    hasPermission(user, 'audit.read'),
    hasPermission(user, 'products.manage'),
    hasPermission(user, 'red_team.manage'),
    hasPermission(user, 'blue_team.read'),
  ])

  const nav = [
    { label: 'WORKSPACE', items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard, show: true },
      { href: '/admin/products', label: 'Products', icon: Package, show: canProducts },
      { href: '/admin/users', label: 'User management', icon: Users, show: canUsers },
      { href: '/admin/roles', label: 'Roles & permissions', icon: UserCog, show: true },
      { href: '/admin/audit', label: 'Audit trail', icon: ClipboardList, show: canAudit },
    ]},
    { label: 'SECURITY OPERATIONS', items: [
      { href: '/admin/red-team', label: 'Red Team exercises', icon: Waypoints, show: canRed },
      { href: '/admin/blue-team', label: 'Blue Team monitoring', icon: ShieldCheck, show: canBlue },
      { href: '/admin/events', label: 'Security events', icon: Activity, show: canBlue || canAudit },
    ]},
    { label: 'SYSTEM', items: [
      { href: '/settings', label: 'Account settings', icon: Settings2, show: true },
    ]},
  ]

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <span className="admin-brand-mark"><Shield size={21} /></span>
          <span><strong>LET&apos;S TEST IT</strong><small>SECURITY LAB</small></span>
        </Link>
        <div className="admin-workspace"><span className="workspace-dot" /><span><b>LAB ENVIRONMENT</b><small>Isolated workspace</small></span><span className="env-tag">LAB</span></div>
        <nav className="admin-side-nav" aria-label="Admin navigation">
          {nav.map(group => <section className="admin-nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.filter(item => item.show).map(item => {
              const Icon = item.icon
              return <Link href={item.href} key={item.href} className="admin-nav-link"><Icon size={17} strokeWidth={1.8}/><span>{item.label}</span></Link>
            })}
          </section>)}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-user-chip"><span className="admin-avatar">{(user.email?.[0] ?? 'A').toUpperCase()}</span><span><b>{user.email}</b><small>{ROLE_LABELS[user.role]}</small></span></div>
          <Link className="admin-back-link" href="/home"><ArrowLeft size={15}/> Back to storefront</Link>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <div><span className="admin-topbar-kicker">CONTROL CENTER</span><strong>Security operations dashboard</strong></div>
          <div className="admin-topbar-actions"><span className="admin-env-pill"><span/> LAB ONLY</span><Link href="/settings" aria-label="Account settings" className="admin-top-icon"><Settings2 size={18}/></Link><span className="admin-top-avatar">{(user.email?.[0] ?? 'A').toUpperCase()}</span></div>
        </header>
        <div className="admin-content">{children}</div>
        <footer className="admin-footer"><span>LET&apos;S TEST IT · SECURITY LAB</span><span>Authorized testing only · Lab environment</span></footer>
      </section>
    </div>
  )
}
