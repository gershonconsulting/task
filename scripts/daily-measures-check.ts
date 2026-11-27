// Deterministic fixture (v1.3.9): the 2026-11-25 e-mail said "0/6 measures met" for 7+ days.
// Audit: a REAL reading (last write to tasks 2026-11-12, projects 2026-11-09; 316 tasks read).
// The e-mail must now (a) name all 6 measures that are not met, including the unchanged one,
// (b) say when each was last met, and (c) prove the data was read — or flag an empty/failed read.
// Run: npx tsx scripts/daily-measures-check.ts
import { measureHistory, sinceText, dataCheck, markOf, summarize } from '../src/lib/dailyReportSummary'
import { buildEmail, type Check, type DayCounts } from '../src/lib/dailyReportEmail'
import assert from 'node:assert/strict'

const reported = '2026-11-25' // Wednesday
// Rows shaped like production: last task create 11-09, last edit 11-12 (UTC 14:07 = 09:07 ET), last completion 11-12.
const tasks = [
  { status: 'completed', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-11-12T14:07:04Z' },
  { status: 'pending', created_at: '2026-11-09T15:08:52Z', updated_at: '2026-11-09T15:08:52Z' },
  { status: 'pending', created_at: '2026-11-08T10:00:00Z', updated_at: '2026-11-10T10:00:00Z' },
  // After the reported day: must not count as "last" (it belongs to the next report).
  { status: 'completed', created_at: '2026-11-26T15:00:00Z', updated_at: '2026-11-26T15:00:00Z' },
  // 01:30 UTC on 11-13 is still 11-12 in New York.
  { status: 'pending', created_at: '2026-09-01T10:00:00Z', updated_at: '2026-11-13T01:30:00Z' },
]
const projects = [{ created_at: '2026-11-09T15:08:52Z' }, { created_at: '2026-09-25T17:00:00Z' }]

// 1. measureHistory: last ET day each measure was met, never after the reported day.
const h = measureHistory(tasks, projects, reported)
assert.deepEqual(h, { projectsCreated: '2026-11-09', tasksCreated: '2026-11-09', tasksCompleted: '2026-11-12', tasksTouched: '2026-11-12' })
assert.equal(measureHistory([], [], reported).tasksTouched, null)
assert.equal(sinceText('task created', '2026-11-09', reported), 'Last task created: 2026-11-09 (16 day(s) before).')
assert.equal(sinceText('task created', reported, reported), 'Last task created: on the reported day.')
assert.equal(sinceText('task created', null, reported), 'No task created on record.')

// 2. dataCheck: OK with real rows; FAILED when the read errored or came back empty.
const okDc = dataCheck({ tasks: 316, projects: 34, clients: 11, readErrors: [], lastChangeYmd: '2026-11-12' })
assert.equal(okDc.ok, true)
assert.ok(okDc.text.includes('316 tasks, 34 projects and 11 clients') && okDc.text.includes('2026-11-12'))
assert.equal(dataCheck({ tasks: 0, projects: 0, clients: 0, readErrors: [], lastChangeYmd: null }).ok, false)
const errDc = dataCheck({ tasks: 0, projects: 34, clients: 11, readErrors: ['tasks: timeout'], lastChangeYmd: null })
assert.equal(errDc.ok, false)
assert.ok(errDc.text.includes('tasks: timeout') && errDc.text.includes('report fault'))

// 3. The real 11-25 e-mail: 5 ✗ + Completion % unchanged (–) = all 6 named, each with "Last ...".
const checks: Check[] = [
  { label: 'Projects created', v: 0, p: 0, ok: false, why: 'No new project was opened.', href: '#', since: sinceText('project created', h.projectsCreated, reported) },
  { label: 'Tasks created', v: 0, p: 0, ok: false, why: 'No task was added to any project.', href: '#', since: sinceText('task created', h.tasksCreated, reported) },
  { label: 'Tasks completed', v: 0, p: 0, ok: false, why: 'No task was marked done (71 still open).', href: '#', since: sinceText('task completed', h.tasksCompleted, reported) },
  { label: 'Tasks touched', v: 0, p: 0, ok: false, why: 'No task was edited, re-dated or re-assigned.', href: '#', since: sinceText('task edit', h.tasksTouched, reported) },
  { label: 'Completion %', v: 78, p: 78, ok: false, why: 'Overall completion stayed at 78% (245/316).', href: '#', unchangedIsNeutral: true, since: 'It rises only when a task is completed. ' + sinceText('task completed', h.tasksCompleted, reported) },
  { label: 'Overdue tasks', v: 54, p: 54, ok: false, why: 'Still 54 overdue task(s), unchanged since the last report.', href: '#', since: 'Met only at 0: complete or re-date them (oldest due 2026-06-24, 156 d late).' },
]
for (const c of checks) c.mark = markOf(c, false)
const score = checks.filter(c => c.mark === 'ok').length
const unchanged = checks.filter(c => c.mark === 'neutral').length
assert.equal(score, 0)
const summary = summarize({ score, nothingHappened: true, reportedYmd: reported, overdue: 54, unchanged })
const zero: DayCounts = { projectsCreated: 0, tasksCreated: 0, tasksTouched: 0, tasksCompleted: 0, clientsAdded: 0 }
const mk = (dc = okDc) => buildEmail({ base: 'https://task.gershon.ai', yYmd: reported, y: zero, checks, summary, pct: 78, tasksDone: 245, tasksTotal: 316, overdue: 54, overdueTrend: 'unchanged since the last report', activeProjects: 34, clientsTotal: 11, warnings: [], lastChangeText: '13 day(s) before the reported day (2026-11-12)', stuck: [], dataCheck: dc })
const html = mk()
assert.ok(html.includes('What did not move (5 of 6) · 6 of 6 not met'), 'heading names all 6 not met')
for (const c of checks) assert.ok(html.includes('<b>' + c.label + '</b>'), c.label + ' is named in the list')
assert.ok(html.includes('<b>Completion %</b> (unchanged)'), 'unchanged measure listed as unchanged, not as ✗')
assert.ok(html.includes('Last project created: 2026-11-09 (16 day(s) before).'))
assert.ok(html.includes('Last task edit: 2026-11-12 (13 day(s) before).'))
assert.ok(html.includes('Met only at 0'))
assert.ok(html.includes('Data check OK: the report read 316 tasks'))
// Empty/failed read is shown as a red data-check failure, never silently as inactivity.
const bad = mk(errDc)
assert.ok(bad.includes('Data check FAILED') && bad.includes('#8e2318'))
// Weekend: not scored, no data-check line, no list.
const wk = summarize({ score: 0, nothingHappened: true, reportedYmd: '2026-11-22', overdue: 54 })
const wkHtml = buildEmail({ base: '#', yYmd: '2026-11-22', y: zero, checks, summary: wk, pct: 78, tasksDone: 245, tasksTotal: 316, overdue: 54, overdueTrend: '', activeProjects: 34, clientsTotal: 11, warnings: [], lastChangeText: '', stuck: [], dataCheck: okDc })
assert.ok(!wkHtml.includes('Data check') && !wkHtml.includes('What did not move'))

console.log('daily-measures-check: all assertions passed')
