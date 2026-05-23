import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import { exchangeCode, getUserInfo } from '@/lib/linkedin'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect('/')
  const token = await exchangeCode(code)
  const user = await getUserInfo(token)
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  session.user = user
  await session.save()
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`)
}
