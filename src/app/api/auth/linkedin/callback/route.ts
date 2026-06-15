export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { exchangeCode, getUserInfo } from '@/lib/linkedin'
import { getRequestContext } from '@cloudflare/next-on-pages'

function getSiteUrl(): string {
      try {
              return (getRequestContext().env as Record<string, string>).NEXT_PUBLIC_SITE_URL ?? ''
      } catch {
              return process.env.NEXT_PUBLIC_SITE_URL ?? ''
      }
}

export async function GET(req: NextRequest) {
      const code = req.nextUrl.searchParams.get('code')
      if (!code) return NextResponse.redirect('/')
      const token = await exchangeCode(code)
      const user = await getUserInfo(token)
      const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
      session.user = user
      await session.save()
      return NextResponse.redirect(`${getSiteUrl()}/dashboard`)
}
