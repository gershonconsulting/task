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
