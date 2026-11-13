'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/src/store/store-provider'
import { idleState } from '@/src/server/actions/types'
import { updateAccountAction } from '@/src/server/actions/account'
import { FormMessage } from '@/src/components/auth/form-message'
import { text } from '@/src/components/auth/copy'

export type AccountDefaults = {
  fullName: string
  username: string
  phone: string
  addressLine: string
  city: string
  province: string
  postalCode: string
}

/** Profile + shipping address in one form (typical e-commerce "My account" layout). */
export function AccountForm({ defaults }: { defaults: AccountDefaults }) {
  const [state, formAction, pending] = useActionState(updateAccountAction, idleState)
  const { language } = useStore()
  const f = state.fields
  const value = (key: keyof AccountDefaults) => f?.[key] ?? defaults[key]

  return (
    <form className="auth-form" action={formAction}>
      <fieldset className="settings-fieldset">
        <legend>{text(language, 'profile')}</legend>
        <label className="form-label" htmlFor="acc-username">
          {text(language, 'username')}
          <input className="form-control" id="acc-username" name="username" type="text" autoComplete="username" maxLength={24} placeholder="your.name" defaultValue={value('username')} autoCapitalize="none" spellCheck={false} />
          <small className="field-hint">{text(language, 'usernameHint')}</small>
        </label>
        <label className="form-label" htmlFor="acc-fullName">
          {text(language, 'fullName')}
          <input className="form-control" id="acc-fullName" name="fullName" type="text" autoComplete="name" required minLength={2} maxLength={120} defaultValue={value('fullName')} />
        </label>
        <label className="form-label" htmlFor="acc-phone">
          {text(language, 'phone')}
          <input className="form-control" id="acc-phone" name="phone" type="tel" autoComplete="tel" maxLength={20} defaultValue={value('phone')} />
        </label>
      </fieldset>

      <fieldset className="settings-fieldset">
        <legend>{text(language, 'sectionAddress')}</legend>
        <label className="form-label" htmlFor="acc-address">
          {text(language, 'addressLine')}
          <input className="form-control" id="acc-address" name="addressLine" type="text" autoComplete="street-address" maxLength={200} defaultValue={value('addressLine')} />
        </label>
        <div className="settings-row">
          <label className="form-label" htmlFor="acc-city">
            {text(language, 'city')}
            <input className="form-control" id="acc-city" name="city" type="text" autoComplete="address-level2" maxLength={80} defaultValue={value('city')} />
          </label>
          <label className="form-label" htmlFor="acc-province">
            {text(language, 'province')}
            <input className="form-control" id="acc-province" name="province" type="text" autoComplete="address-level1" maxLength={80} defaultValue={value('province')} />
          </label>
        </div>
        <label className="form-label" htmlFor="acc-postal">
          {text(language, 'postalCode')}
          <input className="form-control" id="acc-postal" name="postalCode" type="text" autoComplete="postal-code" maxLength={12} defaultValue={value('postalCode')} />
        </label>
      </fieldset>

      <FormMessage state={state} />
      <Button className="store-button min-h-11 rounded-full px-6" type="submit" disabled={pending}>{text(language, pending ? 'saving' : 'save')}</Button>
    </form>
  )
}

export function PreferencesCard() {
  const { language, currency, setLanguage, setCurrency } = useStore()
  return (
    <div className="auth-form">
      <label className="form-label" htmlFor="pref-language">
        {text(language, 'prefLanguage')}
        <select className="form-control" id="pref-language" value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'id')}>
          <option value="en">English</option>
          <option value="id">Bahasa Indonesia</option>
        </select>
      </label>
      <label className="form-label" htmlFor="pref-currency">
        {text(language, 'prefCurrency')}
        <select className="form-control" id="pref-currency" value={currency} onChange={(event) => setCurrency(event.target.value as 'IDR' | 'USD')}>
          <option value="IDR">IDR — Rupiah</option>
          <option value="USD">USD — US dollar</option>
        </select>
      </label>
    </div>
  )
}
