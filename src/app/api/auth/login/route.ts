export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'

const USERS: Record<string, { id: string; name: string; email: string }> = {
    olivier: { id: 'olivier', name: 'Olivier Attia', email: 'olivier@gershonconsulting.com' },
    winnie:  { id: 'winnie',  name: 'Winnie Lauren', email: 'winnie.lauren@gershonconsulting.com' },
    aina:    { id: 'aina',    name: 'Aina Rama',     email: 'aina.rama@gershonconsulting.com' },
}

export async function POST(req: NextRequest) {
    let person: string
    try {
          const body = await req.json()
          person = (body.person ?? '').trim().toLowerCase()
    } catch {
          return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

  const user = USERS[person]
    if (!user) {
          return NextResponse.json({ error: 'Unknown user' }, { status: 400 })
    }

  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
    session.user = user
    await session.save()
    return NextResponse.json({ ok: true })
}
