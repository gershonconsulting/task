export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import Link from 'next/link'
import { DEFAULT_TOOLS } from '@/lib/templates'
import { loadTemplateMap } from '@/lib/templates/runtime'

export default async function ToolsPage() {
  const tplMap = await loadTemplateMap()
  const user = await getCurrentUser()
  const supa = supabaseAdmin()

  // Load tools from app_settings (falls back to DEFAULT_TOOLS)
  let tools = DEFAULT_TOOLS
  try {
    const { data } = await supa.from('app_settings').select('value').eq('key', 'tools').maybeSingle()
    if (data?.value) tools = JSON.parse(data.value)
  } catch { /* table may not exist yet */ }

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supa.from('tasks').select('id, name, status, assigned_to, due_date, priority, tool, project_id'),
    supa.from('projects').select('id, company_name, template_slug'),
  ])

  const allTasks = tasks ?? []
  const projectMap = new Map((projects ?? []).map(p => [p.id, p]))

  // Build tool lookup
  const toolMap = new Map(tools.map(t => [t.slug, t]))

  // Group tasks by tool slug
  const byTool = new Map<string, typeof allTasks>()
  for (const t of allTasks) {
    const key = t.tool ?? '__none__'
    byTool.set(key, [...(byTool.get(key) ?? []), t])
  }

  // Order: known tools first (in DEFAULT_TOOLS order), then "No tool"
  const entries: [string, typeof allTasks][] = []
  for (const tool of tools) {
    const tasks = byTool.get(tool.slug)
    if (tasks && tasks.length > 0) entries.push([tool.slug, tasks])
  }
  const noTool = byTool.get('__none__') ?? []
  if (noTool.length > 0) entries.push(['__none__', noTool])

  const STATUS_STYLE: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-amber-100 text-amber-700',
    pending: 'bg-slate-100 text-slate-500',
  }

  const totalTasks = allTasks.length
  const tooledTasks = allTasks.filter(t => t.tool).length

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="By Tool" pageSubtitle="Tasks grouped by the tool used">
      {/* Summary */}
      <div className="flex items-center gap-6 mb-6 text-sm text-slate-500">
        <span><span className="font-semibold text-slate-800">{totalTasks}</span> total tasks</span>
        <span><span className="font-semibold text-indigo-600">{tooledTasks}</span> with a tool assigned</span>
        <span><span className="font-semibold text-slate-400">{totalTasks - tooledTasks}</span> no tool</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-slate-400">No tasks found.</p>
      ) : (
        <div className="space-y-6">
          {entries.map(([slug, toolTasks]) => {
            const tool = toolMap.get(slug)
            const open = toolTasks.filter(t => t.status !== 'completed')
            const done = toolTasks.filter(t => t.status === 'completed')
            return (
              <div key={slug} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Tool header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    {tool ? (
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-semibold"
                        style={{ backgroundColor: tool.color }}
                      >
                        {tool.icon} {tool.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-sm font-semibold">
                        — No tool assigned
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    <span className="font-medium text-indigo-600">{open.length}</span> open · <span className="font-medium text-green-600">{done.length}</span> done
                  </div>
                </div>

                {/* Tasks */}
                <div className="divide-y divide-slate-50">
                  {toolTasks.slice(0, 15).map(t => {
                    const proj = projectMap.get(t.project_id ?? '')
                    const tpl = proj ? tplMap.get(proj.template_slug) : undefined
                    return (
                      <div key={t.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition">
                        <span className="flex-1 text-sm text-slate-800 truncate">{t.name}</span>
                        {t.assigned_to && (
                          <span className="text-xs text-slate-400 shrink-0 hidden md:block">{t.assigned_to.split(' ')[0]}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[t.status ?? 'pending']}`}>
                          {t.status === 'in_progress' ? 'In progress' : t.status === 'completed' ? 'Done' : 'Pending'}
                        </span>
                        {proj && (
                          <Link href={"/projects/" + proj.id} className="text-xs text-slate-300 hover:text-indigo-500 shrink-0 hidden lg:flex items-center gap-1">
                            {tpl?.icon ?? '📁'} <span className="max-w-[100px] truncate">{proj.company_name}</span>
                          </Link>
                        )}
                      </div>
                    )
                  })}
                  {toolTasks.length > 15 && (
                    <p className="px-6 py-3 text-xs text-slate-400">+{toolTasks.length - 15} more tasks</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
