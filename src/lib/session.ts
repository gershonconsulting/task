import type { SessionOptions } from 'iron-session'
import { getRequestContext } from '@cloudflare/next-on-pages'

export interface SessionData {
  user?: {
    id: string;
    name: string;
    email: string;
    picture?: string;
    mustChangePassword?: boolean;
  }
}

export function getSessionOptions(): SessionOptions {
  let secret: string | undefined
  try {
    secret = (getRequestContext().env as Record<string, string>).SESSION_SECRET
  } catch {
    secret = process.env.SESSION_SECRET
  }
  return {
    password: secret ?? 'fallback-secret-change-in-production-32chars',
    cookieName: 'gershon-task-session',
    cookieOptions: { secure: true },
  }
}
