export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { createProjectFromTemplate } from '@/lib/projectCreate'

// Called automatically by Cloudflare cron on the 1st of each month (wrangler.toml)
// Also callable manually via POST from the Monthly Reports page (Generate button)
export async function POST(req: Request) {
  // Optional: protect with a shared secret so only Cloudflare can call it
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('x-cron-secret')
    if (auth !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supa = supabaseAdmin()
  const now  = new Date()

  // Target: the current month (or pass ?year=&month= for manual back-fill)
  const url    = new URL(req.url)
  const year   = parseInt(url.searchParams.get('year')  ?? String(now.getUTCFullYear()))
  const month  = parseInt(url.searchParams.get('month') ?? String(now.getUTCMonth() + 1)) // 1-12
  const label  = `${year}-${String(month).padStart(2, '0')}` // e.g. "2026-06"
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`

  // 1. Find all distinct clients (by client_email) that have at least one project
  const { data: projects, error: projErr } = await supa
    .from('projects')
    .select('client_email, company_name, client_first_name, client_last_name, client_domain, created_by_email')

  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })

  // Deduplicate by client_email — keep the most recent info per client
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

  // 2. Check which clients already have a monthly-report for this label
  const { data: existing } = await supa
    .from('projects')
    .select('client_email')
    .eq('template_slug', 'monthly-report')
    .eq('start_date', startDate)

  const alreadyHas = new Set((existing ?? []).map(p => p.client_email))

  // 3. Create missing monthly reports
  const created: string[] = []
  const skipped: string[] = []
  const errors:  string[] = []

  for (const [email, client] of clientMap) {
    if (alreadyHas.has(email)) {
      skipped.push(email)
      continue
    }
    try {
      await createProjectFromTemplate({
        templateSlug:     'monthly-report',
        companyName:      client.companyName,
        clientFirstName:  client.firstName,
        clientLastName:   client.lastName,
        clientEmail:      email,
        clientDomain:     client.domain,
        startDate,
        createdByEmail:   client.createdBy,
      })
      created.push(email)
    } catch (e) {
      errors.push(`${email}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({
    month: label,
    clients: clientMap.size,
    created: created.length,
    skipped: skipped.length,
    errors,
    createdFor: created,
  })
}

// Cloudflare scheduled handler (wrangler cron)
export async function scheduled(event: ScheduledEvent, env: unknown, ctx: ExecutionContext) {
  const baseUrl = (env as Record<string, string>).NEXT_PUBLIC_SITE_URL ?? 'https://task.gershoncrm.com'
  ctx.waitUntil(
    fetch(`${baseUrl}/api/cron/monthly-reports`, { method: 'POST' })
  )
}
