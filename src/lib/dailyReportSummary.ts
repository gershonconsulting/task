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

// A "quiet day": the report is sent on a Saturday/Sunday (America/New_York), or it covers one.
// No activity is expected then, so "nothing happened" must not raise the alarm.
export function isQuietDay(todayYmd: string, reportedYmd: string): boolean {
  return isWeekend(todayYmd) || isWeekend(reportedYmd)
}

export type ReportSummary = {
  score: number          // 0-6, computed once from the checks
  max: number
  alarm: boolean         // nothing happened on a working day
  quietNote: string | null
  subjectTail: string    // appended after the date in the subject
  headerLine: string     // shown in the email header card
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

export function summarize(opts: { score: number; max?: number; nothingHappened: boolean; todayYmd: string; reportedYmd: string; overdue?: number }): ReportSummary {
  const max = opts.max ?? 6
  const quiet = isQuietDay(opts.todayYmd, opts.reportedYmd)
  const alarm = opts.nothingHappened && !quiet
  const overdue = opts.overdue ?? 0
  // The overdue count is part of the headline so it can never read better than the tiles below it.
  const scoreText = 'Progress ' + opts.score + '/' + max + (overdue > 0 ? ' · ' + overdue + ' overdue' : '')
  return {
    score: opts.score,
    max,
    alarm,
    quietNote: opts.nothingHappened && quiet ? 'Quiet weekend day: no activity was expected, so this is not flagged.' : null,
    subjectTail: alarm ? 'No activity · ' + scoreText : scoreText,
    headerLine: alarm ? 'No activity yesterday · ' + scoreText : scoreText,
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
