export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabaseServer'

// GET /api/templates — list all custom templates
export async function GET() {
  try {
    const supa = supabaseAdmin()
    const { data, error } = await supa
      .from('custom_templates')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      // Table may not exist yet — return empty array gracefully
      if (error.code === '42P01') {
        return NextResponse.json({ templates: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ templates: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// POST /api/templates — create a new custom template
export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
  const createdBy = session.user?.name ?? 'unknown'

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const label = (body.label as string ?? '').trim()
  const slug = (body.slug as string ?? '').trim()
  const icon = (body.icon as string ?? '📋').trim()
  const color = (body.color as string ?? '#6366f1').trim()
  const description = (body.description as string ?? '').trim()
  const tasks = body.tasks ?? []

  if (!label) return NextResponse.json({ error: 'Template name is required.' }, { status: 400 })
  if (!slug) return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, and hyphens only.' }, { status: 400 })
  }
  if (!Array.isArray(tasks)) {
    return NextResponse.json({ error: 'Tasks must be an array.' }, { status: 400 })
  }

  try {
    const supa = supabaseAdmin()
    const { data, error } = await supa
      .from('custom_templates')
      .insert({ label, slug, icon, color, description, tasks, created_by: createdBy })
      .select('id, slug')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A template with that slug already exists.' }, { status: 409 })
      }
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'The custom_templates table does not exist yet. Run the migration in supabase/migrations/20260622_custom_templates.sql first.',
        }, { status: 503 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data.id, slug: data.slug })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

