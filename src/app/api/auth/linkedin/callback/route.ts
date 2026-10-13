export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, type SessionData } from '@/lib/session'
import { readEnv, siteUrl } from '@/lib/site'
import { loadTeam, saveTeam, matchMember, type LinkedInIdentity } from '@/lib/team'

const DEFAULT_CLIENT_ID = '785duwvn6q6z80'

function fail(reason: string, detail?: string) {
  const u = new URL('/login', siteUrl())
  u.searchParams.set('error', reason)
  if (detail) u.searchParams.set('detail', detail.slice(0, 160))
  const res = NextResponse.redirect(u.toString())
  res.cookies.delete('li_login_state')
  return res
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  if (sp.get('error')) return fail('linkedin_cancelled', sp.get('error_description') || sp.get('error') || '')
  const code = sp.get('code')
  const state = sp.get('state')
  const jar = await cookies()
  const expected = jar.get('li_login_state')?.value
  if (!code || !state || !expected || state !== expected) return fail('state')

  const clientSecret = readEnv('LINKEDIN_CLIENT_SECRET')
  if (!clientSecret) return fail('not_configured')

  // 1. code → access token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${siteUrl()}/api/auth/linkedin/callback`,
      client_id: readEnv('LINKEDIN_CLIENT_ID') || DEFAULT_CLIENT_ID,
      client_secret: clientSecret,
    }),
  })
  if (!tokenRes.ok) return fail('token', await tokenRes.text().catch(() => ''))
  const { access_token } = (await tokenRes.json()) as { access_token?: string }
  if (!access_token) return fail('token')

  // 2. who is this? (no `cache` option: Workers rejects it)
  const infoRes = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${access_token}` } })
  if (!infoRes.ok) return fail('userinfo', await infoRes.text().catch(() => ''))
  const li = (await infoRes.json()) as LinkedInIdentity
  if (!li.sub) return fail('userinfo')

  // 3. must be a registered member (Settings → Team members)
  const team = await loadTeam()
  const member = matchMember(team, li)
  if (!member) return fail('not_registered', li.name || li.email || '')

  // 4. bind this LinkedIn account to the member so the next sign-in is exact
  try {
    const now = new Date().toISOString()
    const updated = team.map(m => m.id === member.id
      ? { ...m, linkedinSub: li.sub, linkedinEmail: m.linkedinEmail || li.email || undefined, lastLogin: now }
      : m)
    if (team.some(m => m.id === member.id)) await saveTeam(updated)
  } catch { /* sign-in still succeeds */ }

  const session = await getIronSession<SessionData>(jar, getSessionOptions())
  session.user = { id: member.id, name: member.name, email: member.email, role: member.role, picture: li.picture }
  await session.save()

  const next = jar.get('li_login_next')?.value || '/dashboard'
  const res = NextResponse.redirect(new URL(next, siteUrl()).toString())
  res.cookies.delete('li_login_state')
  res.cookies.delete('li_login_next')
  return res
}
