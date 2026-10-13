export const runtime = 'edge'

import { NextResponse } from 'next/server'

// The old "pick your name" sign-in let anyone act as anyone. Team members now
// sign in with LinkedIn (/api/auth/linkedin/login). Kept as 410 so old pages fail loudly.
export function POST() {
  return NextResponse.json({ error: 'Sign in with LinkedIn: /api/auth/linkedin/login' }, { status: 410 })
}
