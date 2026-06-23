export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { updateTaskStatusGlobal } from '@/lib/actions'
import Link from 'next/link'

const STAGES = [
  { key: 'pending',     label: 'Pending',     color: '#94a3b8', bg: 'bg-slate-50',  border: 'border-slate-200' },
  { key: 'in_progress', label: 'In Progress',  color: '#f59e0b', bg: 'bg-amber-50',  border: 'border-amber-200' },
  { key: 'completed',   label: 'Completed',    color: '#22c55e', bg: 'bg-green-50',  border: 'border-green-200' },
]

const NEXT_STATUS: Record<string, string> = {
  pending:     'in_progress',
  in_progress: 'completed',
  completed:   'pending',
}
const NEXT_LABEL: Record<string, string> = {
  pending:     '→ In progress',
  in_progress: '→ Done',
  completed:   '↺ Reopen',
}

export default async function StagesPage() {
  const user = await getCurrentUser()
  const supa = supabaseAdmin()

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supa.from('tasks').select('*'),
    supa.from('projects').select('id, company_name'),
  ])

  const allTasks = (tasks ?? []) as Array<{
    id: string; name: string; status: string | null; assigned_to: string | null;
    due_date: string | null; priority: string | null; project_id: string | null;
  }>
  const projectMap = new Map((projects ?? []).map(p => [p.id, p.company_name]))

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="By Stage" pageSubtitle="Kanban view — click arrow button to advance task status">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STAGES.map(stage => {
          const cols = allTasks.filter(t => (t.status ?? 'pending') === stage.key)
          const nextSt = NEXT_STATUS[stage.key]
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
                    <div key={t.id} className="bg-white rounded-md border border-slate-200 p-3 hover:border-indigo-300 hover:shadow-sm transition text-sm">
                      <div className="font-medium text-slate-900 truncate mb-2">{t.name}</div>
                      {t.project_id && (
                        <div className="text-xs text-slate-400 mb-2 truncate">
                          <Link href={"/projects/" + t.project_id} className="hover:text-indigo-600">
                            {projectMap.get(t.project_id) ?? ''}
                          </Link>
                        </div>
                      )}
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          {t.assigned_to && <span className="text-xs text-slate-500">{t.assigned_to.split(' ')[0]}</span>}
                          {t.due_date && <span className="text-xs text-slate-400">{t.due_date}</span>}
                        </div>
                        {/* Status advance button */}
                        <form action={updateTaskStatusGlobal}>
                          <input type="hidden" name="taskId"    value={t.id} />
                          <input type="hidden" name="status"    value={nextSt} />
                          <input type="hidden" name="projectId" value={t.project_id ?? ''} />
                          <button type="submit"
                            className="text-xs px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer transition whitespace-nowrap">
                            {NEXT_LABEL[stage.key]}
                          </button>
                        </form>
                      </div>
                    </div>
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
