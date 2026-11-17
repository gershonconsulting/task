// Client Platform Matrix: one e-mail per report week (v5.3). Replays 2026-11-16:
// 13:00 UTC relay (health) + 13:14 UTC legacy send with force:true -> now only ONE e-mail.
// No real e-mail is sent. Run: npx tsx scripts/matrix-once-check.ts
import { reportWeek, weekLabel, planSend, postResend, idempotencyKeyFor, isoWeekOf } from '../supabase/functions/client-platform-matrix/week'
import assert from 'node:assert/strict'

async function main() {
  // 1. Stable label/key: every send moment on Mon 2026-11-16 (and later that week) = W46 · 9–15 Nov 2026.
  for (const t of ['2026-11-16T13:00:12Z', '2026-11-16T13:14:11Z', '2026-11-17T09:00:00Z', '2026-11-22T23:59:59Z']) {
    const w = reportWeek(new Date(t))
    assert.equal(w.id, '2026-W46', t); assert.equal(weekLabel(w), 'W46 · 9–15 Nov 2026'); assert.equal(idempotencyKeyFor(w), 'client-matrix-2026-W46')
  }
  assert.equal(reportWeek(new Date('2026-11-23T13:00:00Z')).id, '2026-W47')
  assert.equal(weekLabel(reportWeek(new Date('2026-11-02T13:00:00Z'))), 'W44 · 26 Oct – 1 Nov 2026')
  assert.equal(weekLabel(reportWeek(new Date('2027-01-04T13:00:00Z'))), 'W53 · 28 Dec 2026 – 3 Jan 2027')
  assert.equal(isoWeekOf(new Date('2026-01-01T00:00:00Z')).id, '2026-W01')
  console.log('ok 1 one report week + label + key for relay and legacy')

  // 2. Guard: after the relay sent W46, the 13:14 legacy call with force:true is skipped.
  const week = reportWeek(new Date('2026-11-16T13:14:11Z'))
  const first = planSend({ week, lastSentWeek: '2026-W45' })
  assert.deepEqual(first, { action: 'send', idemKey: 'client-matrix-2026-W46', markWeek: '2026-W46' })
  assert.equal(planSend({ week, force: true, lastSentWeek: '2026-W46' }).action, 'skip')
  assert.equal(planSend({ week, lastSentWeek: '2026-W46' }).action, 'skip')
  assert.deepEqual(planSend({ week, force: '2026-W46', lastSentWeek: '2026-W46' }), { action: 'send', idemKey: null, markWeek: '2026-W46' })
  assert.deepEqual(planSend({ week, testTo: 'x@gershonconsulting.com', lastSentWeek: '2026-W46' }), { action: 'send', idemKey: null, markWeek: null })
  console.log('ok 2 marker + force rules (force:true no longer bypasses)')

  // 3. Resend: 503 then 200 -> one e-mail, same key on both attempts; 409 key reuse -> skipped.
  const keys: (string | null)[] = []
  const seq = [503, 200]
  const f = (async (_u: string, init: RequestInit) => {
    keys.push((init.headers as Record<string, string>)['Idempotency-Key'] ?? null)
    const s = seq[keys.length - 1]
    return new Response(JSON.stringify(s === 200 ? { id: 'm1' } : { message: 'down' }), { status: s })
  }) as unknown as typeof fetch
  const waits: number[] = []
  const r = await postResend('k', { subject: 'S' }, 'client-matrix-2026-W46', { fetchImpl: f, sleep: async (ms) => { waits.push(ms) } })
  assert.equal(r.ok, true); assert.equal(r.attempts, 2); assert.deepEqual(keys, ['client-matrix-2026-W46', 'client-matrix-2026-W46']); assert.deepEqual(waits, [2000])
  const dup = (async () => new Response(JSON.stringify({ name: 'invalid_idempotent_request' }), { status: 409 })) as unknown as typeof fetch
  const d = await postResend('k', { subject: 'S' }, 'client-matrix-2026-W46', { fetchImpl: dup, sleep: async () => {} })
  assert.equal(d.skipped, true); assert.equal(d.attempts, 1)
  const bad = (async () => new Response('{}', { status: 422 })) as unknown as typeof fetch
  assert.equal((await postResend('k', {}, 'x', { fetchImpl: bad, sleep: async () => {} })).attempts, 1)
  console.log('ok 3 retry with same key, 409 = already sent, 4xx not retried')
  console.log('matrix-once-check: 3/3 passed')
}
main().catch(e => { console.log(e); process.exit(1) })
