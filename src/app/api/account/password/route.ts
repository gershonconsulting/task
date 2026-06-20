export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { isAdminEmail } from '@/lib/roles'
import { verifyPassword, hashPassword } from '@/lib/password'
import { supabaseAdmin } from '@/lib/supabaseServer'

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
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  // Load user from DB to verify current password
  const supabase = supabaseAdmin()
  const { data: dbUser, error: fetchError } = await supabase
    .from('app_users')
    .select('password_hash')
    .eq('email', session.user.email)
    .single()

  if (fetchError || !dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const valid = await verifyPassword(currentPassword, dbUser.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
  }

  // Hash new password and update DB
  const newHash = await hashPassword(newPassword)
  const { error: updateError } = await supabase
    .from('app_users')
    .update({ password_hash: newHash, must_change_password: false })
    .eq('email', session.user.email)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }

  // Update session to clear mustChangePassword flag
  session.user.mustChangePassword = false
  await session.save()

  return NextResponse.json({ ok: true })
}
