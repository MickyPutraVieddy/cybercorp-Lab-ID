'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ArrowRight, Globe2, Layers, PackageCheck, ShieldCheck, UserCog, UserRound, Crown, Shield } from 'lucide-react'
import { categories, products } from '@/src/catalog/products'
import { useStore } from '@/src/store/store-provider'
import { LoginForm, RegisterForm } from '@/src/components/auth/auth-forms'
import { FormMessage, NoticeBanner } from '@/src/components/auth/form-message'
import { text } from '@/src/components/auth/copy'
import { ROLE_LABELS, type Role } from '@/src/server/roles'

type Mode = 'login' | 'register'

type Props = {
  initialMode: Mode
  /** Already sanitized same-site path ('' when none). */
  next: string
  configured: boolean
  error?: string
  notice?: string
}

const roleCards: { role: Role; icon: typeof UserRound }[] = [
  { role: 'user', icon: UserRound },
  { role: 'admin', icon: UserCog },
  { role: 'super_admin', icon: Shield },
  { role: 'owner', icon: Crown },
]

/**
 * First screen of the site: introduction + the only way in. The store (/home, /catalog, /cart ...) sits behind login
 * (proxy.ts gate + the login redirect). Presentation only — access control stays server-side.
 */
export function IntroScreen({ initialMode, next, configured, error, notice }: Props) {
  const { language, setLanguage } = useStore()
  const [mode, setMode] = useState<Mode>(initialMode)
  const t = (key: string) => text(language, key)

  return (
    <div className="intro">
      <header className="intro-bar">
        <div className="page-wrap intro-bar-inner">
          <a className="brand" href="/" aria-label="Let's Test It">
            <Image className="brand-mark" src="/brand-mark.svg" alt="" width={38} height={38} priority />
            <span className="brand-wordmark">LET&apos;S TEST IT<small>OUTDOOR &amp; TRAVEL</small></span>
          </a>
          <nav className="intro-nav" aria-label="Introduction">
            <a href="#about">{t('introNavAbout')}</a>
            <a href="#how">{t('introNavHow')}</a>
            <a href="#roles">{t('introNavRoles')}</a>
          </nav>
          <div className="intro-tools">
            <label className="sr-only" htmlFor="intro-language">{t('prefLanguage')}</label>
            <select className="header-select" id="intro-language" value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'id')}>
              <option value="en">EN</option>
              <option value="id">ID</option>
            </select>
            <a className="auth-link auth-link-primary" href="#access" onClick={() => setMode('login')}>{t('login')}</a>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="page-wrap intro-hero" aria-labelledby="intro-title">
          <div className="intro-copy">
            <span className="intro-badge"><ShieldCheck aria-hidden="true" size={14} /> {t('introBadge')}</span>
            <h1 className="display-title intro-title" id="intro-title">{t('introTitleA')} <em>{t('introTitleB')}</em></h1>
            <p className="intro-lead">{t('introLead')}</p>
            <div className="action-row">
              <a className="store-button intro-cta" href="#access" onClick={() => setMode('login')}>{t('introCta')} <ArrowRight aria-hidden="true" size={16} /></a>
              <a className="outline-action" href="#about">{t('introLearn')}</a>
            </div>
            <ul className="intro-stats" aria-label="Store at a glance">
              <li><PackageCheck aria-hidden="true" size={20} /><strong>{products.length}</strong><span>{t('statProducts')}</span></li>
              <li><Layers aria-hidden="true" size={20} /><strong>{categories.length}</strong><span>{t('statCategories')}</span></li>
              <li><Globe2 aria-hidden="true" size={20} /><strong>2</strong><span>{t('statLanguages')}</span></li>
            </ul>
          </div>

          <div className="intro-gate" id="access">
            <div className="auth-card intro-card">
              <span className="eyebrow">{t('introGateEyebrow')}</span>
              <h2>{t(mode === 'login' ? 'introGateLogin' : 'introGateRegister')}</h2>
              <div className="intro-tabs" role="tablist" aria-label={t('introGateEyebrow')}>
                <button type="button" role="tab" id="tab-login" aria-selected={mode === 'login'} aria-controls="panel-auth" onClick={() => setMode('login')}>{t('login')}</button>
                <button type="button" role="tab" id="tab-register" aria-selected={mode === 'register'} aria-controls="panel-auth" onClick={() => setMode('register')}>{t('register')}</button>
              </div>
              <div id="panel-auth" role="tabpanel" aria-labelledby={mode === 'login' ? 'tab-login' : 'tab-register'} className="intro-panel">
                {!configured ? <FormMessage state={{ status: 'error', code: 'not_configured' }} /> : null}
                {error === 'callback_failed' ? <NoticeBanner code="callback_failed" kind="error" /> : null}
                {notice === 'password-updated' ? <NoticeBanner code="password-updated" kind="notice" /> : null}
                {mode === 'login' ? <LoginForm next={next} /> : <RegisterForm />}
              </div>
              <p className="auth-links intro-switch">
                {mode === 'login' ? t('noAccount') : t('haveAccount')}{' '}
                <button type="button" className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{t(mode === 'login' ? 'register' : 'login')}</button>
              </p>
              <p className="intro-note">{t('introGateNote')}</p>
            </div>
          </div>
        </section>

        <section className="page-wrap home-section" id="about" aria-labelledby="about-title">
          <div className="story-band intro-story">
            <div>
              <span className="eyebrow">{t('introAboutEyebrow')}</span>
              <h2 id="about-title">{t('introAboutTitle')}</h2>
              <p>{t('introAboutText')}</p>
            </div>
            <div className="story-details">
              {categories.slice(0, 4).map((category) => (
                <div className="story-point" key={category.id}>
                  <strong>{category.name[language]}</strong>
                  <span>{category.count} {t('statProducts').toLowerCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="page-wrap home-section" id="how" aria-labelledby="how-title">
          <div className="section-heading">
            <div><span className="eyebrow">{t('introHowEyebrow')}</span><h2 id="how-title">{t('introHowTitle')}</h2></div>
          </div>
          <ol className="step-grid">
            {[1, 2, 3].map((n) => (
              <li className="step-card" key={n}>
                <span className="step-number" aria-hidden="true">{n}</span>
                <h3>{t(`introStep${n}T`)}</h3>
                <p>{t(`introStep${n}D`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="page-wrap home-section" id="roles" aria-labelledby="roles-title">
          <div className="section-heading">
            <div><span className="eyebrow">{t('introRolesEyebrow')}</span><h2 id="roles-title">{t('introRolesTitle')}</h2></div>
            <p>{t('introRolesLead')}</p>
          </div>
          <div className="role-grid">
            {roleCards.map(({ role, icon: Icon }) => (
              <article className="info-card role-card" key={role}>
                <Icon aria-hidden="true" size={20} />
                <h3>{ROLE_LABELS[role]}</h3>
                <p>{t(`roleDesc_${role}`)}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="page-wrap intro-foot">
        <span>© {new Date().getFullYear()} Let&apos;s Test It</span>
        <span>{t('introDisclaimer')}</span>
      </footer>
    </div>
  )
}
