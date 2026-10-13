export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { readEnv, siteUrl } from '@/lib/site'

// LinkedIn app "Task" (client 785duwvn6q6z80). The client id is public; the secret is a Pages secret.
const LINKEDIN_CLIENT_ID_DEFAULT = '785duwvn6q6z80'

export function GET(req: NextRequest) {
  const clientId = readEnv('LINKEDIN_CLIENT_ID') || LINKEDIN_CLIENT_ID_DEFAULT
  const state = crypto.randomUUID()
  const next = req.nextUrl.searchParams.get('next') || '/dashboard'
  const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', `${siteUrl()}/api/auth/linkedin/callback`)
  url.searchParams.set('scope', 'openid profile email')
  url.searchParams.set('state', state)
  const res = NextResponse.redirect(url.toString())
  const opts = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: 600 }
  res.cookies.set('li_login_state', state, opts)
  res.cookies.set('li_login_next', next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard', opts)
  return res
}
