import type { SessionOptions } from 'iron-session'

export interface SessionData {
  user?: { id: string; name: string; email: string; picture?: string }
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'fallback-secret-change-in-production-32chars',
  cookieName: 'gershon-task-session',
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
}
