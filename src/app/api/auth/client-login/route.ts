export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { verifyPassword } from '@/lib/password'

interface ClientRow {
  id: string; name: string; email: string;
  password_hash: string; must_change_password: boolean; project_ids: string[]
}

export async function POST(req: NextRequest) {
  let email: string, password: string
  try {
    const body = await req.json()
    email = (body.email ?? '').trim().toLowerCase()
    password = (body.password ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  const supa = supabaseAdmin()
  const { data, error } = await supa
    .from('clients')
    .select('id, name, email, password_hash, must_change_password, project_ids')
    .eq('email', email)
    .single()
  if (error || !data) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }
  const client = data as ClientRow
  const valid = await verifyPassword(password, client.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }
  const projectId = client.project_ids?.[0] ?? ''
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
  session.user = {
    id: client.id, name: client.name, email: client.email,
    role: 'client', projectId, mustChangePassword: client.must_change_password,
  }
  await session.save()
  return NextResponse.json({ ok: true, mustChangePassword: client.must_change_password, projectId })
}
