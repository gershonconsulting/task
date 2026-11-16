// Resend retry: 429 then 200 = one logical send, same Idempotency-Key; 400 = no retry;
// network error / 5xx retried; final failure after 3 retries.
// Run: npx tsx scripts/resend-retry-check.ts
import { sendResendEmail, RESEND_RETRY_DELAYS_MS } from '../src/lib/resendSend'
import assert from 'node:assert/strict'

type Call = { key: string | null; body: string }
function mockFetch(steps: Array<number | 'network'>) {
  const calls: Call[] = []
  const impl = (async (_url: string, init: RequestInit) => {
    const h = init.headers as Record<string, string>
    calls.push({ key: h['Idempotency-Key'] ?? null, body: String(init.body) })
    const step = steps[Math.min(calls.length - 1, steps.length - 1)]
    if (step === 'network') throw new TypeError('fetch failed')
    const json = step < 300 ? { id: 'email_123' } : { name: step === 429 ? 'rate_limit_exceeded' : 'validation_error', message: 'status ' + step }
    return new Response(JSON.stringify(json), { status: step, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof fetch
  return { calls, impl }
}
const waits: number[] = []
const sleep = async (ms: number) => { waits.push(ms) }
const payload = { from: 'GC Task <reports@gershon.ai>', to: ['test@example.com'], subject: 'S', html: '<p>x</p>' }
const quiet = { warn: console.warn, error: console.error }
console.warn = () => {}; console.error = () => {}

async function main() {
  // 1. 429 then 200 -> delivered once, 2 HTTP calls, same key, same body.
  let m = mockFetch([429, 200]); waits.length = 0
  let r = await sendResendEmail('k', payload, { fetchImpl: m.impl, sleep })
  assert.equal(r.ok, true); assert.equal(r.attempts, 2); assert.equal(r.body.id, 'email_123')
  assert.equal(m.calls.length, 2)
  assert.ok(m.calls[0].key && m.calls[0].key.length > 0, 'Idempotency-Key header is set')
  assert.equal(m.calls[1].key, m.calls[0].key, 'retry reuses the same Idempotency-Key')
  assert.equal(m.calls[1].body, m.calls[0].body)
  assert.deepEqual(waits, [1000])

  // 2. 400 -> no retry.
  m = mockFetch([400, 200]); waits.length = 0
  r = await sendResendEmail('k', payload, { fetchImpl: m.impl, sleep })
  assert.equal(r.ok, false); assert.equal(r.status, 400); assert.equal(m.calls.length, 1); assert.deepEqual(waits, [])

  // 3. network error, 503, then 200 -> retried with the same key.
  m = mockFetch(['network', 503, 200]); waits.length = 0
  r = await sendResendEmail('k', payload, { fetchImpl: m.impl, sleep, idempotencyKey: 'task-daily/2026-11-13' })
  assert.equal(r.ok, true); assert.equal(m.calls.length, 3)
  assert.ok(m.calls.every(c => c.key === 'task-daily/2026-11-13'))
  assert.deepEqual(waits, [1000, 4000])

  // 4. always 500 -> 1 + 3 retries, then a clear final failure.
  m = mockFetch([500]); waits.length = 0
  let logged = ''
  console.error = (s: string) => { logged = s }
  r = await sendResendEmail('k', payload, { fetchImpl: m.impl, sleep, label: 'test' })
  assert.equal(r.ok, false); assert.equal(m.calls.length, 4); assert.equal(r.attempts, 4)
  assert.deepEqual(waits, RESEND_RETRY_DELAYS_MS)
  assert.ok(waits.reduce((a, b) => a + b, 0) <= 15000)
  assert.ok(logged.includes('FINAL FAILURE') && logged.includes(r.idempotencyKey))

  // 5. two logical sends get different keys.
  const a = await sendResendEmail('k', payload, { fetchImpl: mockFetch([200]).impl, sleep })
  const b = await sendResendEmail('k', payload, { fetchImpl: mockFetch([200]).impl, sleep })
  assert.notEqual(a.idempotencyKey, b.idempotencyKey)

  console.warn = quiet.warn; console.error = quiet.error
  console.log('resend-retry-check: 5/5 passed')
}
main().catch(e => { console.warn = quiet.warn; console.error = quiet.error; console.error(e); process.exit(1) })
