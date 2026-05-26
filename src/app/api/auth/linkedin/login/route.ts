export const runtime = 'edge'

import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/linkedin/callback`,
    state: Math.random().toString(36).slice(2),
    scope: 'openid profile email',
  })
  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
}
