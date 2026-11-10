export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwnerApi } from '@/lib/adminAuth'
import { loadTeam, saveTeam } from '@/lib/team'
import { readEnv, siteUrl } from '@/lib/site'
import { newToken, toAdminUser } from '@/lib/adminUsers'

/**
 * POST {id, send?: boolean, regenerate?: boolean}
 * Makes sure the user has a live invite link; with send=true e-mails it to them.
 */
const FROM = 'GC Task <reports@gershon.ai>'

function esc(s: unknown): string { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)) }

export async function POST(req: NextRequest) {
  const gate = await requireOwnerApi(); if ('res' in gate) return gate.res
  let b: { id?: string; send?: boolean; regenerate?: boolean }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const team = await loadTeam()
  const i = team.findIndex(m => m.id === b.id)
  if (i < 0) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const m = { ...team[i] }
  if (m.linkedinSub) return NextResponse.json({ error: `${m.name} already signs in with LinkedIn — use "Reset LinkedIn" first to move them to another account` }, { status: 409 })
  if (!m.inviteToken || b.regenerate) { m.inviteToken = newToken(); m.invitedAt = new Date().toISOString() }
  const next = [...team]; next[i] = m
  await saveTeam(next)

  const url = `${siteUrl()}/login?invite=${m.inviteToken}`
  let sent = false
  if (b.send) {
    if (!m.email) return NextResponse.json({ error: 'This user has no work e-mail — copy the link instead', user: toAdminUser(m) }, { status: 400 })
    const key = readEnv('RESEND_API_KEY')
    if (!key) return NextResponse.json({ error: 'E-mail is not configured on the server — copy the link instead', user: toAdminUser(m) }, { status: 500 })
    const first = esc(m.name.split(' ')[0])
    const html = `<!doctype html><html><body style="margin:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
<div style="max-width:560px;margin:0 auto;padding:28px 16px;">
  <div style="margin-bottom:18px;"><span style="display:inline-block;width:28px;height:28px;border-radius:7px;background:#FE1B04;color:#fff;text-align:center;line-height:28px;font-weight:900;">✓</span>
  <span style="font-weight:800;font-size:18px;color:#FE1B04;vertical-align:middle;margin-left:8px;">Task</span> <span style="color:#6e6e73;font-size:13px;vertical-align:middle;">by Gershon.AI</span></div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:24px;">
    <h1 style="margin:0 0 10px;font-size:20px;">Hi ${first}, your access is ready</h1>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#3a3a3c;">Olivier Attia added you to <strong>Task by Gershon.AI</strong>, the Gershon Consulting task platform. Sign in once with your LinkedIn account through the button below — after that, the normal “Sign in with LinkedIn” button works.</p>
    <a href="${esc(url)}" style="display:inline-block;background:#0a66c2;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;font-size:15px;">Sign in with LinkedIn</a>
    <p style="margin:18px 0 0;font-size:12px;color:#6e6e73;">This link is personal and works once. If the button does not work, open: ${esc(url)}</p>
  </div>
</div></body></html>`
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [m.email], reply_to: 'olivier@gershonconsulting.com', subject: 'Your access to Task by Gershon.AI', html }),
    })
    if (!r.ok) return NextResponse.json({ error: 'E-mail failed: ' + (await r.text()).slice(0, 200), user: toAdminUser(m) }, { status: 502 })
    sent = true
  }
  return NextResponse.json({ ok: true, sent, inviteUrl: url, user: toAdminUser(m) })
}
