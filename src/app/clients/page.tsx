export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import Link from 'next/link'
import { getTemplate } from '@/lib/templates'

export default async function ClientsPage() {
  const user = await getCurrentUser()
  const supa = supabaseAdmin()

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supa.from('projects').select('id, company_name, client_email, template_slug, updated_at'),
    supa.from('tasks').select('id, name, status, assigned_to, due_date, priority, tool, project_id'),
  ])

  const allProjects = projects ?? []
  const allTasks = tasks ?? []

  // Map project_id -> project
  const projectMap = new Map(allProjects.map(p => [p.id, p]))

  // Group projects by client_email
  const byClient = new Map<string, typeof allProjects>()
  for (const p of allProjects) {
    const key = p.client_email ?? p.company_name ?? 'Unknown'
    byClient.set(key, [...(byClient.get(key) ?? []), p])
  }

  // Sort clients by most recent project
  const clients = Array.from(byClient.entries()).sort((a, b) => {
    const aDate = Math.max(...a[1].map(p => new Date(p.updated_at ?? 0).getTime()))
    const bDate = Math.max(...b[1].map(p => new Date(b[1][0].updated_at ?? 0).getTime()))
    return bDate - aDate
  })

  // Group tasks by project_id
  const tasksByProject = new Map<string, typeof allTasks>()
  for (const t of allTasks) {
    if (!t.project_id) continue
    tasksByProject.set(t.project_id, [...(tasksByProject.get(t.project_id) ?? []), t])
  }

  const STATUS_COLOR: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-amber-100 text-amber-700',
    pending: 'bg-slate-100 text-slate-600',
  }
  const PRIORITY_DOT: Record<string, string> = {
    high: 'bg-red-400',
    medium: 'bg-amber-400',
    low: 'bg-slate-300',
  }

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="By Client" pageSubtitle="All tasks grouped by client">
      {clients.length === 0 ? (
        <p className="text-slate-400">No clients found.</p>
      ) : (
        <div className="space-y-8">
          {clients.map(([clientKey, clientProjects]) => {
            const companyName = clientProjects[0]?.company_name ?? clientKey
            const allClientTasks = clientProjects.flatMap(p => tasksByProject.get(p.id) ?? [])
            const open = allClientTasks.filter(t => t.status !== 'completed')
            const done = allClientTasks.filter(t => t.status === 'completed')
            return (
              <div key={clientKey} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Client header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-bold text-lg">{companyName}</h2>
                    <p className="text-indigo-200 text-sm mt-0.5">{clientKey !== companyName ? clientKey : ''}</p>
                  </div>
                  <div className="text-right text-indigo-200 text-sm">
                    <div>{clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}</div>
                    <div className="text-xs mt-0.5">{open.length} open · {done.length} done</div>
                  </div>
                </div>

                {/* Projects tabs */}
                <div className="border-b border-slate-100 px-6 py-3 flex flex-wrap gap-2">
                  {clientProjects.map(p => {
                    const tpl = getTemplate(p.template_slug)
                    const tasks = tasksByProject.get(p.id) ?? []
                    const pct = tasks.length ? Math.round(tasks.filter(t => t.status === 'completed').length / tasks.length * 100) : 0
                    return (
                      <Link key={p.id} href={"/projects/" + p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition text-sm">
                        <span>{tpl?.icon ?? '📁'}</span>
                        <span className="font-medium text-slate-700">{tpl?.label ?? p.template_slug}</span>
                        <span className="text-xs text-slate-400">{pct}%</span>
                      </Link>
                    )
                  })}
                </div>

                {/* Tasks list */}
                {allClientTasks.length === 0 ? (
                  <p className="px-6 py-4 text-slate-400 text-sm">No tasks yet.</p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {allClientTasks.slice(0, 20).map(t => {
                      const proj = projectMap.get(t.project_id ?? '')
                      const tpl = proj ? getTemplate(proj.template_slug) : undefined
                      return (
                        <div key={t.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition">
                          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority ?? 'medium'] ?? 'bg-slate-300'}`} />
                          <span className="flex-1 text-sm text-slate-800 truncate">{t.name}</span>
                          {t.tool && (
                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full shrink-0">{t.tool}</span>
                          )}
                          {t.assigned_to && (
                            <span className="text-xs text-slate-400 shrink-0 hidden sm:block">{t.assigned_to}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[t.status ?? 'pending']}`}>
                            {t.status === 'in_progress' ? 'In progress' : t.status === 'completed' ? 'Done' : 'Pending'}
                          </span>
                          {tpl && (
                            <Link href={"/projects/" + t.project_id} className="text-xs text-slate-300 hover:text-indigo-500 shrink-0 hidden md:block">
                              {tpl.icon} {tpl.label}
                            </Link>
                          )}
                        </div>
                      )
                    })}
                    {allClientTasks.length > 20 && (
                      <p className="px-6 py-3 text-xs text-slate-400">+{allClientTasks.length - 20} more tasks — open individual projects to see all</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
