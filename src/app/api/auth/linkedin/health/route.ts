export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { authEnforced, readEnv, siteUrl } from '@/lib/site'

// Says whether LinkedIn sign-in is wired — never returns a secret value.
export function GET() {
  return NextResponse.json({
    site: siteUrl(),
    redirectUri: `${siteUrl()}/api/auth/linkedin/callback`,
    clientId: readEnv('LINKEDIN_CLIENT_ID') || '785duwvn6q6z80 (default)',
    clientSecretConfigured: !!readEnv('LINKEDIN_CLIENT_SECRET'),
    signInEnforced: authEnforced(),
    sessionSecretConfigured: (readEnv('SESSION_SECRET') || '').length >= 32,
  })
}
