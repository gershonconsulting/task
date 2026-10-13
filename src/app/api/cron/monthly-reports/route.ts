export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createProjectFromTemplate } from '@/lib/projectCreate'
import { MONTHLY_TEMPLATE_SLUGS, TEMPLATES } from '@/lib/templates'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, type SessionData } from '@/lib/session'
import { readEnv } from '@/lib/site'
import { INTERNAL_EMAIL } from '@/lib/clientBoard'

/** Allowed callers: the scheduled job (Bearer CRON_SECRET) or a signed-in team member. */
async function authorized(req: Request): Promise<{ ok: boolean; fromPage: boolean }> {
  const secret = readEnv('CRON_SECRET')
  if (secret && req.headers.get('authorization') === 'Bearer ' + secret) return { ok: true, fromPage: false }
  try {
    const s = await getIronSession<SessionData>(await cookies(), getSessionOptions())
    if (s.user && s.user.role !== 'client') return { ok: true, fromPage: true }
  } catch { /* no session */ }
  return { ok: false, fromPage: false }
}

// POST /api/cron/monthly-reports
// Called by Cloudflare cron on the 1st of each month OR manually from the Monthly Reports page
export async function POST(req: Request) {
  const auth = await authorized(req)
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supa = supabaseAdmin()
  const now  = new Date()

  const url   = new URL(req.url)
  const year  = parseInt(url.searchParams.get('year')  ?? String(now.getUTCFullYear()))
  const month = parseInt(url.searchParams.get('month') ?? String(now.getUTCMonth() + 1))
  const label     = year + '-' + String(month).padStart(2, '0')
  const startDate = year + '-' + String(month).padStart(2, '0') + '-01'

  // Build monthly template descriptors from the canonical list
  const monthlyTemplates = MONTHLY_TEMPLATE_SLUGS.map(slug => ({
    slug,
    label: TEMPLATES.find(t => t.slug === slug)?.label ?? slug,
  }))

  const { data: projects, error: projErr } = await supa
    .from('projects')
    .select('client_email, company_name, client_first_name, client_last_name, client_domain, created_by_email')

  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })

  // Build unique client map
  const clientMap = new Map<string, {
    email: string; companyName: string; firstName?: string; lastName?: string;
    domain?: string; createdBy: string;
  }>()
  for (const p of projects ?? []) {
    if (!p.client_email || p.client_email === INTERNAL_EMAIL) continue
    if (!clientMap.has(p.client_email)) {
      clientMap.set(p.client_email, {
        email:       p.client_email,
        companyName: p.company_name,
        firstName:   p.client_first_name ?? undefined,
        lastName:    p.client_last_name  ?? undefined,
        domain:      p.client_domain     ?? undefined,
        createdBy:   p.created_by_email  ?? 'cron@gershonconsulting.com',
      })
    }
  }

  if (clientMap.size === 0) {
    return NextResponse.json({ message: 'No clients found', created: 0 })
  }

  // Check which combos already exist for this month
  const { data: existing } = await supa
    .from('projects')
    .select('client_email, template_slug')
    .in('template_slug', MONTHLY_TEMPLATE_SLUGS)
    .eq('start_date', startDate)

  const alreadyHas = new Set((existing ?? []).map(p => p.template_slug + '|' + p.client_email))

  const summary: Record<string, { created: string[]; skipped: string[]; errors: string[] }> = {}
  for (const t of monthlyTemplates) summary[t.slug] = { created: [], skipped: [], errors: [] }

  for (const [email, client] of clientMap) {
    for (const tmpl of monthlyTemplates) {
      const key = tmpl.slug + '|' + email
      if (alreadyHas.has(key)) { summary[tmpl.slug].skipped.push(email); continue }
      try {
        await createProjectFromTemplate({
          templateSlug:    tmpl.slug,
          companyName:     client.companyName,
          clientFirstName: client.firstName,
          clientLastName:  client.lastName,
          clientEmail:     email,
          clientDomain:    client.domain,
          startDate,
          createdByEmail:  client.createdBy,
        })
        summary[tmpl.slug].created.push(email)
      } catch (e) {
        summary[tmpl.slug].errors.push(email + ': ' + (e instanceof Error ? e.message : String(e)))
      }
    }
  }

  if (auth.fromPage) {
    // Coming from the Monthly Reports button: go back to the page with a short result.
    const created = Object.values(summary).reduce((n, x) => n + x.created.length, 0)
    const errors = Object.values(summary).reduce((n, x) => n + x.errors.length, 0)
    return NextResponse.redirect(new URL(`/monthly-reports?generated=${created}&month=${label}${errors ? '&errors=' + errors : ''}`, req.url), 303)
  }
  return NextResponse.json({ month: label, clients: clientMap.size, summary })
}
