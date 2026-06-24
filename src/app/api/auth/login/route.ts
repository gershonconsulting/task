export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabaseServer'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'team'
}

const DEFAULT_USERS: TeamMember[] = [
  { id: 'olivier', name: 'Olivier Attia', email: 'olivier@gershonconsulting.com', role: 'admin' },
  { id: 'winnie', name: 'Winnie Lauren', email: 'winnie.lauren@gershonconsulting.com', role: 'team' },
  { id: 'aina', name: 'Aina Rama', email: 'aina.rama@gershonconsulting.com', role: 'team' },
  { id: 'sai', name: 'Sai', email: 'sai@gershonconsulting.com', role: 'team' },
]

async function loadTeam(): Promise<TeamMember[]> {
  try {
    const supa = supabaseAdmin()
    const { data } = await supa.from('app_settings').select('value').eq('key', 'team_members').single()
    if (data?.value) return JSON.parse(data.value) as TeamMember[]
  } catch { /* ignore */ }
  return DEFAULT_USERS
}

export async function POST(req: NextRequest) {
  let person: string
  try {
    const body = await req.json()
    person = (body.person ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const team = await loadTeam()
  const user = team.find(m =>
    m.id === person ||
    m.name.toLowerCase() === person ||
    m.email.toLowerCase() === person
  )

  if (!user) {
    return NextResponse.json({ error: 'Unknown user' }, { status: 400 })
  }

  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
  session.user = { id: user.id, name: user.name, email: user.email, role: user.role }
  await session.save()
  return NextResponse.json({ ok: true })
}
