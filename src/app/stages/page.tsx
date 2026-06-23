export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import Link from 'next/link'

const STAGES = [
  { key: 'pending', label: 'Pending', color: '#94a3b8', bg: 'bg-slate-50', border: 'border-slate-200' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'completed', label: 'Completed', color: '#22c55e', bg: 'bg-green-50', border: 'border-green-200' },
]

export default async function StagesPage() {
  const user = await getCurrentUser()
  const supa = supabaseAdmin()

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supa.from('tasks').select('id, name, status, assigned_to, project_id, due_date, priority'),
    supa.from('projects').select('id, company_name'),
  ])

  const allTasks = tasks ?? []
  const projectMap = new Map((projects ?? []).map(p => [p.id, p.company_name]))

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="By Stage" pageSubtitle="Kanban view — tasks grouped by status">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STAGES.map(stage => {
          const cols = allTasks.filter(t => t.status === stage.key)
          return (
            <div key={stage.key} className={`rounded-lg border ${stage.border} ${stage.bg} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: stage.color }}>
                  {stage.label}
                </h2>
                <span className="text-xs font-medium text-slate-500 bg-white rounded-full px-2 py-0.5 border border-slate-200">
                  {cols.length}
                </span>
              </div>
              <div className="space-y-2">
                {cols.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No tasks</p>
                ) : (
                  cols.map(t => (
                    <Link key={t.id} href={`/projects/${t.project_id}`} className="block bg-white rounded-md border border-slate-200 p-3 hover:border-indigo-300 hover:shadow-sm transition text-sm">
                      <div className="font-medium text-slate-900 truncate">{t.name}</div>
                      {t.project_id && (
                        <div className="text-xs text-slate-400 mt-1 truncate">{projectMap.get(t.project_id) ?? ''}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {t.assigned_to && <span className="text-xs text-slate-500">{t.assigned_to}</span>}
                        {t.due_date && <span className="text-xs text-slate-400 ml-auto">{t.due_date}</span>}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </AppShell>
  )
              }
