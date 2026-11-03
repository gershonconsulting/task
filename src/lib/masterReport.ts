import { supabaseAdmin } from './supabaseServer'
import { siteUrl } from './site'
import { isAssignedTo, type TeamMember } from './team'
import { addDays, cleanClient, etToday, loadMyWork } from './myWork'

/**
 * Weekly MASTER report — the whole platform on one page, sent every Friday
 * to the report mailbox (report@gershonconsulting.com), alongside the
 * per-member "My Tasks" reports.
 */
export const MASTER_TO = 'report@gershonconsulting.com'

function esc(s: unknown): string { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)) }
function fmt(d: string): string { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) }

type Row = { id: string; name: string; status: string | null; due_date: string | null; assigned_to: string | null; project_id: string; updated_at: string; created_at: string }
type Proj = { id: string; company_name: string; status: string | null; created_at: string }

export async function buildMasterReport(team: TeamMember[]): Promise<{ subject: string; html: string }> {
  const supa = supabaseAdmin()
  const [{ data: tasks }, { data: projects }, base] = await Promise.all([
    supa.from('tasks').select('id, name, status, due_date, assigned_to, project_id, updated_at, created_at'),
    supa.from('projects').select('id, company_name, status, created_at').neq('status', 'archived'),
    loadMyWork(team[0] ?? { name: 'Olivier Attia', email: 'olivier@gershonconsulting.com' }),
  ])
  const today = etToday(), weekAgo = addDays(today, -7)
  const proj = new Map(((projects ?? []) as Proj[]).map(p => [p.id, p]))
  const all = ((tasks ?? []) as Row[]).filter(t => proj.has(t.project_id))
  const open = all.filter(t => t.status !== 'completed')
  const done = all.filter(t => t.status === 'completed')
  const lateAll = open.filter(t => t.due_date && t.due_date < today)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  const daysLate = (d: string) => Math.round((new Date(today + 'T12:00:00Z').getTime() - new Date(d + 'T12:00:00Z').getTime()) / 86400000)

  const T = base.totals
  const pct = all.length ? Math.round(done.length / all.length * 100) : 0
  const createdThisWeek = all.filter(t => (t.created_at ?? '').slice(0, 10) >= weekAgo).length
  const newProjects = ((projects ?? []) as Proj[]).filter(p => (p.created_at ?? '').slice(0, 10) >= weekAgo).length
  const prevWeekDone = base.weekly.length >= 2 ? base.weekly[base.weekly.length - 2].done : 0

  // By client
  const clients = new Map<string, { open: number; late: number; doneWeek: number; total: number; done: number }>()
  for (const t of all) {
    const c = cleanClient(proj.get(t.project_id)!.company_name)
    const r = clients.get(c) ?? { open: 0, late: 0, doneWeek: 0, total: 0, done: 0 }
    r.total++
    if (t.status === 'completed') { r.done++; if (t.updated_at.slice(0, 10) >= weekAgo) r.doneWeek++ }
    else { r.open++; if (t.due_date && t.due_date < today) r.late++ }
    clients.set(c, r)
  }
  const clientRows = [...clients.entries()].filter(([, r]) => r.open || r.doneWeek)
    .sort((a, b) => b[1].late - a[1].late || b[1].open - a[1].open)

  // Who: name for each late task
  const owner = (a: string | null) => {
    if (!a) return '<span style="color:#CC3333;font-weight:700;">nobody</span>'
    const m = team.find(x => isAssignedTo(x, a))
    return esc(m ? m.name.split(' ')[0] : a)
  }

  const td = 'padding:7px 6px;border-bottom:1px solid #f0f0f2;font-size:13px;'
  const th = 'padding:4px 6px;font-size:11px;color:#6e6e73;text-transform:uppercase;'
  const box = (title: string, body: string, accent = '#e5e7eb') =>
    `<div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid ${accent};border-radius:12px;padding:16px 18px;margin:0 0 14px;"><div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6e6e73;margin-bottom:6px;">${title}</div>${body}</div>`
  const kpi = (label: string, val: number | string, color = '#1d1d1f') =>
    `<td style="width:16.6%;padding:10px 4px;text-align:center;background:#fff;border:1px solid #e5e7eb;border-radius:10px;"><div style="font-size:22px;font-weight:800;color:${color};">${val}</div><div style="font-size:11px;color:#6e6e73;">${label}</div></td>`

  const members = base.team.map(t => {
    const rate = t.open + t.doneLast7 ? Math.round(t.doneLast7 / (t.open + t.doneLast7) * 100) : 0
    return `<tr><td style="${td}">${esc(t.member.name)}</td><td style="${td}text-align:right;color:#057642;font-weight:700;">${t.doneLast7}</td><td style="${td}text-align:right;${t.overdue ? 'color:#CC3333;font-weight:700;' : 'color:#6e6e73;'}">${t.overdue}</td><td style="${td}text-align:right;">${t.dueThisWeek}</td><td style="${td}text-align:right;">${t.open}</td><td style="${td}text-align:right;color:#6e6e73;">${rate}%</td></tr>`
  }).join('')

  const clientTable = clientRows.map(([c, r]) => {
    const p = r.total ? Math.round(r.done / r.total * 100) : 0
    return `<tr><td style="${td}">${esc(c)}<div style="height:4px;background:#f0f0f2;border-radius:2px;margin-top:4px;"><div style="height:4px;width:${p}%;background:#057642;border-radius:2px;"></div></div></td><td style="${td}text-align:right;color:#6e6e73;">${p}%</td><td style="${td}text-align:right;color:#057642;">${r.doneWeek}</td><td style="${td}text-align:right;${r.late ? 'color:#CC3333;font-weight:700;' : 'color:#6e6e73;'}">${r.late}</td><td style="${td}text-align:right;">${r.open}</td></tr>`
  }).join('')

  const maxW = Math.max(1, ...base.weekly.map(w => w.done))
  const trend = `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>${base.weekly.map(w =>
    `<td style="vertical-align:bottom;text-align:center;padding:0 3px;"><div style="font-size:11px;color:#1d1d1f;font-weight:700;">${w.done}</div><div style="height:${Math.max(3, Math.round(w.done / maxW * 70))}px;background:#CC3333;border-radius:3px 3px 0 0;"></div><div style="font-size:10px;color:#6e6e73;margin-top:3px;">${new Date(w.weekStart + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'UTC' })}</div></td>`).join('')}</tr></table>`

  const lateList = lateAll.length
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;">${lateAll.slice(0, 20).map(t =>
      `<tr><td style="${td}">${esc(t.name)}<div style="font-size:12px;color:#6e6e73;">${esc(cleanClient(proj.get(t.project_id)!.company_name))}</div></td><td style="${td}text-align:right;white-space:nowrap;">${owner(t.assigned_to)}</td><td style="${td}text-align:right;white-space:nowrap;color:#CC3333;font-weight:700;">${daysLate(t.due_date!)}d</td></tr>`).join('')}${lateAll.length > 20 ? `<tr><td colspan="3" style="padding:8px 0;font-size:12px;color:#6e6e73;">+ ${lateAll.length - 20} more late tasks</td></tr>` : ''}</table>`
    : '<p style="margin:0;color:#6e6e73;font-size:13px;">Nothing late across the team. 👏</p>'

  const trendWord = T.doneLast7 > prevWeekDone ? `up from ${prevWeekDone}` : T.doneLast7 < prevWeekDone ? `down from ${prevWeekDone}` : `same as last week`
  const subject = `GC Task · Weekly master report — ${T.doneLast7} done, ${T.late} late, ${T.open} open`
  const html = `<!doctype html><html><body style="margin:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
<div style="max-width:680px;margin:0 auto;padding:24px 16px;">
  <div style="margin-bottom:18px;"><span style="display:inline-block;width:28px;height:28px;border-radius:7px;background:#CC3333;color:#fff;text-align:center;line-height:28px;font-weight:900;font-size:16px;">✓</span><span style="font-size:18px;font-weight:800;color:#CC3333;margin-left:10px;">Task</span><span style="font-size:12px;font-weight:600;color:#6e6e73;margin-left:6px;">by Gershon.AI</span></div>
  <h1 style="font-size:22px;margin:0 0 4px;">Weekly master report</h1>
  <p style="margin:0 0 16px;color:#6e6e73;font-size:13px;">Week ending ${fmt(today)} · ${T.doneLast7} tasks done (${trendWord}) · ${createdThisWeek} tasks and ${newProjects} projects created · ${pct}% of all tasks complete</p>
  <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:6px;margin:0 -6px 10px;"><tr>
    ${kpi('Done this week', T.doneLast7, '#057642')}${kpi('Late', T.late, T.late ? '#CC3333' : '#1d1d1f')}${kpi('Due next 7d', T.dueNext7)}${kpi('Open', T.open)}${kpi('Unassigned', T.unassigned, T.unassigned ? '#b45309' : '#1d1d1f')}${kpi('Active projects', proj.size)}
  </tr></table>
  ${box('Team — My Tasks stats per member', `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td style="${th}">Member</td><td style="${th}text-align:right;">Done</td><td style="${th}text-align:right;">Late</td><td style="${th}text-align:right;">Next 7d</td><td style="${th}text-align:right;">Open</td><td style="${th}text-align:right;">Closed %</td></tr>${members}</table>`)}
  ${box(`Late tasks — whole team (${lateAll.length})`, lateList, lateAll.length ? '#CC3333' : '#e5e7eb')}
  ${box('Clients', clientRows.length ? `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td style="${th}">Client · progress</td><td style="${th}text-align:right;">%</td><td style="${th}text-align:right;">Done wk</td><td style="${th}text-align:right;">Late</td><td style="${th}text-align:right;">Open</td></tr>${clientTable}</table>` : '<p style="margin:0;color:#6e6e73;font-size:13px;">No active client work.</p>')}
  ${box('Tasks done per week (last 8 weeks)', trend, '#057642')}
  <div style="text-align:center;margin:22px 0 8px;"><a href="${siteUrl()}/dashboard" style="display:inline-block;background:#CC3333;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:8px;">Open the dashboard →</a></div>
  <p style="text-align:center;font-size:11px;color:#6e6e73;margin-top:18px;">Weekly master report · sent every Friday to ${MASTER_TO}. Each member also gets their own "My Tasks" report. · <a href="${siteUrl()}" style="color:#6e6e73;">${siteUrl().replace('https://', '')}</a></p>
</div></body></html>`
  return { subject, html }
}
