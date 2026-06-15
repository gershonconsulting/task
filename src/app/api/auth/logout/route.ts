export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { getRequestContext } from '@cloudflare/next-on-pages'

function getSiteUrl(): string {
      try {
              return (getRequestContext().env as Record<string, string>).NEXT_PUBLIC_SITE_URL ?? '/'
      } catch {
              return process.env.NEXT_PUBLIC_SITE_URL ?? '/'
      }
}

export async function GET() {
      const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
      session.destroy()
      return NextResponse.redirect(getSiteUrl())
}
