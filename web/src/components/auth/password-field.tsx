'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useStore } from '@/src/store/store-provider'
import { text } from './copy'

export function PasswordField({ name, label, autoComplete, hint }: { name: string; label: string; autoComplete: string; hint?: string }) {
  const { language } = useStore()
  const [visible, setVisible] = useState(false)
  const id = `field-${name}`
  return (
    <div className="form-label">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input className="form-control" id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required maxLength={200} />
        <button type="button" className="password-toggle" onClick={() => setVisible((v) => !v)} aria-label={text(language, visible ? 'hide' : 'show')} aria-pressed={visible}>
          {visible ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
        </button>
      </div>
      {hint ? <small className="field-hint">{hint}</small> : null}
    </div>
  )
}
