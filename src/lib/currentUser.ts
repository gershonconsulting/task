import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, type SessionData } from '@/lib/session'

export interface CurrentUser {
  name: string
  email: string
  role: 'admin' | 'team' | 'client'
}

// While login is disabled, everyone is treated as Olivier (admin).
// Replace with real session logic when auth is re-enabled.
export async function getCurrentUser(): Promise<CurrentUser> {
  try {
    const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
    if (session.user) {
      return {
        name: session.user.name,
        email: session.user.email,
        role: 'admin', // SessionData.user doesn't expose role — default to admin
      }
    }
  } catch {
    // No session / iron-session not configured — fall through to default
  }
  // Default: Olivier Attia (admin) while login is off
  return { name: 'Olivier Attia', email: 'olivier@gershonconsulting.com', role: 'admin' }
}
