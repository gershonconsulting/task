export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getSessionOptions, SessionData } from '@/lib/session'
import { isTeamEmail } from '@/lib/roles'

function getEnv(key: string): string {
  try {
    return (getRequestContext().env as Record<string, string>)[key] ?? ''
  } catch {
    return (process.env as Record<string, string | undefined>)[key] ?? ''
  }
}

export async function POST(req: NextRequest) {
  let email: string, password: string
  try {
    const body = await req.json()
    email = (body.email ?? '').trim().toLowerCase()
    password = body.password ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const adminPassword = getEnv('ADMIN_PASSWORD')
  if (!adminPassword) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!isTeamEmail(email) || password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const displayName = email.split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
  session.user = {
    id: email,
    name: displayName,
    email,
  }
  await session.save()

  return NextResponse.json({ ok: true })
}
