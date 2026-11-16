// Pure helpers for the daily report email, kept out of the route file so subject, header and
// body are all derived from the same values (and so they can be tested without Next/Cloudflare).

// 0 = Sunday ... 6 = Saturday, for a YYYY-MM-DD calendar date.
export function weekdayOf(ymd: string): number {
  return new Date(ymd + 'T12:00:00Z').getUTCDay()
}

export function isWeekend(ymd: string): boolean {
  const w = weekdayOf(ymd)
  return w === 0 || w === 6
}

export const REPORT_TZ = 'America/New_York'

// YYYY-MM-DD of an instant in America/New_York (never the UTC date: 9pm ET Friday is
// already Saturday in UTC).
export function nyYmd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: REPORT_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// The days a run at `now` talks about, all as America/New_York calendar dates:
// today (send day), reported (= yesterday, the report period) and the day before (comparison).
export function reportDays(now: Date): { todayYmd: string; reportedYmd: string; prevYmd: string } {
  const todayYmd = nyYmd(now)
  return { todayYmd, reportedYmd: addDaysYmd(todayYmd, -1), prevYmd: addDaysYmd(todayYmd, -2) }
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// A "quiet day": the REPORTED day (America/New_York) is a Saturday or Sunday. Only then is
// "no activity" expected. The send day does not matter: Saturday's e-mail reports on Friday,
// a working day (this used to call Friday 13 Nov 2026 a "quiet weekend day").
export function isQuietDay(reportedYmd: string): boolean {
  return isWeekend(reportedYmd)
}

// Mark for one of the 6 measures: ✓ met, ✗ not met, – neutral (not scored).
export type Mark = 'ok' | 'fail' | 'neutral'

// One rule for every measure's mark:
//  - weekend (reported ET day is Sat/Sun): the 6 weekday measures are not scored, all neutral;
//  - met: ✓;
//  - a level measure (e.g. Completion %) whose value did not change ("78 → 78"): neutral –, not ✗;
//  - otherwise ✗. Daily counts (0 created) and overdue (any > 0) keep their own ✗ rule.
export function markOf(c: { v: number; p: number; ok: boolean; unchangedIsNeutral?: boolean }, weekend: boolean): Mark {
  if (weekend) return 'neutral'
  if (c.ok) return 'ok'
  if (c.unchangedIsNeutral && c.v === c.p) return 'neutral'
  return 'fail'
}

export type ReportSummary = {
  score: number          // 0-6, computed once from the checks
  max: number
  scored: boolean        // false on weekend days: no score is shown anywhere
  scoreLine: string      // the score as shown in the subject, header and body
  alarm: boolean         // nothing happened on a working day
  nothingHappened: boolean
  quietNote: string | null
  subjectTail: string    // appended after the date in the subject
  headerLine: string     // shown in the email header card
  bannerTitle: string    // first line of the banner under the header; follows the real counts
}

// The "Overdue tasks" measure. Any overdue task is a ✗ (red): "43 → 43" is not progress.
// ✓ only when overdue is 0 (whether it was already 0 or just came down to 0).
export function overdueCheck(overdue: number, prevOverdue: number | null): { ok: boolean; why: string; trend: string } {
  const ok = overdue === 0
  const trend = prevOverdue === null ? ''
    : overdue > prevOverdue ? 'up from ' + prevOverdue
    : overdue < prevOverdue ? 'down from ' + prevOverdue
    : 'unchanged since the last report'
  const why = ok ? ''
    : prevOverdue === null ? overdue + ' task(s) are overdue.'
    : overdue > prevOverdue ? 'Overdue tasks went up to ' + overdue + ' (from ' + prevOverdue + ').'
    : overdue < prevOverdue ? 'Overdue tasks went down to ' + overdue + ' (from ' + prevOverdue + '), but not to 0 yet.'
    : 'Still ' + overdue + ' overdue task(s), unchanged since the last report.'
  return { ok, why, trend }
}

export const WEEKEND_NOT_SCORED = 'Weekend — not scored'

// `todayYmd` is kept for callers but no longer decides anything: only the reported day does.
// `unchanged` = measures marked neutral because their value did not change (weekday only).
export function summarize(opts: { score: number; max?: number; nothingHappened: boolean; todayYmd?: string; reportedYmd: string; overdue?: number; unchanged?: number }): ReportSummary {
  const max = opts.max ?? 6
  const quiet = isQuietDay(opts.reportedYmd)
  const alarm = opts.nothingHappened && !quiet
  const overdue = opts.overdue ?? 0
  const unchanged = opts.unchanged ?? 0
  // The score counts measures met (of 6), it is not an activity count: label it as such so
  // "No task changes" next to it does not read as a contradiction. On a weekend day the 6
  // weekday measures are not scored at all, so subject, header and body all say so (no "0/6").
  const scoreLine = quiet ? WEEKEND_NOT_SCORED
    : opts.score + '/' + max + ' measures met' + (unchanged > 0 ? ' · ' + unchanged + ' unchanged' : '')
  // The overdue count is part of the headline so it can never read better than the tiles below it.
  const scoreText = scoreLine + (overdue > 0 ? ' · ' + overdue + ' overdue' : '')
  const overdueTail = overdue > 0 ? ', ' + overdue + ' task(s) still overdue' : ''
  const day = WEEKDAYS[weekdayOf(opts.reportedYmd)]
  return {
    score: opts.score,
    max,
    scored: !quiet,
    scoreLine,
    alarm,
    nothingHappened: opts.nothingHappened,
    quietNote: !quiet ? null
      : opts.nothingHappened ? 'Quiet weekend day (' + day + '): no activity was expected, so this is not flagged and the 6 weekday measures are not scored.'
      : 'Weekend day (' + day + '): activity is shown below, but the 6 weekday measures are not scored.',
    subjectTail: opts.nothingHappened ? 'No task changes · ' + scoreText : scoreText,
    headerLine: opts.nothingHappened ? 'No task changes yesterday · ' + scoreText : scoreText,
    // "Work moved" only when something was actually created/touched on the reported day.
    bannerTitle: opts.nothingHappened ? 'No task changes yesterday' + overdueTail
      : overdue > 0 ? (quiet ? 'Work moved; ' + overdue + ' task(s) still overdue' : 'Work moved, but ' + overdue + ' task(s) are still overdue')
      : 'The system did its job',
  }
}

// Last change of any kind, measured from the REPORTED day so it can never contradict the
// activity section. A change made after the reported day (e.g. earlier today, when the job ran
// late) is flagged separately instead of making "last change" read "0 days ago".
export type LastChange = { lastYmd: string | null; daysBeforeReported: number | null; laterChanges: boolean; text: string }
export function lastChange(stampYmds: string[], reportedYmd: string): LastChange {
  const upTo = stampYmds.filter(s => s <= reportedYmd).sort()
  const lastYmd = upTo.length ? upTo[upTo.length - 1] : null
  const laterChanges = stampYmds.some(s => s > reportedYmd)
  const days = lastYmd ? Math.round((Date.parse(reportedYmd + 'T12:00:00Z') - Date.parse(lastYmd + 'T12:00:00Z')) / 86400000) : null
  const base = lastYmd === null ? 'never'
    : days === 0 ? 'on the reported day'
    : days + ' day(s) before the reported day (' + lastYmd + ')'
  return { lastYmd, daysBeforeReported: days, laterChanges, text: base + (laterChanges ? '; newer changes exist since (they appear in the next report)' : '') }
}

// Group assignees canonically for display: a single-word name ("Olivier") that is the first word
// of exactly one longer known name ("Olivier Attia") is shown as the longer name.
// Nicknames that are not a prefix ("Nicky" vs "Nicolette Jones") cannot be resolved here.
export function canonicalOwner(name: string | null, known: Iterable<string | null>): string | null {
  if (!name) return name
  const n = name.trim()
  if (n.includes(' ')) return n
  const longer = new Set<string>()
  for (const k of known) {
    const kk = (k ?? '').trim()
    if (kk.includes(' ') && kk.split(/\s+/)[0].toLowerCase() === n.toLowerCase()) longer.add(kk)
  }
  return longer.size === 1 ? [...longer][0] : n
}
