'use client'

import Link from 'next/link'
import { useStore } from '@/src/store/store-provider'
import { ChangePasswordForm, ProfileForm } from './auth-forms'
import { NoticeBanner, T } from './form-message'
import { text } from './copy'
import { logoutAction } from '@/src/server/actions/auth'
import { Button } from '@/components/ui/button'

type Props = {
  email: string
  fullName: string
  roleLabel: string
  isStaff: boolean
  createdAt: string
  emailConfirmedAt: string
  notice?: string
  rolesAvailable: boolean
}

export function DashboardView({ email, fullName, roleLabel, isStaff, createdAt, emailConfirmedAt, notice, rolesAvailable }: Props) {
  const { language } = useStore()
  const locale = language === 'id' ? 'id-ID' : 'en-US'
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
  const known = ['confirmed', 'password-updated', 'forbidden']
  return (
    <main id="main-content" className="page-wrap">
      <div className="page-intro">
        <span className="eyebrow">{text(language, 'dashboard').toUpperCase()}</span>
        <h1>{fullName || email.split('@')[0]}</h1>
      </div>
      {notice && known.includes(notice) ? <NoticeBanner code={notice} kind={notice === 'forbidden' ? 'error' : 'notice'} /> : null}
      {!rolesAvailable ? <p className="form-error" role="alert">Role data is unavailable (database migration not applied). Showing minimum access.</p> : null}
      <div className="dash-grid">
        <section className="dash-card">
          <h2><T k="accountInfo" /></h2>
          <dl className="info-list">
            <div><dt><T k="email" /></dt><dd>{email}</dd></div>
            <div><dt><T k="role" /></dt><dd><span className="role-pill">{roleLabel}</span></dd></div>
            <div><dt><T k="memberSince" /></dt><dd>{fmt(createdAt)}</dd></div>
            <div><dt><T k="emailConfirmed" /></dt><dd>{fmt(emailConfirmedAt)}</dd></div>
          </dl>
          {isStaff ? <Link className="auth-link auth-link-primary" href="/admin"><T k="adminArea" /></Link> : null}
          <form action={logoutAction}><Button type="submit" variant="outline" className="min-h-11 rounded-full px-6"><T k="logout" /></Button></form>
        </section>
        <section className="dash-card">
          <h2><T k="profile" /></h2>
          <ProfileForm fullName={fullName} />
        </section>
        <section className="dash-card">
          <h2><T k="security" /></h2>
          <ChangePasswordForm />
        </section>
      </div>
    </main>
  )
}
