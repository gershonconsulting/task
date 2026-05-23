import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'

export async function GET() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  session.destroy()
  return NextResponse.redirect(process.env.NEXT_PUBLIC_SITE_URL ?? '/')
}
