export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getSessionOptions, SessionData } from '@/lib/session'
import { isAdminEmail, isTeamEmail } from '@/lib/roles'
import { verifyPassword } from '@/lib/password'
import { supabaseAdmin } from '@/lib/supabaseServer'

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

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // Path 1: check app_users table (DB users — Winnie, Aina, future users)
  if (isTeamEmail(email) && !isAdminEmail(email)) {
    const supabase = supabaseAdmin()
    const { data: dbUser, error } = await supabase
      .from('app_users')
      .select('email, password_hash, display_name, must_change_password')
      .eq('email', email)
      .single()

    if (error || !dbUser) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await verifyPassword(password, dbUser.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
    session.user = {
      id: dbUser.email,
      name: dbUser.display_name || dbUser.email.split('@')[0],
      email: dbUser.email,
      mustChangePassword: dbUser.must_change_password ?? false,
    }
    await session.save()
    return NextResponse.json({ ok: true, mustChangePassword: dbUser.must_change_password })
  }

  // Path 2: bootstrap admin path (Olivier only)
  if (isAdminEmail(email)) {
    const adminPassword = getEnv('ADMIN_PASSWORD')
    if (!adminPassword) {
      return NextResponse.json({ error: 'Server misconfigured: missing ADMIN_PASSWORD' }, { status: 500 })
    }
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    const displayName = email.split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
    const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
    session.user = { id: email, name: displayName, email }
    await session.save()
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
