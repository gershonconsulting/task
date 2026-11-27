// Deterministic fixture (v1.3.7): weekend days are not scored, an unchanged value is neutral (–)
// not ✗, and subject / header / body never disagree.
// Run: npx tsx scripts/daily-weekend-check.ts
import { reportDays, isQuietDay, summarize, markOf, WEEKEND_NOT_SCORED } from '../src/lib/dailyReportSummary'
import { buildEmail, type Check, type DayCounts } from '../src/lib/dailyReportEmail'
import assert from 'node:assert/strict'

const RED = '#c0392b'
const zero: DayCounts = { projectsCreated: 0, tasksCreated: 0, tasksTouched: 0, tasksCompleted: 0, clientsAdded: 0 }
// Real shape of the audited e-mail: nothing moved, Completion % 78 -> 78, overdue flat.
const mkChecks = (overdue: number, prevOverdue: number): Check[] => [
  { label: 'Projects created', v: 0, p: 0, ok: false, why: 'No new project was opened.', href: '#' },
  { label: 'Tasks created', v: 0, p: 0, ok: false, why: 'No task was added to any project.', href: '#' },
  { label: 'Tasks completed', v: 0, p: 0, ok: false, why: 'No task was marked done.', href: '#' },
  { label: 'Tasks touched', v: 0, p: 0, ok: false, why: 'No task was edited.', href: '#' },
  { label: 'Completion %', v: 78, p: 78, ok: false, why: 'Overall completion stayed at 78%.', href: '#', unchangedIsNeutral: true },
  { label: 'Overdue tasks', v: overdue, p: prevOverdue, ok: overdue === 0, why: 'Still ' + overdue + ' overdue task(s).', href: '#' },
]
const run = (reportedYmd: string, overdue: number, y: DayCounts = zero) => {
  const weekend = isQuietDay(reportedYmd)
  const checks = mkChecks(overdue, overdue)
  for (const c of checks) c.mark = markOf(c, weekend)
  const score = checks.filter(c => c.mark === 'ok').length
  const unchanged = weekend ? 0 : checks.filter(c => c.mark === 'neutral').length
  const nothingHappened = y.projectsCreated + y.tasksCreated + y.tasksTouched + y.clientsAdded === 0
  const summary = summarize({ score, nothingHappened, reportedYmd, overdue, unchanged })
  const html = buildEmail({ base: 'https://task.gershon.ai', yYmd: reportedYmd, y, checks, summary, pct: 78, tasksDone: 78, tasksTotal: 100, overdue, overdueTrend: overdue ? 'unchanged since the last report' : '', activeProjects: 12, clientsTotal: 40, warnings: [], lastChangeText: '1 day(s) before the reported day', stuck: overdue ? [{ name: 'T', owner: 'A', due: '2026-11-01', daysLate: 13, project: 'P', href: '#' }] : [] })
  return { checks, summary, html, subject: 'Task — Daily report — ' + summary.subjectTail }
}

// 1. markOf: unchanged level value is neutral, not ✗; daily counts at 0 stay ✗ on weekdays.
assert.equal(markOf({ v: 78, p: 78, ok: false, unchangedIsNeutral: true }, false), 'neutral')
assert.equal(markOf({ v: 77, p: 78, ok: false, unchangedIsNeutral: true }, false), 'fail')
assert.equal(markOf({ v: 79, p: 78, ok: true, unchangedIsNeutral: true }, false), 'ok')
assert.equal(markOf({ v: 0, p: 0, ok: false }, false), 'fail')
assert.equal(markOf({ v: 0, p: 0, ok: false }, true), 'neutral')
assert.equal(markOf({ v: 3, p: 0, ok: true }, true), 'neutral', 'weekend: nothing is scored, not even a ✓')

// 2. Weekend day (Sunday's 07:00 ET run reports on Saturday 14 Nov 2026), no overdue.
assert.equal(reportDays(new Date('2026-11-15T12:00:00Z')).reportedYmd, '2026-11-14')
const sat = run('2026-11-14', 0)
assert.equal(sat.summary.scored, false)
assert.equal(sat.summary.alarm, false)
assert.ok(!/\d\/6/.test(sat.subject), 'no x/6 score in a weekend subject: ' + sat.subject)
assert.ok(sat.subject.includes(WEEKEND_NOT_SCORED))
assert.ok(sat.summary.headerLine.includes(WEEKEND_NOT_SCORED))
assert.ok(!sat.html.includes('measures met'), 'no score in a weekend body')
assert.ok(!sat.html.includes('&#10007;'), 'no ✗ on a weekend')
assert.ok(!sat.html.includes(RED), 'no red on a weekend')
assert.ok(!sat.html.includes('What did not move'))
assert.ok(sat.html.includes('&ndash;'))
assert.ok(sat.html.includes('not flagged'), 'body says not flagged, and subject/header agree (not scored)')
// Weekend with overdue tasks: shown, but neutrally (grey, no ✗, no red).
const satOd = run('2026-11-14', 43)
assert.ok(!satOd.html.includes(RED), 'no red on a weekend, even with overdue tasks')
assert.ok(!satOd.html.includes('&#10007;'))
assert.ok(satOd.html.includes('43 overdue task(s)'))
assert.equal(satOd.summary.subjectTail, 'No task changes · ' + WEEKEND_NOT_SCORED + ' · 43 overdue')
// Sunday reported day (Monday's run) is a weekend day too; activity on it is shown but not scored.
const sun = run('2026-11-15', 0, { ...zero, tasksTouched: 2 })
assert.equal(sun.summary.scored, false)
assert.ok(sun.html.includes('2 task(s) touched'))
assert.ok(sun.html.includes('Weekend day (Sunday)'))
assert.ok(!sun.html.includes(RED))

// 3. Weekday (Friday 13 Nov, reported by Saturday's run): still scored, unchanged 78 -> 78 is –.
const fri = run('2026-11-13', 43)
assert.equal(fri.summary.scored, true)
const comp = fri.checks.find(c => c.label === 'Completion %')!
assert.equal(comp.mark, 'neutral', 'Completion % 78 -> 78 is neutral, not ✗')
assert.equal(fri.summary.scoreLine, '0/6 measures met · 1 unchanged')
assert.equal(fri.summary.subjectTail, 'No task changes · 0/6 measures met · 1 unchanged · 43 overdue')
assert.ok(fri.html.includes('Progress score: 0/6 measures met · 1 unchanged'), 'body heading = subject score')
assert.ok(fri.html.includes('What did not move (5 of 6)'), 'unchanged measure is not listed as a failure')
assert.ok(!fri.html.includes('<b>Completion %</b> —'), 'Completion % not in the ✗ list')
assert.ok(fri.html.includes('<b>Completion %</b> (unchanged)'), 'v1.3.9: but named as unchanged, so all 6 not-met measures appear')
assert.ok(!fri.html.includes('not flagged'), 'a scored weekday never says "not flagged"')
assert.equal((fri.html.match(/&#10007;/g) || []).length, 5 + 1, '5 ✗ in the table + the overdue tile')

console.log('daily-weekend-check: all assertions passed')
