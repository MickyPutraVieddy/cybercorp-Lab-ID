'use client'

import Link from 'next/link'
import { LayoutDashboard, LogOut, PackageSearch, ShieldCheck, ShoppingBag, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/src/store/store-provider'
import { logoutAction } from '@/src/server/actions/auth'
import { ChangePasswordForm } from '@/src/components/auth/auth-forms'
import { NoticeBanner } from '@/src/components/auth/form-message'
import { text } from '@/src/components/auth/copy'
import { ROLE_LABELS, type Role } from '@/src/server/roles'
import { AccountForm, PreferencesCard, type AccountDefaults } from './account-form'

type Props = {
  email: string
  role: Role
  isStaff: boolean
  createdAt: string
  defaults: AccountDefaults
  detailsAvailable: boolean
  rolesAvailable: boolean
  notice?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function SettingsView({ email, role, isStaff, createdAt, defaults, detailsAvailable, rolesAvailable, notice }: Props) {
  const { language } = useStore()
  const locale = language === 'id' ? 'id-ID' : 'en-US'
  const since = new Date(createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
  const display = defaults.fullName || defaults.username || email.split('@')[0]
  const known = ['confirmed', 'password-updated', 'forbidden']

  return (
    <main id="main-content" className="page-wrap">
      <div className="page-intro">
        <span className="eyebrow">{text(language, 'settingsEyebrow')}</span>
        <h1>{text(language, 'settingsLabel')}</h1>
        <p>{text(language, 'settingsLead')}</p>
      </div>
      {notice && known.includes(notice) ? <NoticeBanner code={notice} kind={notice === 'forbidden' ? 'error' : 'notice'} /> : null}
      {!rolesAvailable ? <p className="form-error" role="alert">Role data is unavailable (database migration 0001 not applied). Showing minimum access.</p> : null}
      {!detailsAvailable ? <p className="form-error" role="alert">{text(language, 'detailsUnavailable')}</p> : null}

      <div className="settings-layout">
        <aside className="settings-side">
          <section className="dash-card account-summary">
            <div className="avatar" aria-hidden="true">{initials(display)}</div>
            <div>
              <h2>{display}</h2>
              {defaults.username ? <p className="handle">@{defaults.username}</p> : null}
              <p>{email}</p>
            </div>
            <dl className="info-list">
              <div><dt>{text(language, 'yourRole')}</dt><dd><span className="role-pill">{ROLE_LABELS[role]}</span></dd></div>
              <div><dt>{text(language, 'memberSince')}</dt><dd>{since}</dd></div>
            </dl>
            <p className="role-desc">{text(language, `roleDesc_${role}`)}</p>
            {isStaff ? (
              <Link className="auth-link auth-link-primary admin-cta" href="/admin" title={text(language, 'adminTip')}>
                <LayoutDashboard aria-hidden="true" size={16} /> {text(language, 'openAdmin')}
              </Link>
            ) : (
              <p className="role-desc muted"><ShieldCheck aria-hidden="true" size={14} /> {text(language, 'noAdminAccess')}</p>
            )}
          </section>

          <section className="dash-card">
            <h2>{text(language, 'sectionShortcuts')}</h2>
            <nav className="shortcut-list" aria-label={text(language, 'sectionShortcuts')}>
              <Link href="/home"><Store aria-hidden="true" size={16} /> {text(language, 'goShop')}</Link>
              <Link href="/cart"><ShoppingBag aria-hidden="true" size={16} /> {text(language, 'goBag')}</Link>
              <Link href="/order-tracking"><PackageSearch aria-hidden="true" size={16} /> {text(language, 'goOrders')}</Link>
            </nav>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="min-h-11 w-full rounded-full px-6"><LogOut aria-hidden="true" size={16} /> {text(language, 'logout')}</Button>
            </form>
          </section>
        </aside>

        <div className="settings-main">
          <section className="dash-card">
            <h2>{text(language, 'accountInfo')}</h2>
            <AccountForm defaults={defaults} />
          </section>
          <section className="dash-card">
            <h2>{text(language, 'sectionPrefs')}</h2>
            <PreferencesCard />
          </section>
          <section className="dash-card">
            <h2>{text(language, 'security')}</h2>
            <ChangePasswordForm />
          </section>
        </div>
      </div>
    </main>
  )
}
