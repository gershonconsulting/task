export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, type SessionData } from '@/lib/session'
import { loadTeam, saveTeam, type TeamMember } from '@/lib/team'

export async function GET() {
  const members = await loadTeam()
  // linkedinSub is an internal binding; expose only whether it exists.
  return NextResponse.json({
    members: members.map(({ linkedinSub, ...m }) => ({ ...m, linkedinLinked: !!linkedinSub })),
  })
}

export async function PUT(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
  if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Only an admin can change the team' }, { status: 403 })

  let body: { members?: (TeamMember & { linkedinLinked?: boolean; unlink?: boolean })[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!Array.isArray(body.members))
    return NextResponse.json({ error: 'members must be an array' }, { status: 400 })

  const current = new Map((await loadTeam()).map(m => [m.id, m]))
  const next: TeamMember[] = body.members
    .filter(m => (m.name ?? '').trim())
    .map(({ linkedinLinked: _l, unlink, ...m }) => {
      const prev = current.get(m.id)
      return {
        ...m,
        name: m.name.trim(),
        email: (m.email ?? '').trim().toLowerCase(),
        linkedinEmail: (m.linkedinEmail ?? '').trim().toLowerCase() || undefined,
        linkedinSub: unlink ? undefined : prev?.linkedinSub,
        lastLogin: prev?.lastLogin,
      }
    })
  if (!next.some(m => m.role === 'admin'))
    return NextResponse.json({ error: 'Keep at least one admin' }, { status: 400 })
  try {
    await saveTeam(next)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
