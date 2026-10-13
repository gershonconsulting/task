import { NextRequest, NextResponse } from 'next/server'
import { unsealData } from 'iron-session'
import { getSessionOptions, type SessionData } from '@/lib/session'
import { authEnforced, LEGACY_HOSTS, SITE_HOST } from '@/lib/site'

/**
 * 1. Old address (task.gershoncrm.com): pages and GET /api/auth/* → 308 to the
 *    same path on task.gershon.ai. Other /api/* still answer on the old host.
 * 2. Sign-in gate: every page and API needs a session, except the sign-in
 *    pages, the sign-in API and the scheduled jobs (which carry CRON_SECRET).
 */
function legacyRedirect(req: NextRequest): NextResponse | null {
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0]
  if (!LEGACY_HOSTS.includes(host)) return null
  const { pathname, search } = req.nextUrl
  const isApi = pathname.startsWith('/api/')
  const isAuthGet = req.method === 'GET' && pathname.startsWith('/api/auth/')
  if (isApi && !isAuthGet) return null
  if (!isApi && req.method !== 'GET' && req.method !== 'HEAD') return null
  return NextResponse.redirect(`https://${SITE_HOST}${pathname}${search}`, 308)
}

const PUBLIC_PREFIXES = ['/login', '/api/auth/', '/api/cron/', '/favicon', '/icon', '/robots.txt']

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p))
}

async function readUser(req: NextRequest): Promise<SessionData['user'] | null> {
  const opts = getSessionOptions()
  const seal = req.cookies.get(opts.cookieName)?.value
  if (!seal) return null
  try {
    const data = await unsealData<SessionData>(seal, { password: opts.password as string })
    return data?.user ?? null
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const moved = legacyRedirect(req)
  if (moved) return moved

  const { pathname, search } = req.nextUrl
  if (isPublic(pathname)) return NextResponse.next()
  if (!authEnforced()) return NextResponse.next()

  const user = await readUser(req)
  if (user) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const to = new URL('/login', req.url)
  if (pathname !== '/') to.searchParams.set('next', pathname + search)
  return NextResponse.redirect(to)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
