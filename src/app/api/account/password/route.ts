export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getSessionOptions, SessionData } from '@/lib/session'
import { isAdminEmail } from '@/lib/roles'

function getEnv(key: string): string {
    try {
          return (getRequestContext().env as Record<string, string>)[key] ?? ''
    } catch {
          return (process.env as Record<string, string | undefined>)[key] ?? ''
    }
}

export async function POST(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
    if (!session.user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  // Bootstrap admin users cannot change password via this route
  if (isAdminEmail(session.user.email)) {
        return NextResponse.json(
          { error: 'Bootstrap admin: manage password via ADMIN_PASSWORD env var.' },
          { status: 403 }
              )
  }

  let currentPassword: string, newPassword: string
    try {
          const body = await req.json()
          currentPassword = body.currentPassword ?? ''
          newPassword = body.newPassword ?? ''
    } catch {
          return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

  if (!currentPassword || !newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: 'Invalid password data' }, { status: 400 })
  }

  const adminPassword = getEnv('ADMIN_PASSWORD')
    if (currentPassword !== adminPassword) {
          return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

  // Note: for bootstrap path this would require updating ADMIN_PASSWORD env var.
  // For real DB users (Track A), this route will call supabase auth here.
  return NextResponse.json({ error: 'Password change not yet available for this account type.' }, { status: 403 })
}
