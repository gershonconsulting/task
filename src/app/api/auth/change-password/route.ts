export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { hashPassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
  if (!session.user || session.user.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let newPassword: string
  try {
    const body = await req.json()
    newPassword = (body.newPassword ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }
  const passwordHash = await hashPassword(newPassword)
  const supa = supabaseAdmin()
  const { error } = await supa.from('clients').update({ password_hash: passwordHash, must_change_password: false }).eq('id', session.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  session.user.mustChangePassword = false
  await session.save()
  return NextResponse.json({ ok: true })
}
