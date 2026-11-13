export const ROLES = ['owner', 'super_admin', 'admin', 'user'] as const
export type Role = (typeof ROLES)[number]

export const STAFF_ROLES: readonly Role[] = ['owner', 'super_admin', 'admin']

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  super_admin: 'Super admin',
  admin: 'Admin',
  user: 'Member',
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role)
}

/** Where a signed-in user lands by default: everyone enters the store home page. Staff reach /admin from the header button. */
export function homeForRole(_role: Role): string {
  return '/home'
}

/**
 * UI hint ONLY (which options to render). The authoritative check is public.change_user_role() in Postgres,
 * which re-validates everything from the database.
 */
export function assignableRoles(actor: Role, target: Role, isSelf: boolean): Role[] {
  if (isSelf || target === 'owner') return []
  if (actor === 'owner') return ['super_admin', 'admin', 'user']
  if (actor === 'super_admin' && (target === 'user' || target === 'admin')) return ['admin', 'user']
  return []
}
