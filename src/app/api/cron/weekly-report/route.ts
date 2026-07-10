export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getTemplate } from '@/lib/templates'

// For now every email is delivered to the Resend account owner (oattia@gmail.com) until a sending
// domain is verified in Resend; Olivier forwards to each member. Subjects name the intended member.
const DELIVER_TO = 'oattia@gmail.com'
const FROM = 'Gershon Task Manager <onboarding@resend.dev>'
const MEMBERS: { label: string; match: string[] }[] = [
  { label: 'Winnie Lauren', match: ['Winnie Lauren'] },
  { label: 'Aina Rama', match: ['Aina Rama'] },
  { label: 'Olivier Attia', match: ['Olivier Attia', 'Olivier'] },
]

type ProjRow = { name: string; service: string; total: number; done: number; pct: number; overdue: number }
type Task = { id: string; name: string; status: string | null; assigned_to: string | null; due_date: string | null; project_id: string | null }

function readEnv(name: string): string | undefined { try { return (getRequestContext().env as Record<string, string>)[name] } catch { return process.env[name] } }
function esc(s: unknown): string { return String(s ?? '').replace(/[&<>]/g, c => c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;') }
function pctColor(p: number): string { return p === 100 ? '#16a34a' : p >= 50 ? '#f59e0b' : '#dc2626' }
function fmtDate(d: string | null): string { return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'no date' }

export async function POST(req: NextRequest) {
  const secret = readEnv('CRON_SECRET')
  const auth = req.headers.get('authorization') || ''
  if (!secret || auth !== 'Bearer ' + secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const resendKey = readEnv('RESEND_API_KEY')
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })

  const supa = supabaseAdmin()
  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supa.from('projects').select('id, company_name, template_slug, status').neq('status', 'archived'),
    supa.from('tasks').select('id, name, status, assigned_to, due_date, project_id'),
  ])
  const allProjects = (projects ?? []) as Array<{ id: string; company_name: string; template_slug: string; status: string }>
  const allTasks = (tasks ?? []) as Task[]
  const today = new Date().toISOString().slice(0, 10)
  const projName = new Map(allProjects.map(p => [p.id, p.company_name]))

  const projRows: ProjRow[] = allProjects.map(p => {
    const pt = allTasks.filter(t => t.project_id === p.id)
    const total = pt.length
    const done = pt.filter(t => t.status === 'completed').length
    const overdue = pt.filter(t => t.status !== 'completed' && t.due_date && t.due_date < today).length
    return { name: p.company_name, service: getTemplate(p.template_slug)?.label ?? p.template_slug, total, done, pct: total ? Math.round(done / total * 100) : 0, overdue }
  }).sort((a, b) => a.name.localeCompare(b.name))

  const overallTotal = allTasks.length
  const overallDone = allTasks.filter(t => t.status === 'completed').length
  const overallPct = overallTotal ? Math.round(overallDone / overallTotal * 100) : 0

  const results: Array<Record<string, unknown>> = []
  for (const m of MEMBERS) {
    const myOpen = allTasks.filter(t => !!t.assigned_to && m.match.includes(t.assigned_to) && t.status !== 'completed')
    const html = buildEmail(m.label, projRows, overallPct, overallDone, overallTotal, myOpen, projName, today)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [DELIVER_TO],
        subject: 'Weekly Report for ' + m.label + ' — ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        html,
      }),
    })
    const b = await res.json().catch(() => ({}))
    results.push({ member: m.label, myTasks: myOpen.length, ok: res.ok, detail: res.ok ? undefined : b })
  }
  return NextResponse.json({ ok: true, deliveredTo: DELIVER_TO, results })
}

function buildEmail(member: string, projRows: ProjRow[], overallPct: number, overallDone: number, overallTotal: number, myOpen: Task[], projName: Map<string, string>, today: string): string {
  const byProj = new Map<string, Task[]>()
  for (const t of myOpen) {
    const key = t.project_id ? (projName.get(t.project_id) ?? 'Other') : 'Other'
    byProj.set(key, [...(byProj.get(key) ?? []), t])
  }
  const myGroups = [...byProj.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const myHtml = myGroups.length === 0
    ? `<p style='color:#64748b;'>No open tasks assigned to you right now.</p>`
    : myGroups.map(([proj, ts]) => {
        const items = ts.slice().sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')).map(t => {
          const over = !!t.due_date && t.due_date < today
          return `<li style='margin:4px 0;'>${esc(t.name)} <span style='color:${over ? '#dc2626' : '#94a3b8'};font-size:12px;'>(due ${fmtDate(t.due_date)}${over ? ' — overdue' : ''})</span></li>`
        }).join('')
        return `<div style='margin:12px 0;'><div style='font-weight:bold;color:#334155;'>${esc(proj)}</div><ul style='margin:4px 0 0;padding-left:18px;'>${items}</ul></div>`
      }).join('')

  const projTable = projRows.map(r => `<tr><td style='padding:6px 8px;border-bottom:1px solid #eee;'>${esc(r.name)}<div style='color:#94a3b8;font-size:11px;'>${esc(r.service)}</div></td><td style='padding:6px 8px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;color:${pctColor(r.pct)};'>${r.pct}%</td><td style='padding:6px 8px;border-bottom:1px solid #eee;text-align:center;'>${r.done}/${r.total}</td><td style='padding:6px 8px;border-bottom:1px solid #eee;text-align:center;color:${r.overdue > 0 ? '#dc2626' : '#94a3b8'};'>${r.overdue}</td></tr>`).join('')

  return `<div style='font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;'>` +
    `<h2 style='color:#4f46e5;margin-bottom:4px;'>Weekly Report — ${esc(member)}</h2>` +
    `<p style='color:#64748b;margin-top:0;'>Week ending ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>` +
    `<div style='background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:14px;margin:16px 0;'><strong>Overall progress: ${overallPct}%</strong> · ${overallDone}/${overallTotal} tasks done</div>` +
    `<h3 style='color:#334155;'>All projects</h3>` +
    `<table style='width:100%;border-collapse:collapse;font-size:14px;'><thead><tr style='color:#64748b;font-size:11px;text-transform:uppercase;text-align:left;'><th style='padding:6px 8px;'>Project</th><th style='padding:6px 8px;text-align:center;'>%</th><th style='padding:6px 8px;text-align:center;'>Done</th><th style='padding:6px 8px;text-align:center;'>Overdue</th></tr></thead><tbody>${projTable}</tbody></table>` +
    `<h3 style='color:#334155;margin-top:24px;'>Your tasks to do</h3>` +
    myHtml +
    `<p style='color:#94a3b8;font-size:12px;margin-top:24px;'>Automated weekly report · GershonCRM Task Manager. Delivered to ${DELIVER_TO} for forwarding until the sending domain is verified.</p>` +
  `</div>`
}
