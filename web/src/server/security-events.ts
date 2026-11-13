import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { createSupabaseAdminClient } from '@/src/supabase/admin'
import { getAppEnv } from '@/src/server/env'

export type SecurityEventInput = {
  eventType: string
  actorId?: string | null
  endpoint?: string
  method?: string
  status?: number
  classification?: 'normal' | 'suspicious' | 'confirmed_violation' | 'verified_exploitation'
  metadata?: Record<string, unknown>
}

const SENSITIVE_KEY = /pass(word)?|token|secret|key|cookie|authorization|session|jwt/i

function redact(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) out[key] = '[redacted]'
    else if (typeof item === 'string') out[key] = item.slice(0, 300)
    else if (typeof item === 'number' || typeof item === 'boolean' || item === null) out[key] = item
    else out[key] = '[omitted]'
  }
  return out
}

/** One-way hash so events can correlate attempts without storing raw emails / IPs. */
export function hashIdentifier(value: string): string {
  const salt = process.env.SECURITY_IP_HASH_SALT ?? ''
  return createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 32)
}

/**
 * Best-effort structured event write (server-side, service role). It never throws and never blocks the
 * user-facing flow. Phase 3 only records the basics; detection rules/alerts arrive in Phase 5.
 * A single failed login or 403 is recorded as 'normal' telemetry, not as an attack.
 */
export async function logSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    const admin = createSupabaseAdminClient()
    if (!admin) return
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
    await admin.from('security_events').insert({
      actor_id: input.actorId ?? null,
      event_type: input.eventType,
      endpoint: input.endpoint ?? null,
      http_method: input.method ?? null,
      response_status: input.status ?? null,
      source_ip_hash: ip ? hashIdentifier(ip) : null,
      environment: getAppEnv(),
      correlation_id: h.get('x-vercel-id') ?? randomUUID(),
      classification: input.classification ?? 'normal',
      metadata: redact(input.metadata ?? {}),
    })
  } catch {
    // Telemetry failure must not break authentication.
  }
}
