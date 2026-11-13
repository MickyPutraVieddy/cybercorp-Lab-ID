'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, LogOut, Settings, UserRound } from 'lucide-react'
import { logoutAction } from '@/src/server/actions/auth'
import { isRole, isStaff, ROLE_LABELS, type Role } from '@/src/server/roles'
import { useStore } from '@/src/store/store-provider'
import { text } from './copy'

type Me = { configured: boolean; authenticated: boolean; role?: string; name?: string }

// Presentation only: which buttons to show. Access control is enforced server-side on every protected route.
//  - Guest:   profile icon  -> "click here to log in"
//  - Member:  settings icon -> shows the role, opens /settings (edit username, address, password ...)
//  - Staff:   extra "Admin Dashboard" button (owner / super admin / admin) -> /admin
export function AuthNav({ variant, onNavigate }: { variant: 'desktop' | 'mobile'; onNavigate?: () => void }) {
  const { language } = useStore()
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => (response.ok ? (response.json() as Promise<Me>) : null))
      .then((data) => { if (!cancelled) setMe(data) })
      .catch(() => { if (!cancelled) setMe(null) })
    return () => { cancelled = true }
  }, [pathname])

  const className = variant === 'desktop' ? 'auth-nav auth-nav-desktop' : 'auth-nav auth-nav-mobile'
  if (!me) return <div className={className} aria-hidden="true" />
  const mobile = variant === 'mobile'

  if (!me.authenticated) {
    if (!me.configured) return null
    const tip = text(language, 'profileTip')
    return (
      <div className={className}>
        <Link className="nav-action has-tip nav-profile" href="/?mode=login" onClick={onNavigate} aria-label={tip}>
          <UserRound aria-hidden="true" size={18} />
          <span className="nav-label">{text(language, 'login')}</span>
          <span className="tip" role="tooltip">{tip}</span>
        </Link>
      </div>
    )
  }

  const role: Role = isRole(me.role) ? me.role : 'user'
  const staff = isStaff(role)
  const settingsTip = `${text(language, 'settingsTip')} ${ROLE_LABELS[role]}`
  const adminTip = text(language, 'adminTip')
  const logoutTip = text(language, 'logoutTip')
  return (
    <div className={className}>
      {staff ? (
        <Link className="nav-action nav-admin has-tip" href="/admin" onClick={onNavigate} aria-label={adminTip}>
          <LayoutDashboard aria-hidden="true" size={18} />
          <span className="nav-label">{text(language, 'adminDashboard')}</span>
          <span className="tip" role="tooltip">{adminTip}</span>
        </Link>
      ) : null}
      <Link className="nav-action has-tip nav-settings" href="/settings" onClick={onNavigate} aria-label={settingsTip}>
        <Settings aria-hidden="true" size={18} />
        <span className="nav-label">{text(language, 'settingsLabel')}</span>
        <span className="role-pill role-chip">{ROLE_LABELS[role]}</span>
        <span className="tip" role="tooltip">{settingsTip}</span>
      </Link>
      <form action={logoutAction}>
        <button className="nav-action has-tip nav-logout" type="submit" aria-label={logoutTip}>
          <LogOut aria-hidden="true" size={18} />
          <span className={mobile ? 'nav-label' : 'nav-label nav-label-hide'}>{text(language, 'logout')}</span>
          <span className="tip" role="tooltip">{logoutTip}</span>
        </button>
      </form>
    </div>
  )
}
