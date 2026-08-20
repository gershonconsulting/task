export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { supabaseAdmin } from '@/lib/supabaseServer'

// Daily "what happened yesterday" report for task.gershoncrm.com.
// Triggered by .github/workflows/daily-report.yml at 11:00 UTC (07:00 ET) with the CRON_SECRET
// bearer token, or manually from the Actions tab / by POSTing with the same header.
//
// It answers three questions:
//   1. What happened yesterday?
//   2. Did we make progress? (scored 0-6 against the previous run's snapshot)
//   3. Did the system fail to do its daily job? (big red warning)

const TZ = 'America/New_York'
const STATE_KEY = 'daily_report_state'

const PRIMARY_FROM = 'GershonCRM Task Manager <reports@gershon.ai>'
const PRIMARY_TO = ['oattia@gmail.com', 'aina.rama@gershonconsulting.com']
// Used only if the verified-domain send is rejected, so a report is never lost.
const FALLBACK_FROM = 'GershonCRM Task Manager <onboarding@resend.dev>'
const FALLBACK_TO = ['oattia@gmail.com']

type Task = { id: string; name: string; status: string | null; assigned_to: string | null; due_date: string | null; project_id: string | null; created_at: string; updated_at: string }
type Project = { id: string; company_name: string; status: string; created_at: string; updated_at: string }
type Client = { id: string; name: string; created_at: string }

type Snapshot = { date: string; run_at: string; tasks_total: number; tasks_done: number; projects_total: number; overdue: number; pct: number }
type DayCounts = { projectsCreated: number; tasksCreated: number; tasksTouched: number; tasksCompleted: number; clientsAdded: number }

function readEnv(name: string): string | undefined {
  try { return (getRequestContext().env as Record<string, string>)[name] } catch { return process.env[name] }
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
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

function longDate(ymd: string): string {
  return new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
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
  const lastWriteMs = stamps.length ? Math.max(...stamps) : 0
  const lastWriteYmd = lastWriteMs ? tzDate(new Date(lastWriteMs)) : null
  const daysSinceWrite = lastWriteYmd ? daysBetween(lastWriteYmd, todayYmd) : null

  // Progress score, 6 measures, 1 point each.
  const checks = [
    { label: 'Projects created', v: y.projectsCreated, p: d.projectsCreated, ok: y.projectsCreated > 0 },
    { label: 'Tasks created', v: y.tasksCreated, p: d.tasksCreated, ok: y.tasksCreated > 0 },
    { label: 'Tasks completed', v: y.tasksCompleted, p: d.tasksCompleted, ok: y.tasksCompleted > 0 },
    { label: 'Tasks touched', v: y.tasksTouched, p: d.tasksTouched, ok: y.tasksTouched > 0 },
    { label: 'Completion %', v: pct, p: prev ? prev.pct : pct, ok: prev ? pct > prev.pct : false },
    { label: 'Overdue tasks', v: overdue, p: prev ? prev.overdue : overdue, ok: prev ? overdue <= prev.overdue : overdue === 0 },
  ]
  const score = checks.filter(c => c.ok).length

  // Did the system do its daily job?
  const nothingHappened = y.projectsCreated + y.tasksCreated + y.tasksTouched + y.clientsAdded === 0
  const missedRuns = prev ? Math.max(0, daysBetween(prev.date, todayYmd) - 1) : 0
  const overdueGrew = prev ? overdue > prev.overdue : false

  const warnings: string[] = []
  if (missedRuns > 0) warnings.push('The daily report did not run for ' + missedRuns + ' day(s) — last run was ' + esc(prev!.date) + '. The scheduled job is failing or disabled.')
  if (nothingHappened) warnings.push('Nothing moved on ' + longDate(yYmd) + ': no project, task or client was created, updated or completed.' + (daysSinceWrite !== null ? ' The last change of any kind was ' + daysSinceWrite + ' day(s) ago.' : ''))

  const html = buildEmail({ yYmd, dYmd, y, d, checks, score, pct, tasksDone, tasksTotal, overdue, overdueGrew, activeProjects, clientsTotal: allClients.length, warnings, prev, daysSinceWrite })
  const subject =
    (warnings.length ? '⚠ ' : '') +
    'task.gershoncrm.com — Daily report, ' + longDate(yYmd).replace(/^\w+, /, '') + ' — ' +
    (nothingHappened ? 'NO PROGRESS (0/6)' : 'Progress ' + score + '/6')

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

function buildEmail(a: {
  yYmd: string; dYmd: string
  y: DayCounts; d: DayCounts
  checks: Array<{ label: string; v: number; p: number; ok: boolean }>
  score: number; pct: number; tasksDone: number; tasksTotal: number; overdue: number; overdueGrew: boolean
  activeProjects: number; clientsTotal: number; warnings: string[]; prev: Snapshot | null; daysSinceWrite: number | null
}): string {
  const card = 'background:#ffffff;border-left:5px solid #1f6f5c;border-radius:6px;padding:20px 24px;margin-bottom:16px;'
  const rows = a.checks.map(c =>
    "<tr>" +
    "<td style='padding:8px 10px;border-bottom:1px solid #e6ebe9;'>" + esc(c.label) + "</td>" +
    "<td align='center' style='padding:8px 10px;border-bottom:1px solid #e6ebe9;'>" + c.v + "</td>" +
    "<td align='center' style='padding:8px 10px;border-bottom:1px solid #e6ebe9;color:#8a9995;'>" + c.p + "</td>" +
    "<td align='center' style='padding:8px 10px;border-bottom:1px solid #e6ebe9;color:" + (c.ok ? '#1f6f5c' : '#c0392b') + ";'>" + (c.ok ? '&#10003;' : '&#10007;') + "</td>" +
    "</tr>").join('')

  const warnHtml = a.warnings.length
    ? "<div style='background:#fdecea;border-left:5px solid #c0392b;border-radius:6px;padding:18px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:17px;font-weight:700;color:#8e2318;margin-bottom:6px;'>&#9888; BIG WARNING — the system did not do its daily job</div>" +
      "<div style='font-size:14px;color:#5a1c14;line-height:1.55;'>" + a.warnings.map(w => '&bull; ' + w).join('<br>') + "</div></div>"
    : "<div style='background:#eaf6f1;border-left:5px solid #1f6f5c;border-radius:6px;padding:18px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:17px;font-weight:700;color:#14503f;margin-bottom:6px;'>&#10003; The system did its job</div>" +
      "<div style='font-size:14px;color:#1d4a3d;line-height:1.55;'>" + a.y.tasksCompleted + " task(s) completed, " + a.y.tasksCreated + " created, " + a.y.projectsCreated + " new project(s) on " + longDate(a.yYmd) + ".</div></div>"

  const overdueHtml = a.overdue > 0
    ? "<div style='background:#fff8e6;border-left:5px solid #d68910;border-radius:6px;padding:18px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:16px;font-weight:700;color:#7d5109;margin-bottom:6px;'>" + a.overdue + " overdue task(s)" + (a.overdueGrew ? ' — up from ' + (a.prev ? a.prev.overdue : 0) + ' yesterday' : '') + "</div>" +
      "<div style='font-size:14px;color:#6b4708;'>Open tasks whose due date has already passed. Clear or re-date them in the app.</div></div>"
    : ''

  return "<div style='margin:0;padding:24px;background:#f4f6f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;'>" +
    "<div style='max-width:640px;margin:0 auto;'>" +
    "<div style='" + card + "'>" +
      "<div style='font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#5b6b66;margin-bottom:6px;'>Daily progress report</div>" +
      "<div style='font-size:22px;font-weight:700;color:#12352c;'>task.gershoncrm.com — what happened yesterday</div>" +
      "<div style='font-size:14px;color:#5b6b66;margin-top:4px;'>" + longDate(a.yYmd) + "</div>" +
    "</div>" +
    warnHtml +
    "<div style='background:#ffffff;border-radius:6px;padding:20px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:16px;font-weight:700;color:#12352c;margin-bottom:12px;'>Progress score: " + a.score + " / 6</div>" +
      "<table style='width:100%;border-collapse:collapse;font-size:14px;'>" +
      "<tr style='background:#f0f4f3;'><th align='left' style='padding:8px 10px;color:#12352c;'>Measure</th>" +
      "<th align='center' style='padding:8px 10px;color:#12352c;'>Yesterday</th>" +
      "<th align='center' style='padding:8px 10px;color:#12352c;'>Previous</th>" +
      "<th align='center' style='padding:8px 10px;color:#12352c;'>&nbsp;</th></tr>" + rows + "</table>" +
    "</div>" +
    overdueHtml +
    "<div style='background:#ffffff;border-radius:6px;padding:20px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:16px;font-weight:700;color:#12352c;margin-bottom:10px;'>Where the app stands today</div>" +
      "<table style='width:100%;border-collapse:collapse;font-size:14px;'>" +
      "<tr><td style='padding:6px 0;color:#5b6b66;width:52%;'>Overall completion</td><td style='padding:6px 0;'><b>" + a.pct + "%</b> — " + a.tasksDone + "/" + a.tasksTotal + " tasks done</td></tr>" +
      "<tr><td style='padding:6px 0;color:#5b6b66;'>Active projects</td><td style='padding:6px 0;'>" + a.activeProjects + "</td></tr>" +
      "<tr><td style='padding:6px 0;color:#5b6b66;'>Clients</td><td style='padding:6px 0;'>" + a.clientsTotal + "</td></tr>" +
      "<tr><td style='padding:6px 0;color:#5b6b66;'>Overdue tasks</td><td style='padding:6px 0;'>" + a.overdue + "</td></tr>" +
      "<tr><td style='padding:6px 0;color:#5b6b66;'>Last change of any kind</td><td style='padding:6px 0;'>" + (a.daysSinceWrite === null ? 'never' : a.daysSinceWrite === 0 ? 'today' : a.daysSinceWrite + ' day(s) ago') + "</td></tr>" +
      "</table>" +
    "</div>" +
    "<div style='text-align:center;font-size:12px;color:#8a9995;padding:8px 0 0;'>Automated daily report &middot; generated by task.gershoncrm.com &middot; <a href='https://task.gershoncrm.com/dashboard' style='color:#1f6f5c;'>Open the dashboard</a></div>" +
    "</div></div>"
}
