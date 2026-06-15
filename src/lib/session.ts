import type { SessionOptions } from 'iron-session'
import { getRequestContext } from '@cloudflare/next-on-pages'

export interface SessionData {
    user?: { id: string; name: string; email: string; picture?: string }
}

function getEnv(key: string): string | undefined {
    try {
          return (getRequestContext().env as Record<string, string>)[key]
    } catch {
          return (process.env as Record<string, string | undefined>)[key]
    }
}

// Called at request time so SESSION_SECRET is always read from the live CF env.
export function getSessionOptions(): SessionOptions {
    return {
          password: getEnv('SESSION_SECRET') ?? 'fallback-secret-change-in-production-32chars',
          cookieName: 'gershon-task-session',
          cookieOptions: { secure: true },
    }
}

// Keep a lazy-evaluated export so callers that already import sessionOptions still work.
export const sessionOptions: SessionOptions = new Proxy({} as SessionOptions, {
    get(_t, prop) {
          return getSessionOptions()[prop as keyof SessionOptions]
    },
})
