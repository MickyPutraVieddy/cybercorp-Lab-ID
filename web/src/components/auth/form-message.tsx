'use client'

import { useStore } from '@/src/store/store-provider'
import type { FormState } from '@/src/server/actions/types'
import { text } from './copy'

export function FormMessage({ state }: { state: FormState }) {
  const { language } = useStore()
  if (state.status === 'idle' || !state.code) return null
  const isError = state.status === 'error'
  return (
    <p className={isError ? 'form-error' : 'form-success'} role={isError ? 'alert' : 'status'}>
      {text(language, state.code)}
    </p>
  )
}

export function NoticeBanner({ code, kind }: { code: string; kind: 'notice' | 'error' }) {
  const { language } = useStore()
  return <p className={kind === 'error' ? 'form-error' : 'form-success'} role={kind === 'error' ? 'alert' : 'status'}>{text(language, `${kind}_${code.replace(/-/g, '_')}`)}</p>
}

export function T({ k }: { k: string }) {
  const { language } = useStore()
  return <>{text(language, k)}</>
}
