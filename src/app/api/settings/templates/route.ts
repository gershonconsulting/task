export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { TEMPLATES, DEFAULT_TOOLS, type TemplateTask, type Tool } from '@/lib/templates'

export interface TemplateOverrides {
  [slug: string]: { tasks?: TemplateTask[] }
}

async function loadSetting(key: string): Promise<string | null> {
  try {
    const supa = supabaseAdmin()
    const { data, error } = await supa
      .from('app_settings').select('value').eq('key', key).single()
    if (error || !data) return null
    return data.value
  } catch { return null }
}

async function saveSetting(key: string, value: string): Promise<void> {
  const supa = supabaseAdmin()
  await supa.from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' })
}

async function loadOverrides(): Promise<TemplateOverrides> {
  const raw = await loadSetting('template_overrides')
  if (!raw) return {}
  try { return JSON.parse(raw) as TemplateOverrides } catch { return {} }
}

async function loadTools(): Promise<Tool[]> {
  const raw = await loadSetting('tools')
  if (!raw) return DEFAULT_TOOLS
  try { return JSON.parse(raw) as Tool[] } catch { return DEFAULT_TOOLS }
}

function mergeTemplates(overrides: TemplateOverrides) {
  return TEMPLATES.map(tpl => {
    const ov = overrides[tpl.slug]
    if (!ov) return tpl
    return { ...tpl, tasks: ov.tasks ?? tpl.tasks }
  })
}

// GET /api/settings/templates  -> { templates, overrides, tools }
export async function GET() {
  const [overrides, tools] = await Promise.all([loadOverrides(), loadTools()])
  const templates = mergeTemplates(overrides)
  return NextResponse.json({ templates, overrides, tools })
}

// PUT /api/settings/templates  -> save template overrides
export async function PUT(req: NextRequest) {
  let body: { overrides?: TemplateOverrides; tools?: Tool[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    if (body.overrides !== undefined) {
      if (typeof body.overrides !== 'object')
        return NextResponse.json({ error: 'Invalid overrides' }, { status: 400 })
      await saveSetting('template_overrides', JSON.stringify(body.overrides))
    }
    if (body.tools !== undefined) {
      if (!Array.isArray(body.tools))
        return NextResponse.json({ error: 'Invalid tools' }, { status: 400 })
      await saveSetting('tools', JSON.stringify(body.tools))
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
