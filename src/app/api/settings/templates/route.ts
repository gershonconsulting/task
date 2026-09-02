export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { DEFAULT_TOOLS, type ProcessTemplate, type Tool } from '@/lib/templates'
import {
  loadTemplateSettings,
  buildTemplateList,
  type TemplateOverrides,
} from '@/lib/templates/runtime'

export type { TemplateOverrides }

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

async function loadTools(): Promise<Tool[]> {
  const raw = await loadSetting('tools')
  if (!raw) return DEFAULT_TOOLS
  try { return JSON.parse(raw) as Tool[] } catch { return DEFAULT_TOOLS }
}

/** Keep only the fields we understand, so a malformed client payload can't poison the store. */
function sanitizeCustom(input: unknown): ProcessTemplate[] {
  if (!Array.isArray(input)) return []
  const out: ProcessTemplate[] = []
  for (const raw of input) {
    const t = raw as Partial<ProcessTemplate>
    const slug = typeof t.slug === 'string' ? t.slug.trim() : ''
    const label = typeof t.label === 'string' ? t.label.trim() : ''
    if (!slug || !label) continue
    out.push({
      slug,
      label,
      icon: typeof t.icon === 'string' && t.icon ? t.icon : '📁',
      color: typeof t.color === 'string' && t.color ? t.color : '#6366f1',
      description: typeof t.description === 'string' ? t.description : '',
      category: typeof t.category === 'string' && t.category ? t.category : 'Custom',
      projectType: t.projectType === 'simple' || t.projectType === 'complex' ? t.projectType : 'advanced',
      tasks: Array.isArray(t.tasks)
        ? t.tasks
            .filter(task => task && typeof task.name === 'string')
            .map((task, i) => ({
              id: typeof task.id === 'string' && task.id ? task.id : slug.substring(0, 3) + '-' + (i + 1),
              name: task.name,
              description: typeof task.description === 'string' ? task.description : undefined,
              assignedTo: typeof task.assignedTo === 'string' ? task.assignedTo : null,
              priority: task.priority === 'low' || task.priority === 'high' ? task.priority : 'medium',
              dueOffsetDays: typeof task.dueOffsetDays === 'number' ? task.dueOffsetDays : undefined,
              tool: typeof task.tool === 'string' && task.tool ? task.tool : undefined,
            }))
        : [],
    })
  }
  return out
}

// GET /api/settings/templates -> { templates, overrides, tools, customTemplates, customSlugs, order }
export async function GET() {
  const [settings, tools] = await Promise.all([loadTemplateSettings(), loadTools()])
  const templates = buildTemplateList(settings)
  return NextResponse.json({
    templates,
    overrides: settings.overrides,
    customTemplates: settings.custom,
    customSlugs: settings.custom.map(t => t.slug),
    order: settings.order.length ? settings.order : templates.map(t => t.slug),
    tools,
  })
}

// PUT /api/settings/templates -> save overrides, custom templates, order and tools
export async function PUT(req: NextRequest) {
  let body: {
    overrides?: TemplateOverrides
    tools?: Tool[]
    customTemplates?: unknown
    order?: unknown
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    if (body.overrides !== undefined) {
      if (typeof body.overrides !== 'object' || body.overrides === null)
        return NextResponse.json({ error: 'Invalid overrides' }, { status: 400 })
      await saveSetting('template_overrides', JSON.stringify(body.overrides))
    }
    if (body.tools !== undefined) {
      if (!Array.isArray(body.tools))
        return NextResponse.json({ error: 'Invalid tools' }, { status: 400 })
      await saveSetting('tools', JSON.stringify(body.tools))
    }
    if (body.customTemplates !== undefined) {
      if (!Array.isArray(body.customTemplates))
        return NextResponse.json({ error: 'Invalid customTemplates' }, { status: 400 })
      await saveSetting('custom_templates', JSON.stringify(sanitizeCustom(body.customTemplates)))
    }
    if (body.order !== undefined) {
      if (!Array.isArray(body.order))
        return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
      const order = (body.order as unknown[]).filter(s => typeof s === 'string')
      await saveSetting('template_order', JSON.stringify(order))
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
