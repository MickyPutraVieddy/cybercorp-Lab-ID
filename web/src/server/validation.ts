const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function normalizeEmail(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email)
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function validateFullName(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null
  const name = value.replace(/\s+/g, ' ').trim()
  return name.length >= 2 && name.length <= 120 ? name : null
}

/** Returns an error code or null. Keep in sync with Supabase Auth -> Password settings (min length). */
export function passwordProblem(password: string): 'password_short' | 'password_long' | 'password_weak' | null {
  if (password.length < 10) return 'password_short'
  if (new TextEncoder().encode(password).length > 72) return 'password_long'
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'password_weak'
  return null
}

/** Open-redirect protection: only same-site relative paths are accepted. */
export function sanitizeNext(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f]/.test(value)) return fallback
  return value
}

const USERNAME_RE = /^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$/
const RESERVED_USERNAMES = new Set(['admin', 'administrator', 'owner', 'superadmin', 'super_admin', 'root', 'support', 'staff', 'system', 'moderator', 'security', 'letstestit'])

type Parsed = { ok: true; value: string | null } | { ok: false }

/** Empty -> null (clears the username). Lower-cased, 3-24 chars, no reserved/impersonating names. */
export function parseUsername(value: FormDataEntryValue | null): Parsed {
  if (typeof value !== 'string') return { ok: false }
  const v = value.trim().toLowerCase()
  if (v === '') return { ok: true, value: null }
  if (!USERNAME_RE.test(v) || /[._]{2}/.test(v) || RESERVED_USERNAMES.has(v)) return { ok: false }
  return { ok: true, value: v }
}

export function parsePhone(value: FormDataEntryValue | null): Parsed {
  if (typeof value !== 'string') return { ok: false }
  const v = value.trim()
  if (v === '') return { ok: true, value: null }
  return /^\+?[0-9][0-9 ()-]{5,19}$/.test(v) ? { ok: true, value: v } : { ok: false }
}

/** Optional single-line text: collapses whitespace, rejects control characters and over-long values. */
export function parseOptionalText(value: FormDataEntryValue | null, max: number): Parsed {
  if (typeof value !== 'string') return { ok: false }
  if (/[\u0000-\u001f\u007f]/.test(value)) return { ok: false }
  const v = value.replace(/\s+/g, ' ').trim()
  if (v === '') return { ok: true, value: null }
  return v.length <= max ? { ok: true, value: v } : { ok: false }
}
