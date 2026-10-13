export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { readEnv, siteUrl } from '@/lib/site'
import { loadTeam, OWNER_EMAILS, type TeamMember } from '@/lib/team'
import { etToday, loadMyWork, type MyWork, type WorkTask } from '@/lib/myWork'

/**
 * Friday report — every registered user of the platform (Settings → Team
 * members) gets their own e-mail every Friday: what they finished this week,
 * what is late, what is due next week, plus the team table.
 *
 *   POST                       send to every member (once per New-York day)
 *   POST ?only=<email>         send just one member's report to that address (test)
 *   POST ?force=1              send again even if today's run already went out
 *   GET  ?preview=1[&member=<id>]   render the HTML, send nothing
 * All need  Authorization: Bearer <CRON_SECRET>.
 * Scheduled by .github/workflows/weekly-report.yml — Fridays 12:00 UTC (08:00 ET).
 */
const FROM = 'GC Task <reports@gershon.ai>'   // gershon.ai is the verified Resend domain
const STATE_KEY = 'friday_report_state'

function esc(s: unknown): string { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)) }
function fmt(d: string): string { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) }

function authorized(req: NextRequest): boolean {
  const secret = readEnv('CRON_SECRET')
  return !!secret && req.headers.get('authorization') === 'Bearer ' + secret
}

function taskRows(ts: WorkTask[], kind: 'late' | 'next' | 'done', max = 12): string {
  if (!ts.length) return `<p style="margin:6px 0 0;color:#6e6e73;font-size:13px;">${kind === 'late' ? 'Nothing late. 👏' : kind === 'next' ? 'Nothing due next week.' : 'No task closed this week.'}</p>`
  const rows = ts.slice(0, max).map(t => {
    const right = kind === 'late' ? `<span style="color:#FE1B04;font-weight:700;">${t.daysLate}d late</span>`
      : kind === 'next' ? `<span style="color:#6e6e73;">${t.dueDate ? fmt(t.dueDate) : ''}</span>`
      : `<span style="color:#057642;">✓ done</span>`
    return `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f2;font-size:14px;color:#1d1d1f;">${esc(t.name)}<div style="font-size:12px;color:#6e6e73;">${esc(t.projectLabel)}</div></td><td style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f2;font-size:12px;text-align:right;white-space:nowrap;">${right}</td></tr>`
  }).join('')
  const more = ts.length > max ? `<tr><td colspan="2" style="padding:8px 0;font-size:12px;color:#6e6e73;">+ ${ts.length - max} more on the dashboard</td></tr>` : ''
  return `<table role="presentation" style="width:100%;border-collapse:collapse;">${rows}${more}</table>`
}

function buildEmail(m: TeamMember, w: MyWork): { subject: string; html: string } {
  const first = m.name.split(' ')[0]
  const next = [...w.dueToday, ...w.thisWeek]
  const late = w.overdue
  const status = late.length
    ? `<strong style="color:#FE1B04;">${late.length} late</strong> — please close or re-date them before Monday.`
    : next.length ? `Nothing late. <strong>${next.length}</strong> due next week.` : 'Nothing late and nothing due next week.'
  const subject = `GC Task · Your week — ${w.doneLast7.length} done, ${late.length} late, ${next.length} next week`
  const dash = siteUrl() + '/dashboard'
  const box = (title: string, body: string, accent = '#e5e7eb') =>
    `<div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid ${accent};border-radius:12px;padding:16px 18px;margin:0 0 14px;"><div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6e6e73;margin-bottom:4px;">${title}</div>${body}</div>`
  const team = w.team.map(t => `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f2;font-size:13px;">${esc(t.member.name)}</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f2;font-size:13px;text-align:right;color:#057642;">${t.doneLast7}</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f2;font-size:13px;text-align:right;${t.overdue ? 'color:#FE1B04;font-weight:700;' : 'color:#6e6e73;'}">${t.overdue}</td><td style="padding:6px 0 6px 8px;border-bottom:1px solid #f0f0f2;font-size:13px;text-align:right;">${t.open}</td></tr>`).join('')

  const html = `<!doctype html><html><body style="margin:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
<div style="max-width:620px;margin:0 auto;padding:24px 16px;">
  <div style="display:flex;align-items:center;margin-bottom:18px;">
    <span style="display:inline-block;width:28px;height:28px;border-radius:7px;background:#FE1B04;color:#fff;text-align:center;line-height:28px;font-weight:900;font-size:16px;">✓</span>
    <span style="font-size:18px;font-weight:800;color:#FE1B04;margin-left:10px;">Task</span><span style="font-size:12px;font-weight:600;color:#6e6e73;margin-left:6px;">by Gershon.AI</span>
  </div>
  <h1 style="font-size:22px;margin:0 0 4px;">${esc(first)}, here is your week</h1>
  <p style="margin:0 0 16px;color:#6e6e73;font-size:13px;">Friday ${fmt(w.today)} · ${status}</p>
  ${box(`Late (${late.length})`, taskRows(late, 'late'), late.length ? '#FE1B04' : '#e5e7eb')}
  ${box(`Due next week (${next.length})`, taskRows(next, 'next'))}
  ${box(`Done this week (${w.doneLast7.length})`, taskRows(w.doneLast7, 'done', 8), '#057642')}
  ${box('Team this week', `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr style="font-size:11px;color:#6e6e73;text-transform:uppercase;"><td style="padding:4px 0;">Member</td><td style="padding:4px 8px;text-align:right;">Done</td><td style="padding:4px 8px;text-align:right;">Late</td><td style="padding:4px 0 4px 8px;text-align:right;">Open</td></tr>${team}</table>`)}
  <div style="text-align:center;margin:22px 0 8px;"><a href="${dash}" style="display:inline-block;background:#FE1B04;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:8px;">Open my dashboard →</a></div>
  <p style="text-align:center;font-size:11px;color:#6e6e73;margin-top:18px;">Sent every Friday to each member registered in Task (Settings → Team members). · <a href="${siteUrl()}" style="color:#6e6e73;">${siteUrl().replace('https://', '')}</a></p>
</div></body></html>`
  return { subject, html }
}

async function sendOne(key: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  const body = await res.json().catch(() => ({})) as { id?: string; message?: string }
  return { ok: res.ok, id: body.id, error: res.ok ? undefined : (body.message ?? res.status) }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const team = await loadTeam()
  const id = req.nextUrl.searchParams.get('member')
  const m = team.find(t => t.id === id) ?? team[0]
  const { subject, html } = buildEmail(m, await loadMyWork(m))
  if (req.nextUrl.searchParams.get('preview')) return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'x-subject': encodeURIComponent(subject) } })
  return NextResponse.json({ members: team.map(t => ({ id: t.id, name: t.name, email: t.email })), subject })
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const key = readEnv('RESEND_API_KEY')
  if (!key) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  const sp = req.nextUrl.searchParams
  const team = await loadTeam()
  const today = etToday()

  // Test: one report to one address (must be a member or the owner).
  const only = (sp.get('only') || '').toLowerCase().trim()
  if (only) {
    const allowed = team.some(t => t.email.toLowerCase() === only) || OWNER_EMAILS.includes(only)
    if (!allowed) return NextResponse.json({ error: 'only= must be a registered member or the owner' }, { status: 400 })
    const m = team.find(t => t.id === sp.get('member')) ?? team.find(t => t.email.toLowerCase() === only) ?? team[0]
    const { subject, html } = buildEmail(m, await loadMyWork(m))
    const r = await sendOne(key, only, '[test] ' + subject, html)
    return NextResponse.json({ test: true, to: only, member: m.name, ...r }, { status: r.ok ? 200 : 502 })
  }

  const supa = supabaseAdmin()
  const { data: st } = await supa.from('app_settings').select('value').eq('key', STATE_KEY).maybeSingle()
  const last = st?.value ? (JSON.parse(st.value) as { date?: string }).date : undefined
  if (last === today && !sp.get('force')) return NextResponse.json({ ok: true, skipped: 'already sent today', date: today })

  const results = []
  for (const m of team) {
    if (!m.email) { results.push({ member: m.name, ok: false, error: 'no email' }); continue }
    const { subject, html } = buildEmail(m, await loadMyWork(m))
    results.push({ member: m.name, to: m.email, ...(await sendOne(key, m.email, subject, html)) })
  }
  const sent = results.filter(r => r.ok).length
  if (sent) await supa.from('app_settings').upsert({ key: STATE_KEY, value: JSON.stringify({ date: today, sent, at: new Date().toISOString() }) }, { onConflict: 'key' })
  return NextResponse.json({ ok: sent === results.length, date: today, sent, results }, { status: sent ? 200 : 502 })
}
