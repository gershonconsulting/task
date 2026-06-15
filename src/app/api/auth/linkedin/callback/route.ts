export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { exchangeCode, getUserInfo } from '@/lib/linkedin'

export async function GET(req: NextRequest) {
        const code = req.nextUrl.searchParams.get('code')
        if (!code) return NextResponse.redirect('/')
          const redirectUri = `${req.nextUrl.origin}/api/auth/linkedin/callback`
        try {
                  const token = await exchangeCode(code, redirectUri)
                  const user = await getUserInfo(token)
                  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
                  session.user = user
                  await session.save()
                        return NextResponse.redirect(`${req.nextUrl.origin}/projects`)
        } catch (err) {
                  console.error('LinkedIn callback error:', err)
                        return NextResponse.redirect(`${req.nextUrl.origin}/login?error=auth_failed`)
        }
}
