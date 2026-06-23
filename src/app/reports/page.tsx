export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getTemplate } from '@/lib/templates'
import Link from 'next/link'

export default async function ReportsPage() {
  const user = await getCurrentUser()
  const supa = supabaseAdmin()

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supa.from('projects').select('id, company_name, template_slug, status, start_date, end_date, client_email, created_at').order('created_at', { ascending: false }),
    supa.from('tasks').select('id, project_id, status'),
  ])

  const allProjects = projects ?? []
  const allTasks = tasks ?? []

  const tasksByProject = new Map<string, typeof allTasks>()
  for (const t of allTasks) {
    tasksByProject.set(t.project_id, [...(tasksByProject.get(t.project_id) ?? []), t])
  }

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="Reports" pageSubtitle="Project status overview and printable reports">
      {allProjects.length === 0 ? (
        <p className="text-slate-400">No projects yet.</p>
      ) : (
        <div className="space-y-3">
          {allProjects.map(p => {
            const tpl = getTemplate(p.template_slug)
            const pts = tasksByProject.get(p.id) ?? []
            const total = pts.length
            const done = pts.filter(t => t.status === 'completed').length
            const pct = total === 0 ? 0 : Math.round(done / total * 100)

            return (
              <div key={p.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{tpl?.icon}</span>
                    <h3 className="font-semibold text-slate-900 truncate">{p.company_name}</h3>
                    <span className="text-xs text-slate-400">{p.status.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">{tpl?.label ?? p.template_slug} · {p.client_email}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{done}/{total} tasks</span>
                  </div>
                </div>
                <Link
                  href={`/projects/${p.id}/report`}
                  className="shrink-0 px-3 py-1.5 rounded-md border border-indigo-200 text-indigo-600 text-xs font-medium hover:bg-indigo-50 transition"
                >
                  Status report →
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
              }
