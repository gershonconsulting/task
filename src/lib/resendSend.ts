// One Resend sender for every Task e-mail (daily report, Friday reports, invites).
//
// v1.3.6 (2026-11-16): on 2026-11-13 18:20-21:54 UTC Resend failed transiently and the
// Task daily report was never retried. Now:
//   - transient failures (network error / timeout, HTTP 429, HTTP 5xx, and Resend's
//     409 concurrent_idempotent_requests) are retried up to 3 times, after 1s, 4s, 10s
//     (Retry-After is honoured up to 10s). Worst case ~4 x 10s timeout + 15s wait < 60s.
//   - every attempt of one logical send carries the SAME Idempotency-Key header, so a
//     retry after a request that did reach Resend can never deliver the e-mail twice.
//   - other 4xx (bad payload, unverified sender, ...) are NOT retried.
//   - the final failure is logged once, clearly, with the label, status and key.
// No API key, sender or recipient is chosen here: callers pass them exactly as before.

export const RESEND_URL = 'https://api.resend.com/emails'
export const RESEND_RETRY_DELAYS_MS = [1000, 4000, 10000]
const ATTEMPT_TIMEOUT_MS = 10000

export type ResendPayload = {
  from: string
  to: string[]
  subject: string
  html: string
  reply_to?: string
  [k: string]: unknown
}

export type ResendResult = {
  ok: boolean
  status: number            // 0 = network error / timeout
  body: { id?: string; message?: string; name?: string; [k: string]: unknown }
  attempts: number
  idempotencyKey: string
  error?: string
}

export type ResendOptions = {
  /** Stable key for this logical e-mail; a fresh UUID is used when omitted. */
  idempotencyKey?: string
  /** Short name for logs, e.g. 'task-daily'. */
  label?: string
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  delaysMs?: number[]
}

const defaultSleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export function isTransientStatus(status: number, body?: { name?: string }): boolean {
  if (status === 0 || status === 429 || status >= 500) return true
  return status === 409 && body?.name === 'concurrent_idempotent_requests'
}

function retryAfterMs(res: Response | null): number | null {
  const v = res?.headers?.get?.('retry-after')
  if (!v) return null
  const s = Number(v)
  return Number.isFinite(s) && s >= 0 ? Math.min(s * 1000, 10000) : null
}

export async function sendResendEmail(apiKey: string, payload: ResendPayload, opts: ResendOptions = {}): Promise<ResendResult> {
  const doFetch = opts.fetchImpl ?? fetch
  const sleep = opts.sleep ?? defaultSleep
  const delays = opts.delaysMs ?? RESEND_RETRY_DELAYS_MS
  const idempotencyKey = (opts.idempotencyKey ?? crypto.randomUUID()).slice(0, 256)
  const label = opts.label ?? 'resend'
  const init: RequestInit = {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  }

  let last: ResendResult = { ok: false, status: 0, body: {}, attempts: 0, idempotencyKey }
  for (let attempt = 1; attempt <= delays.length + 1; attempt++) {
    let res: Response | null = null
    try {
      const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) : undefined
      res = await doFetch(RESEND_URL, signal ? { ...init, signal } : init)
      const body = (await res.json().catch(() => ({}))) as ResendResult['body']
      last = { ok: res.ok, status: res.status, body, attempts: attempt, idempotencyKey, error: res.ok ? undefined : String(body?.message ?? res.status) }
    } catch (e) {
      last = { ok: false, status: 0, body: {}, attempts: attempt, idempotencyKey, error: 'network: ' + (e instanceof Error ? e.message : String(e)) }
    }
    if (last.ok) {
      if (attempt > 1) console.warn(`[resend] ${label}: delivered on attempt ${attempt} (idempotency ${idempotencyKey})`)
      return last
    }
    if (!isTransientStatus(last.status, last.body) || attempt > delays.length) break
    const wait = Math.max(delays[attempt - 1], retryAfterMs(res) ?? 0)
    console.warn(`[resend] ${label}: attempt ${attempt} failed (${last.status || 'network'}: ${last.error}); retrying in ${wait}ms`)
    await sleep(wait)
  }
  console.error(`[resend] ${label}: FINAL FAILURE after ${last.attempts} attempt(s) - status ${last.status || 'network'} - ${last.error} - subject "${payload.subject}" - idempotency ${idempotencyKey}`)
  return last
}
