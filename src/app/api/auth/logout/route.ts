export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { siteUrl } from '@/lib/site'

async function signOut() {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
  session.destroy()
}

export async function GET() {
  await signOut()
  return NextResponse.redirect(`${siteUrl()}/login?signed_out=1`)
}

export async function POST() {
  await signOut()
  return NextResponse.json({ ok: true })
}
