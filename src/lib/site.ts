import { getRequestContext } from '@cloudflare/next-on-pages'

/**
 * The address of this app — ONE place.
 *
 * v1.0.0 (2026-10-13): Task moved from task.gershoncrm.com to task.gershon.ai,
 * following the domain-move playbook proven on Social
 * (gershonconsulting/social → docs/DOMAIN-MOVE-PLAYBOOK.md).
 * Both domains point at the same Cloudflare Pages project (gershon-task).
 *
 *   - Pages on the old domain 308-redirect to the same path on the new one
 *     (src/middleware.ts), so bookmarks and e-mailed links keep working.
 *   - /api/* keeps answering on the old domain (except GET /api/auth/*), so
 *     older scheduled jobs keep working. Never remove the old domain from Pages.
 */
/**
 * THE SWITCH. false = the app still lives on task.gershoncrm.com (task.gershon.ai
 * is not attached to the Pages project yet). Flip to true only once
 * https://task.gershon.ai/login answers 200 — then the old host starts redirecting.
 */
export const NEW_DOMAIN_LIVE = false

export const NEW_HOST = 'task.gershon.ai'
export const OLD_HOST = 'task.gershoncrm.com'
export const SITE_HOST = NEW_DOMAIN_LIVE ? NEW_HOST : OLD_HOST
export const SITE_ORIGIN = `https://${SITE_HOST}`

/** Hosts that used to serve this app and now hand page views to SITE_HOST. */
export const LEGACY_HOSTS = NEW_DOMAIN_LIVE ? [OLD_HOST] : []

export const APP_NAME = 'Task'
export const APP_FULL_NAME = 'Task by Gershon.AI'

export function siteUrl(): string {
  // NEXT_PUBLIC_SITE_URL is only trusted when it names the current host
  // (Pages keeps a stale value until the next deploy).
  const env = (readEnv('NEXT_PUBLIC_SITE_URL') || '').trim().replace(/\/+$/, '')
  if (env && env.includes(SITE_HOST)) return env
  return SITE_ORIGIN
}

/** Read a runtime env var on Cloudflare Pages (request context) or Node (dev). */
export function readEnv(name: string): string | undefined {
  try {
    const v = (getRequestContext().env as Record<string, string | undefined>)[name]
    if (v) return v
  } catch { /* not on Pages */ }
  return process.env[name]
}

/**
 * The sign-in gate is enforced only when LinkedIn sign-in can actually work
 * (its secret is on the server). If the secret is ever missing the app stays
 * usable instead of locking the whole team out; /api/auth/linkedin/health says which.
 */
export function authEnforced(): boolean {
  return !!readEnv('LINKEDIN_CLIENT_SECRET')
}
