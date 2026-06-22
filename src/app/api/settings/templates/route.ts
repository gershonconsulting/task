export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { TEMPLATES, type ProcessTemplate, type TemplateTask } from '@/lib/templates'

export interface TemplateOverrides {
  [slug: string]: {
    tasks?: TemplateTask[]
  }
}

async function loadOverrides(): Promise<TemplateOverrides> {
  try {
    const supa = supabaseAdmin()
    const { data, error } = await supa
      .from('app_settings')
      .select('value')
      .eq('key', 'template_overrides')
      .single()
    if (error || !data) return {}
    return JSON.parse(data.value) as TemplateOverrides
  } catch {
    return {}
  }
}

export function mergeTemplates(overrides: TemplateOverrides): ProcessTemplate[] {
  return TEMPLATES.map(tpl => {
    const ov = overrides[tpl.slug]
    if (!ov) return tpl
    return { ...tpl, tasks: ov.tasks ?? tpl.tasks }
  })
}

export async function GET() {
  const overrides = await loadOverrides()
  const templates = mergeTemplates(overrides)
  return NextResponse.json({ templates, overrides })
}

export async function PUT(req: NextRequest) {
  let body: { overrides: TemplateOverrides }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { overrides } = body
  if (!overrides || typeof overrides !== 'object') {
    return NextResponse.json({ error: 'Missing overrides' }, { status: 400 })
  }
  try {
    const supa = supabaseAdmin()
    const { error } = await supa
      .from('app_settings')
      .upsert({ key: 'template_overrides', value: JSON.stringify(overrides) }, { onConflict: 'key' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
    }
