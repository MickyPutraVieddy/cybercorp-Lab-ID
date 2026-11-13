export type FormState = {
  status: 'idle' | 'error' | 'success'
  /** Message code; the client maps it to EN/ID text. */
  code?: string
  /** Non-sensitive values to re-populate the form (never passwords). */
  fields?: Record<string, string>
}

export const idleState: FormState = { status: 'idle' }
