export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

function getEnv(key: string): string {
    try {
          return (getRequestContext().env as Record<string, string>)[key] ?? ''
    } catch {
          return (process.env as Record<string, string | undefined>)[key] ?? ''
    }
}

export async function GET() {
    const params = new URLSearchParams({
          response_type: 'code',
          client_id: getEnv('LINKEDIN_CLIENT_ID'),
          redirect_uri: `${getEnv('NEXT_PUBLIC_SITE_URL')}/api/auth/linkedin/callback`,
          state: Math.random().toString(36).slice(2),
          scope: 'openid profile email',
    })
    return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
}
