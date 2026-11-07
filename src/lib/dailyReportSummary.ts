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

export function summarize(opts: { score: number; max?: number; nothingHappened: boolean; todayYmd: string; reportedYmd: string }): ReportSummary {
  const max = opts.max ?? 6
  const quiet = isQuietDay(opts.todayYmd, opts.reportedYmd)
  const alarm = opts.nothingHappened && !quiet
  const scoreText = 'Progress ' + opts.score + '/' + max
  return {
    score: opts.score,
    max,
    alarm,
    quietNote: opts.nothingHappened && quiet ? 'Quiet weekend day: no activity was expected, so this is not flagged.' : null,
    subjectTail: alarm ? 'No activity · ' + scoreText : scoreText,
    headerLine: alarm ? 'No activity yesterday · ' + scoreText : scoreText,
  }
}
