export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { updateTaskStatusGlobal } from '@/lib/actions'
import Link from 'next/link'

const NEXT_STATUS: Record<string, string> = {
  pending:     'in_progress',
  in_progress: 'completed',
  completed:   'pending',
}
const STATUS_LABEL: Record<string, string> = {
  pending:     'Pending',
  in_progress: 'In progress',
  completed:   'Done',
}
const STATUS_STYLE: Record<string, string> = {
  pending:     'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
  completed:   'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
}

export default async function UsersPage() {
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

  // Group tasks by assignee
  const byUser = new Map<string, typeof allTasks>()
  for (const t of allTasks) {
    const key = t.assigned_to ?? 'Unassigned'
    byUser.set(key, [...(byUser.get(key) ?? []), t])
  }

  const entries = Array.from(byUser.entries()).sort((a, b) => b[1].length - a[1].length)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="By Provider" pageSubtitle="Task workload per team member — click status to update">
      {entries.length === 0 ? (
        <p className="text-slate-400">No tasks found.</p>
      ) : (
        <div className="space-y-6">
          {entries.map(([name, userTasks]) => {
            const open = userTasks.filter(t => t.status !== 'completed')
            const done = userTasks.filter(t => t.status === 'completed')
            return (
              <div key={name} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                      {name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <h2 className="font-semibold text-slate-900">{name}</h2>
                  </div>
                  <div className="text-sm text-slate-500">
                    <span className="font-medium text-indigo-600">{open.length}</span> open ·{' '}
                    <span className="font-medium text-green-600">{done.length}</span> done
                  </div>
                </div>

                {/* Task rows */}
                <div className="divide-y divide-slate-50">
                  {userTasks.map(t => {
                    const st = t.status ?? 'pending'
                    const nextSt = NEXT_STATUS[st] ?? 'pending'
                    const overdue = t.due_date && t.due_date < today && st !== 'completed'
                    return (
                      <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition group">
                        {/* Status toggle button */}
                        <form action={updateTaskStatusGlobal}>
                          <input type="hidden" name="taskId"    value={t.id} />
                          <input type="hidden" name="status"    value={nextSt} />
                          <input type="hidden" name="projectId" value={t.project_id ?? ''} />
                          <button
                            type="submit"
                            title={`Click to mark ${STATUS_LABEL[nextSt]}`}
                            className={`text-xs px-2.5 py-1 rounded-full border font-medium cursor-pointer transition shrink-0 ${STATUS_STYLE[st]}`}
                          >
                            {STATUS_LABEL[st]}
                          </button>
                        </form>

                        {/* Task name → project link */}
                        <span className="flex-1 text-sm text-slate-800 truncate min-w-0">{t.name}</span>

                        {/* Due date */}
                        {t.due_date && (
                          <span className={`text-xs shrink-0 ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                            {overdue ? '⚠ ' : ''}{new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}

                        {/* Project link */}
                        {t.project_id && (
                          <Link href={"/projects/" + t.project_id} className="text-xs text-slate-300 hover:text-indigo-500 shrink-0 hidden sm:block">
                            {projectMap.get(t.project_id) ?? 'Project'}
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
                        }
