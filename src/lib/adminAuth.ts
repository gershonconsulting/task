import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSessionOptions, type SessionData } from '@/lib/session'
import { isOwnerUser } from '@/lib/team'

/** For /api/admin/*: returns the owner's session user, or a 403 response. */
export async function requireOwnerApi(): Promise<{ user: NonNullable<SessionData['user']> } | { res: NextResponse }> {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
  const u = session.user
  if (!u) return { res: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  if (!isOwnerUser(u)) return { res: NextResponse.json({ error: 'Only Olivier (owner admin) can manage users' }, { status: 403 }) }
  return { user: u }
}
