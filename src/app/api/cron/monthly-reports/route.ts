export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createProjectFromTemplate } from '@/lib/projectCreate'

// Monthly templates to auto-create for every client each month
const MONTHLY_TEMPLATES = [
  { slug: 'monthly-report', label: 'Monthly Report' },
  { slug: 'facturation',    label: 'Facturation' },
]

// POST /api/cron/monthly-reports
// Called by Cloudflare cron on the 1st of each month OR manually from the Monthly Reports page
export async function POST(req: Request) {
  const supa = supabaseAdmin()
  const now  = new Date()

  const url   = new URL(req.url)
  const year  = parseInt(url.searchParams.get('year')  ?? String(now.getUTCFullYear()))
  const month = parseInt(url.searchParams.get('month') ?? String(now.getUTCMonth() + 1))
  const label     = year + '-' + String(month).padStart(2, '0')
  const startDate = year + '-' + String(month).padStart(2, '0') + '-01'

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
    if (!p.client_email) continue
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

  // Check which (template_slug, client_email, start_date) combos already exist
  const { data: existing } = await supa
    .from('projects')
    .select('client_email, template_slug')
    .in('template_slug', MONTHLY_TEMPLATES.map(t => t.slug))
    .eq('start_date', startDate)

  const alreadyHas = new Set((existing ?? []).map(p => p.template_slug + '|' + p.client_email))

  const summary: Record<string, { created: string[]; skipped: string[]; errors: string[] }> = {}
  for (const t of MONTHLY_TEMPLATES) summary[t.slug] = { created: [], skipped: [], errors: [] }

  for (const [email, client] of clientMap) {
    for (const tmpl of MONTHLY_TEMPLATES) {
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

  return NextResponse.json({ month: label, clients: clientMap.size, summary })
}
