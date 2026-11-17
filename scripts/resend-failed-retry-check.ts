// v1.3.8: an e-mail Resend ACCEPTS (200 + id) and then marks "failed" is resent exactly once,
// with the deterministic key "<key>:retry1"; delivered/queued/unknown = no resend; 409
// invalid_idempotent_request = already sent (no fallback, no resend). No real e-mail is sent.
// Run: npx tsx scripts/resend-failed-retry-check.ts
import { sendResendEmail, retryFailedSends } from '../src/lib/resendSend'
import assert from 'node:assert/strict'

type Call = { method: string; url: string; key: string | null }
function mock(script: { post: Array<{ status: number; body: object }>; status: Record<string, string | number> }) {
  const calls: Call[] = []
  let posts = 0
  const impl = (async (url: string, init: RequestInit = {}) => {
    const h = (init.headers ?? {}) as Record<string, string>
    const method = init.method ?? 'GET'
    calls.push({ method, url, key: h['Idempotency-Key'] ?? null })
    if (method === 'POST') {
      const s = script.post[Math.min(posts++, script.post.length - 1)]
      return new Response(JSON.stringify(s.body), { status: s.status })
    }
    const id = url.split('/').pop()!
    const st = script.status[id]
    if (typeof st === 'number') return new Response('{}', { status: st })
    return new Response(JSON.stringify({ id, last_event: st }), { status: 200 })
  }) as unknown as typeof fetch
  return { calls, impl }
}
const waits: number[] = []
const sleep = async (ms: number) => { waits.push(ms) }
const payload = { from: 'GC Task <reports@gershon.ai>', to: ['test@example.com'], subject: 'S', html: '<p>x</p>' }
console.warn = () => {}; console.error = () => {}

async function main() {
  // 1. 2026-11-13 replay: accepted, then failed -> exactly one resend with key ":retry1".
  let m = mock({ post: [{ status: 200, body: { id: 'e1' } }, { status: 200, body: { id: 'e2' } }], status: { e1: 'failed', e2: 'delivered' } })
  waits.length = 0
  let first = await sendResendEmail('k', payload, { fetchImpl: m.impl, sleep, idempotencyKey: 'task-daily/2026-11-12/primary' })
  let [r] = await retryFailedSends('k', [{ payload, result: first, label: 'task-daily' }], { fetchImpl: m.impl, sleep })
  const posts = m.calls.filter(c => c.method === 'POST')
  assert.equal(posts.length, 2, 'one original + one resend')
  assert.equal(posts[0].key, 'task-daily/2026-11-12/primary')
  assert.equal(posts[1].key, 'task-daily/2026-11-12/primary:retry1')
  assert.equal(r.ok, true); assert.equal(r.retried, true); assert.equal(r.firstId, 'e1'); assert.equal(r.body.id, 'e2')
  assert.deepEqual(waits, [20000, 30000], 'wait 20 s, then back off 30 s before the resend')
  console.log('ok 1 accepted-then-failed -> one resend, deterministic retry key, backoff 20s+30s')

  // 2. Delivered / queued / unreadable status -> no resend.
  for (const st of ['delivered', 'queued', 'sent', 403] as const) {
    m = mock({ post: [{ status: 200, body: { id: 'e1' } }], status: { e1: st } })
    first = await sendResendEmail('k', payload, { fetchImpl: m.impl, sleep, idempotencyKey: 'x' })
    ;[r] = await retryFailedSends('k', [{ payload, result: first }], { fetchImpl: m.impl, sleep })
    assert.equal(m.calls.filter(c => c.method === 'POST').length, 1, 'no resend for ' + st)
    assert.equal(r.retried, undefined)
  }
  console.log('ok 2 delivered/queued/sent/unreadable -> no resend')

  // 3. The resend itself failing is reported, never retried a third time.
  m = mock({ post: [{ status: 200, body: { id: 'e1' } }, { status: 200, body: { id: 'e2' } }], status: { e1: 'failed', e2: 'failed' } })
  first = await sendResendEmail('k', payload, { fetchImpl: m.impl, sleep, idempotencyKey: 'y' })
  ;[r] = await retryFailedSends('k', [{ payload, result: first }], { fetchImpl: m.impl, sleep })
  assert.equal(m.calls.filter(c => c.method === 'POST').length, 2, 'only ONE retry')
  console.log('ok 3 only one retry')

  // 4. Same-day re-run: 409 invalid_idempotent_request = already sent, no status check, no resend.
  m = mock({ post: [{ status: 409, body: { name: 'invalid_idempotent_request', message: 'key reused' } }], status: {} })
  first = await sendResendEmail('k', payload, { fetchImpl: m.impl, sleep, idempotencyKey: 'task-daily/2026-11-12/primary' })
  assert.equal(first.duplicate, true); assert.equal(first.attempts, 1)
  ;[r] = await retryFailedSends('k', [{ payload, result: first }], { fetchImpl: m.impl, sleep })
  assert.equal(m.calls.length, 1)
  console.log('ok 4 409 invalid_idempotent_request -> already sent, nothing else')

  // 5. Batch (Friday My Tasks): 3 members, one failed -> one shared wait, one resend.
  m = mock({ post: [{ status: 200, body: { id: 'a' } }, { status: 200, body: { id: 'b' } }, { status: 200, body: { id: 'c' } }, { status: 200, body: { id: 'b2' } }], status: { a: 'delivered', b: 'failed', c: 'delivered', b2: 'sent' } })
  waits.length = 0
  const items = []
  for (const who of ['a', 'b', 'c']) items.push({ payload, result: await sendResendEmail('k', payload, { fetchImpl: m.impl, sleep, idempotencyKey: 'task-weekly/2026-11-13/' + who }) })
  const outs = await retryFailedSends('k', items, { fetchImpl: m.impl, sleep })
  assert.equal(m.calls.filter(c => c.method === 'POST').length, 4)
  assert.equal(m.calls.filter(c => c.method === 'POST')[3].key, 'task-weekly/2026-11-13/b:retry1')
  assert.deepEqual(outs.map(o => !!o.retried), [false, true, false])
  assert.deepEqual(waits, [20000, 30000])
  console.log('ok 5 batch: one wait, only the failed member resent')
  console.log('resend-failed-retry-check: 5/5 passed')
}
main().catch(e => { console.log(e); process.exit(1) })
