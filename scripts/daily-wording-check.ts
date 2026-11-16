// Deterministic fixture: weekend wording, banner title and header must follow the real counts.
// Run: npx tsx scripts/daily-wording-check.ts
import { reportDays, isQuietDay, summarize } from '../src/lib/dailyReportSummary'
import { buildEmail, type Check, type DayCounts } from '../src/lib/dailyReportEmail'
import assert from 'node:assert/strict'

const zero: DayCounts = { projectsCreated: 0, tasksCreated: 0, tasksTouched: 0, tasksCompleted: 0, clientsAdded: 0 }
const checks: Check[] = [
  { label: 'Projects created', v: 0, p: 0, ok: false, why: 'No new project was opened.', href: '#' },
  { label: 'Tasks created', v: 0, p: 0, ok: false, why: 'No task was added to any project.', href: '#' },
  { label: 'Tasks completed', v: 0, p: 0, ok: false, why: 'No task was marked done.', href: '#' },
  { label: 'Tasks touched', v: 0, p: 0, ok: false, why: 'No task was edited.', href: '#' },
  { label: 'Completion %', v: 21, p: 20, ok: true, why: '', href: '#' },
  { label: 'Overdue tasks', v: 50, p: 50, ok: false, why: 'Still 50 overdue task(s).', href: '#' },
]
const render = (yYmd: string, y: DayCounts, nothingHappened: boolean, warnings: string[] = []) => {
  const summary = summarize({ score: 1, nothingHappened, reportedYmd: yYmd, overdue: 50 })
  return { summary, html: buildEmail({ base: 'https://task.gershon.ai', yYmd, y, checks, summary, pct: 21, tasksDone: 30, tasksTotal: 140, overdue: 50, overdueTrend: 'unchanged since the last report', activeProjects: 12, clientsTotal: 40, warnings, lastChangeText: '2 day(s) before the reported day (2026-11-11)', stuck: [] }) }
}

// 1. Saturday's 07:00 ET run (11:00 UTC) reports on Friday 13 Nov 2026: a working day.
const sat = reportDays(new Date('2026-11-14T11:00:00Z'))
assert.equal(sat.todayYmd, '2026-11-14')
assert.equal(sat.reportedYmd, '2026-11-13')
assert.equal(isQuietDay(sat.reportedYmd), false, 'Friday 13 Nov is not a weekend day')
const fri = render(sat.reportedYmd, zero, true, ['Nothing moved on Friday, November 13, 2026.'])
assert.equal(fri.summary.alarm, true, 'empty Friday must alarm')
assert.equal(fri.summary.quietNote, null)
assert.ok(!fri.html.includes('Quiet weekend'), 'no weekend wording on a Friday report')
assert.ok(fri.html.includes('Friday, November 13, 2026'))

// 2. America/New_York date, not UTC: Friday 9pm ET is already Saturday in UTC.
assert.equal(reportDays(new Date('2026-11-14T02:00:00Z')).todayYmd, '2026-11-13')

// 3. Sunday's run reports on Saturday 14 Nov: quiet, weekend wording, no alarm, honest headline.
const sun = reportDays(new Date('2026-11-15T11:00:00Z'))
assert.equal(sun.reportedYmd, '2026-11-14')
const satRep = render(sun.reportedYmd, zero, true)
assert.equal(satRep.summary.alarm, false)
assert.ok(satRep.html.includes('Quiet weekend day (Saturday)'))
// Monday's run reports on Sunday: also quiet.
assert.equal(isQuietDay(reportDays(new Date('2026-11-16T11:00:00Z')).reportedYmd), true)

// 4. 0 tasks touched: never "Work moved"; "No activity" is gone and the score is labelled.
for (const r of [fri, satRep]) {
  assert.ok(!r.html.includes('Work moved'), '"Work moved" with 0 touched')
  assert.ok(!r.html.includes('No activity'), '"No activity" next to a score')
}
assert.ok(fri.summary.headerLine.startsWith('No task changes yesterday · 1/6 measures met'))
// v1.3.7: a weekend reported day is not scored (see scripts/daily-weekend-check.ts).
assert.ok(satRep.summary.headerLine.startsWith('No task changes yesterday · Weekend — not scored'))
assert.ok(satRep.html.includes('No task changes yesterday, 50 task(s) still overdue'))
assert.ok(satRep.html.includes('0 task(s) touched'))

// 5. Real activity keeps "Work moved".
const busy = render('2026-11-12', { ...zero, tasksTouched: 4, tasksCompleted: 4 }, false)
assert.ok(busy.html.includes('Work moved, but 50 task(s) are still overdue'))
assert.ok(busy.html.includes('4 task(s) touched, 4 completed'))
assert.equal(busy.summary.headerLine, '1/6 measures met · 50 overdue')

console.log('daily-wording-check: all assertions passed')
