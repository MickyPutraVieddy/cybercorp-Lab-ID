import type { ReactNode } from 'react'

export function AuthShell({ eyebrow, title, lead, children }: { eyebrow: string; title: ReactNode; lead?: ReactNode; children: ReactNode }) {
  return (
    <main id="main-content" className="page-wrap">
      <div className="auth-shell">
        <div className="page-intro">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {lead ? <p>{lead}</p> : null}
        </div>
        <div className="auth-card">{children}</div>
      </div>
    </main>
  )
}
