'use client'

import { useActionState } from 'react'
import { changeUserRoleAction } from '@/src/server/actions/admin'
import { idleState } from '@/src/server/actions/types'
import { ROLE_LABELS, type Role } from '@/src/server/roles'

const MESSAGES: Record<string, string> = {
  role_changed: 'Role updated.',
  role_unchanged: 'No change.',
  role_rejected: 'Rejected by the server (not allowed).',
  forbidden: 'You are not allowed to manage roles.',
  invalid_request: 'Invalid request.',
  not_signed_in: 'Session expired. Log in again.',
  not_configured: 'Server is missing the service role configuration.',
}

export function RoleForm({ targetId, current, options }: { targetId: string; current: Role; options: Role[] }) {
  const [state, action, pending] = useActionState(changeUserRoleAction, idleState)
  return (
    <form className="role-form" action={action}>
      <input type="hidden" name="targetId" value={targetId} />
      <label className="sr-only" htmlFor={`role-${targetId}`}>Role</label>
      <select className="form-control" id={`role-${targetId}`} name="role" defaultValue={current}>
        <option value={current} disabled>{ROLE_LABELS[current]} (current)</option>
        {options.filter((role) => role !== current).map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
      </select>
      <button className="role-save" type="submit" disabled={pending}>{pending ? '…' : 'Apply'}</button>
      {state.code ? <small className={state.status === 'error' ? 'form-error' : 'form-success'} role="status">{MESSAGES[state.code] ?? state.code}</small> : null}
    </form>
  )
}
