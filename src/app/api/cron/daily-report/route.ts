export const runtime = 'edge'

import { siteUrl } from '@/lib/site'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { summarize, overdueCheck, lastChange, canonicalOwner } from '@/lib/dailyReportSummary'
import { buildEmail, esc, longDate, type Check, type DayCounts, type Snapshot, type StuckTask } from '@/lib/dailyReportEmail'

// Daily "what happened yesterday" report for Task by Gershon.AI.
// Triggered by .github/workflows/daily-report.yml at 11:00 UTC (07:00 ET) with the CRON_SECRET
// bearer token, or manually from the Actions tab / by POSTing with the same header.
//
// It answers three questions:
//   1. What happened yesterday?
//   2. Did we make progress? (scored 0-6 against the previous run's snapshot)
//   3. Did the system fail to do its daily job? (big red warning)

const TZ = 'America/New_York'
const STATE_KEY = 'daily_report_state'

const PRIMARY_FROM = 'GC Task <reports@gershon.ai>'
const PRIMARY_TO = ['oattia@gmail.com', 'aina.rama@gershonconsulting.com']
// Used only if the verified-domain send is rejected, so a report is never lost.
const FALLBACK_FROM = 'GC Task <onboarding@resend.dev>'
const FALLBACK_TO = ['oattia@gmail.com']

type Task = { id: string; name: string; status: string | null; assigned_to: string | null; due_date: string | null; project_id: string | null; created_at: string; updated_at: string }
type Project = { id: string; company_name: string; status: string; created_at: string; updated_at: string }
type Client = { id: string; name: string; created_at: string }

function readEnv(name: string): string | undefined {
  try { return (getRequestContext().env as Record<string, string>)[name] } catch { return process.env[name] }
}

// YYYY-MM-DD for an instant, in the report timezone.
function tzDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function onDay(ts: string | null | undefined, ymd: string): boolean {
  if (!ts) return false
  const d = new Date(ts)
  if (isNaN(d.getTime())) return false
  return tzDate(d) === ymd
}

function daysBetween(aYmd: string, bYmd: string): number {
  return Math.round((Date.parse(bYmd + 'T12:00:00Z') - Date.parse(aYmd + 'T12:00:00Z')) / 86400000)
}

async function handle(req: NextRequest, preview: boolean) {
  const secret = readEnv('CRON_SECRET')
  const auth = req.headers.get('authorization') || ''
  if (!secret || auth !== 'Bearer ' + secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supa = supabaseAdmin()
  const [{ data: projects }, { data: tasks }, { data: clients }, { data: state }] = await Promise.all([
    supa.from('projects').select('id, company_name, status, created_at, updated_at'),
    supa.from('tasks').select('id, name, status, assigned_to, due_date, project_id, created_at, updated_at'),
    supa.from('clients').select('id, name, created_at'),
    supa.from('app_settings').select('value').eq('key', STATE_KEY).maybeSingle(),
  ])

  const allProjects = (projects ?? []) as Project[]
  const allTasks = (tasks ?? []) as Task[]
  const allClients = (clients ?? []) as Client[]

  const now = new Date()
  const todayYmd = tzDate(now)
  const yYmd = addDays(todayYmd, -1)
  const dYmd = addDays(todayYmd, -2)

  let prev: Snapshot | null = null
  try { prev = state?.value ? (JSON.parse(state.value as string) as Snapshot) : null } catch { prev = null }

  const count = (ymd: string): DayCounts => ({
    projectsCreated: allProjects.filter(p => onDay(p.created_at, ymd)).length,
    tasksCreated: allTasks.filter(t => onDay(t.created_at, ymd)).length,
    tasksTouched: allTasks.filter(t => onDay(t.updated_at, ymd)).length,
    tasksCompleted: allTasks.filter(t => t.status === 'completed' && onDay(t.updated_at, ymd)).length,
    clientsAdded: allClients.filter(c => onDay(c.created_at, ymd)).length,
  })
  const y = count(yYmd)
  const d = count(dYmd)

  const tasksTotal = allTasks.length
  const tasksDone = allTasks.filter(t => t.status === 'completed').length
  const pct = tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0
  const overdue = allTasks.filter(t => t.status !== 'completed' && t.due_date && t.due_date < todayYmd).length
  const activeProjects = allProjects.filter(p => p.status !== 'archived').length

  // Last real movement anywhere in the data.
  const stamps = [
    ...allTasks.map(t => t.updated_at), ...allTasks.map(t => t.created_at),
    ...allProjects.map(p => p.updated_at), ...allProjects.map(p => p.created_at),
  ].filter(Boolean).map(s => Date.parse(s)).filter(n => !isNaN(n))
  const lc = lastChange(stamps.map(ms => tzDate(new Date(ms))), yYmd)

  // Progress score, 6 measures, 1 point each.
  // `why` explains a ✗ in plain words; `href` is where to act on it in the app.
  const base = siteUrl()
  const od = overdueCheck(overdue, prev ? prev.overdue : null)
  const checks: Check[] = [
    { label: 'Projects created', v: y.projectsCreated, p: d.projectsCreated, ok: y.projectsCreated > 0, why: 'No new project was opened.', href: base + '/projects' },
    { label: 'Tasks created', v: y.tasksCreated, p: d.tasksCreated, ok: y.tasksCreated > 0, why: 'No task was added to any project.', href: base + '/tasks' },
    { label: 'Tasks completed', v: y.tasksCompleted, p: d.tasksCompleted, ok: y.tasksCompleted > 0, why: 'No task was marked done (' + (tasksTotal - tasksDone) + ' still open).', href: base + '/tasks' },
    { label: 'Tasks touched', v: y.tasksTouched, p: d.tasksTouched, ok: y.tasksTouched > 0, why: 'No task was edited, re-dated or re-assigned.', href: base + '/tasks' },
    { label: 'Completion %', v: pct, p: prev ? prev.pct : pct, ok: prev ? pct > prev.pct : false, why: 'Overall completion stayed at ' + pct + '% (' + tasksDone + '/' + tasksTotal + ').', href: base + '/dashboard' },
    // ✓ only at 0 overdue: a flat or slightly lower non-zero count is still a red ✗.
    { label: 'Overdue tasks', v: overdue, p: prev ? prev.overdue : overdue, ok: od.ok, why: od.why, href: base + '/tasks' },
  ]
  const score = checks.filter(c => c.ok).length

  // The open tasks that are most overdue: the concrete items to move next, each linked to its project.
  const projectName = new Map(allProjects.map(p => [p.id, p.company_name]))
  const stuck: StuckTask[] = allTasks
    .filter(t => t.status !== 'completed' && t.due_date && t.due_date < todayYmd)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : a.due_date! > b.due_date! ? 1 : 0))
    .slice(0, 6)
    .map(t => ({
      name: t.name,
      owner: canonicalOwner(t.assigned_to, allTasks.map(x => x.assigned_to)),
      due: t.due_date!,
      daysLate: daysBetween(t.due_date!.slice(0, 10), todayYmd),
      project: t.project_id ? projectName.get(t.project_id) ?? null : null,
      href: t.project_id ? base + '/projects/' + t.project_id : base + '/tasks',
    }))

  // Did the system do its daily job?
  const nothingHappened = y.projectsCreated + y.tasksCreated + y.tasksTouched + y.clientsAdded === 0
  const missedRuns = prev ? Math.max(0, daysBetween(prev.date, todayYmd) - 1) : 0

  // One summary object drives the subject, the header and the body so they can never disagree.
  const summary = summarize({ score, nothingHappened, todayYmd, reportedYmd: yYmd, overdue })

  const warnings: string[] = []
  if (missedRuns > 0) warnings.push('The daily report did not run for ' + missedRuns + ' day(s) — last run was ' + esc(prev!.date) + '. The scheduled job is failing or disabled.')
  if (summary.alarm) warnings.push('Nothing moved on ' + longDate(yYmd) + ': no project, task or client was created, updated or completed.' + ' Last change of any kind: ' + lc.text + '.')

  const html = buildEmail({ base, yYmd, y, checks, summary, pct, tasksDone, tasksTotal, overdue, overdueTrend: od.trend, activeProjects, clientsTotal: allClients.length, warnings, lastChangeText: lc.text, stuck })
  const subject =
    (warnings.length ? '⚠ ' : '') +
    'Task — Daily report, ' + longDate(yYmd).replace(/^\w+, /, '') + ' — ' +
    summary.subjectTail

  const snapshot: Snapshot = { date: todayYmd, run_at: now.toISOString(), tasks_total: tasksTotal, tasks_done: tasksDone, projects_total: allProjects.length, overdue, pct }

  if (preview) {
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  const resendKey = readEnv('RESEND_API_KEY')
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })

  const send = async (from: string, to: string[]) => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    })
    const body = await res.json().catch(() => ({}))
    return { ok: res.ok, body }
  }

  let delivery = await send(PRIMARY_FROM, PRIMARY_TO)
  let usedFallback = false
  if (!delivery.ok) {
    usedFallback = true
    delivery = await send(FALLBACK_FROM, FALLBACK_TO)
  }

  // Only advance the snapshot when the report actually went out, so a failed day
  // is still reported as a missed run tomorrow.
  if (delivery.ok) {
    await supa.from('app_settings').upsert({ key: STATE_KEY, value: JSON.stringify(snapshot), updated_at: now.toISOString() }, { onConflict: 'key' })
  }

  return NextResponse.json({
    ok: delivery.ok,
    date: yYmd,
    score,
    warnings,
    sentFrom: usedFallback ? FALLBACK_FROM : PRIMARY_FROM,
    sentTo: usedFallback ? FALLBACK_TO : PRIMARY_TO,
    usedFallback,
    detail: delivery.ok ? delivery.body : delivery.body,
  })
}

export async function POST(req: NextRequest) { return handle(req, false) }
export async function GET(req: NextRequest) { return handle(req, new URL(req.url).searchParams.get('preview') === '1') }
