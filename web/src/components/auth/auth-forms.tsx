'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useStore } from '@/src/store/store-provider'
import { idleState, type FormState } from '@/src/server/actions/types'
import { changePasswordAction, forgotPasswordAction, loginAction, registerAction, resetPasswordAction, updateProfileAction } from '@/src/server/actions/auth'
import { text } from './copy'
import { FormMessage } from './form-message'
import { PasswordField } from './password-field'

type ActionFn = (prev: FormState, formData: FormData) => Promise<FormState>

function useForm(action: ActionFn) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const { language } = useStore()
  return { state, formAction, pending, language }
}

const submitClass = 'store-button min-h-11 rounded-full px-6'

function EmailField({ defaultValue }: { defaultValue?: string }) {
  const { language } = useStore()
  return (
    <label className="form-label" htmlFor="field-email">
      {text(language, 'email')}
      <input className="form-control" id="field-email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={defaultValue} />
    </label>
  )
}

export function LoginForm({ next }: { next: string }) {
  const { state, formAction, pending, language } = useForm(loginAction)
  return (
    <form className="auth-form" action={formAction} noValidate={false}>
      <input type="hidden" name="next" value={next} />
      <EmailField defaultValue={state.fields?.email} />
      <PasswordField name="password" label={text(language, 'password')} autoComplete="current-password" />
      <FormMessage state={state} />
      <Button className={submitClass} type="submit" disabled={pending}>{text(language, pending ? 'loggingIn' : 'login')}</Button>
      <p className="auth-links"><Link href="/forgot-password">{text(language, 'forgot')}</Link></p>
    </form>
  )
}

export function RegisterForm() {
  const { state, formAction, pending, language } = useForm(registerAction)
  if (state.status === 'success') return <FormMessage state={state} />
  return (
    <form className="auth-form" action={formAction}>
      <label className="form-label" htmlFor="field-fullName">
        {text(language, 'fullName')}
        <input className="form-control" id="field-fullName" name="fullName" type="text" autoComplete="name" required minLength={2} maxLength={120} defaultValue={state.fields?.fullName} />
      </label>
      <EmailField defaultValue={state.fields?.email} />
      <PasswordField name="password" label={text(language, 'password')} autoComplete="new-password" hint={text(language, 'passwordHint')} />
      <PasswordField name="confirmPassword" label={text(language, 'confirmPassword')} autoComplete="new-password" />
      <label className="check-label"><input type="checkbox" name="terms" required /> <span>{text(language, 'terms')}</span></label>
      <FormMessage state={state} />
      <Button className={submitClass} type="submit" disabled={pending}>{text(language, pending ? 'creating' : 'register')}</Button>
    </form>
  )
}

export function ForgotPasswordForm() {
  const { state, formAction, pending, language } = useForm(forgotPasswordAction)
  return (
    <form className="auth-form" action={formAction}>
      <EmailField defaultValue={state.fields?.email} />
      <FormMessage state={state} />
      <Button className={submitClass} type="submit" disabled={pending}>{text(language, pending ? 'sending' : 'sendLink')}</Button>
    </form>
  )
}

export function ResetPasswordForm() {
  const { state, formAction, pending, language } = useForm(resetPasswordAction)
  return (
    <form className="auth-form" action={formAction}>
      <PasswordField name="password" label={text(language, 'newPassword')} autoComplete="new-password" hint={text(language, 'passwordHint')} />
      <PasswordField name="confirmPassword" label={text(language, 'confirmPassword')} autoComplete="new-password" />
      <FormMessage state={state} />
      <Button className={submitClass} type="submit" disabled={pending}>{text(language, pending ? 'saving' : 'setPassword')}</Button>
    </form>
  )
}

export function ProfileForm({ fullName }: { fullName: string }) {
  const { state, formAction, pending, language } = useForm(updateProfileAction)
  return (
    <form className="auth-form" action={formAction}>
      <label className="form-label" htmlFor="profile-fullName">
        {text(language, 'fullName')}
        <input className="form-control" id="profile-fullName" name="fullName" type="text" autoComplete="name" required minLength={2} maxLength={120} defaultValue={state.fields?.fullName ?? fullName} />
      </label>
      <FormMessage state={state} />
      <Button className={submitClass} type="submit" disabled={pending}>{text(language, pending ? 'saving' : 'save')}</Button>
    </form>
  )
}

export function ChangePasswordForm() {
  const { state, formAction, pending, language } = useForm(changePasswordAction)
  return (
    <form className="auth-form" action={formAction}>
      <PasswordField name="currentPassword" label={text(language, 'currentPassword')} autoComplete="current-password" />
      <PasswordField name="password" label={text(language, 'newPassword')} autoComplete="new-password" hint={text(language, 'passwordHint')} />
      <PasswordField name="confirmPassword" label={text(language, 'confirmPassword')} autoComplete="new-password" />
      <FormMessage state={state} />
      <Button className={submitClass} type="submit" disabled={pending}>{text(language, pending ? 'saving' : 'setPassword')}</Button>
    </form>
  )
}
