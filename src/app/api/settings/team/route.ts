export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'team'
}

const DEFAULT_TEAM: TeamMember[] = [
  { id: 'olivier', name: 'Olivier Attia',  email: 'olivier@gershonconsulting.com',       role: 'admin' },
  { id: 'winnie',  name: 'Winnie Lauren',  email: 'winnie.lauren@gershonconsulting.com', role: 'team'  },
  { id: 'aina',    name: 'Aina Rama',      email: 'aina.rama@gershonconsulting.com',     role: 'team'  },
  { id: 'sai',     name: 'Sai',            email: 'sai@gershonconsulting.com',           role: 'team'  },
]

async function loadTeam(supa: ReturnType<typeof supabaseAdmin>): Promise<TeamMember[]> {
  try {
    const { data, error } = await supa
      .from('app_settings').select('value').eq('key', 'team_members').single()
    if (error || !data) return DEFAULT_TEAM
    return JSON.parse(data.value) as TeamMember[]
  } catch { return DEFAULT_TEAM }
}

async function saveTeam(supa: ReturnType<typeof supabaseAdmin>, members: TeamMember[]): Promise<void> {
  await supa.from('app_settings')
    .upsert({ key: 'team_members', value: JSON.stringify(members) }, { onConflict: 'key' })
}

export async function GET() {
  const supa = supabaseAdmin()
  const members = await loadTeam(supa)
  return NextResponse.json({ members })
}

export async function PUT(req: NextRequest) {
  let body: { members?: TeamMember[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!Array.isArray(body.members))
    return NextResponse.json({ error: 'members must be an array' }, { status: 400 })
  try {
    const supa = supabaseAdmin()
    await saveTeam(supa, body.members)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
