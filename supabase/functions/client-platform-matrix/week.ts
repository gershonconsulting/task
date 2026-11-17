// Pure helpers for the client-platform-matrix edge function (no Deno globals, so the Node
// check scripts/matrix-once-check.ts can import this file directly).
//
// v5.3 (2026-11-17): once per ISO week, for real.
// 2026-11-16 report@ got TWO matrix e-mails:
//   13:00:12 UTC "Client Platform Matrix · W46 · 9–15 Nov 2026"  (GC Health relay, pg_cron -> health -> this function)
//   13:14:11 UTC "Client Platform Matrix · week of Nov 16, 2026"  (legacy self-built send, a direct pg_net call
//            with force:true, which skipped the Resend Idempotency-Key on purpose)
// The two paths also named the week differently (health: the REPORTED week W46; legacy: "week of" the send
// Monday) and the key used the SEND week (W47). Now both paths use ONE report week = the ISO week that ended
// before the send (Monday 2026-11-16 -> 2026-W46), one label "W46 · 9–15 Nov 2026", one Resend key
// "client-matrix-2026-W46", and a durable marker so a re-run later in the week (Resend keeps keys 24 h only)
// is skipped too. force:true no longer bypasses the guard: a deliberate second send needs force:"2026-W46".

export type IsoWeek = { year: number; week: number; id: string; monday: Date; sunday: Date }

const MS_DAY = 86400000

export function isoWeekOf(d: Date): IsoWeek {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  const monday = new Date(t.getTime() - (day - 1) * MS_DAY)
  t.setUTCDate(t.getUTCDate() + 4 - day) // Thursday decides the ISO year
  const year = t.getUTCFullYear()
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / MS_DAY + 1) / 7)
  return { year, week, id: `${year}-W${String(week).padStart(2, "0")}`, monday, sunday: new Date(monday.getTime() + 6 * MS_DAY) }
}

/** The week the Monday report is about: the ISO week that ended before `now` (UTC). */
export function reportWeek(now: Date = new Date()): IsoWeek {
  return isoWeekOf(new Date(now.getTime() - 7 * MS_DAY))
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "W46 · 9–15 Nov 2026" (same format health.gershon.ai uses in its subject). */
export function weekLabel(w: IsoWeek): string {
  const a = w.monday, b = w.sunday
  const range = a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MON[b.getUTCMonth()]} ${b.getUTCFullYear()}`
    : a.getUTCFullYear() === b.getUTCFullYear()
      ? `${a.getUTCDate()} ${MON[a.getUTCMonth()]} – ${b.getUTCDate()} ${MON[b.getUTCMonth()]} ${b.getUTCFullYear()}`
      : `${a.getUTCDate()} ${MON[a.getUTCMonth()]} ${a.getUTCFullYear()} – ${b.getUTCDate()} ${MON[b.getUTCMonth()]} ${b.getUTCFullYear()}`
  return `W${String(w.week).padStart(2, "0")} · ${range}`
}

export const idempotencyKeyFor = (w: IsoWeek) => `client-matrix-${w.id}`

export type SendPlan =
  | { action: "send"; idemKey: string | null; markWeek: string | null }
  | { action: "skip"; reason: string }

/**
 * Decide what a send request may do.
 * - testTo: always allowed, no key, no marker (tests stay repeatable, one internal address).
 * - force === the report week id ("2026-W46"): deliberate re-send, no key, marker kept.
 * - otherwise: skip when the marker already holds this week; else send with the weekly key.
 */
export function planSend(opts: { week: IsoWeek; testTo?: unknown; force?: unknown; lastSentWeek: string | null }): SendPlan {
  if (opts.testTo) return { action: "send", idemKey: null, markWeek: null }
  if (typeof opts.force === "string" && opts.force === opts.week.id) return { action: "send", idemKey: null, markWeek: opts.week.id }
  if (opts.lastSentWeek === opts.week.id) {
    return { action: "skip", reason: `already sent for ${opts.week.id}; pass force:"${opts.week.id}" to send again` }
  }
  return { action: "send", idemKey: idempotencyKeyFor(opts.week), markWeek: opts.week.id }
}

export type ResendOutcome = { ok: boolean; skipped?: boolean; status: number; attempts: number; body: Record<string, unknown>; error?: string }

/**
 * POST to Resend with up to `delays.length` retries on network error / 429 / 5xx /
 * 409 concurrent_idempotent_requests. Every attempt carries the SAME Idempotency-Key.
 * 409 invalid_idempotent_request (key already used this window with another body) = skipped.
 */
export async function postResend(
  apiKey: string,
  payload: Record<string, unknown>,
  idemKey: string | null,
  opts: { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void>; delays?: number[] } = {},
): Promise<ResendOutcome> {
  const doFetch = opts.fetchImpl ?? fetch
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const delays = opts.delays ?? [2000, 8000]
  let last: ResendOutcome = { ok: false, status: 0, attempts: 0, body: {} }
  for (let attempt = 1; attempt <= delays.length + 1; attempt++) {
    try {
      const r = await doFetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(idemKey ? { "Idempotency-Key": idemKey } : {}) },
        body: JSON.stringify(payload),
      })
      const body = (await r.json().catch(() => ({}))) as Record<string, unknown>
      last = { ok: r.ok, status: r.status, attempts: attempt, body, error: r.ok ? undefined : String(body?.message ?? r.status) }
    } catch (e) {
      last = { ok: false, status: 0, attempts: attempt, body: {}, error: "network: " + (e instanceof Error ? e.message : String(e)) }
    }
    if (last.ok) return last
    if (last.status === 409 && idemKey && last.body?.name !== "concurrent_idempotent_requests") return { ...last, skipped: true }
    const transient = last.status === 0 || last.status === 429 || last.status >= 500 || (last.status === 409 && last.body?.name === "concurrent_idempotent_requests")
    if (!transient || attempt > delays.length) break
    await sleep(delays[attempt - 1])
  }
  return last
}
