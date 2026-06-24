import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, type SessionData } from '@/lib/session'
import { redirect } from 'next/navigation'

export interface CurrentUser {
  name: string
  email: string
  role: 'admin' | 'team' | 'client'
  projectId?: string
  mustChangePassword?: boolean
}

export async function getCurrentUser(): Promise<CurrentUser> {
  try {
    const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
    if (session.user) {
      return {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role ?? 'team',
        projectId: session.user.projectId,
        mustChangePassword: session.user.mustChangePassword,
      }
    }
  } catch {
    // No session / iron-session not configured
  }
  // Default: Olivier Attia (admin) while login is active
  return { name: 'Olivier Attia', email: 'olivier@gershonconsulting.com', role: 'admin' }
}

// Use in pages to redirect clients to /client
export async function requireNonClient(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (user.role === 'client') redirect('/client')
  return user
}

// Use in client-only pages
export async function requireClient(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (user.role !== 'client') redirect('/login')
  return user
}
