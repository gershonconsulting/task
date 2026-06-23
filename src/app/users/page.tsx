export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import Link from 'next/link'

export default async function UsersPage() {
  const user = await getCurrentUser()
  const supa = supabaseAdmin()

  const { data: tasks } = await supa.from('tasks').select('id, name, status, assigned_to, project_id, due_date')
  const { data: projects } = await supa.from('projects').select('id, company_name')

  const allTasks = tasks ?? []
  const projectMap = new Map((projects ?? []).map(p => [p.id, p.company_name]))

  // Group tasks by assignee
  const byUser = new Map<string, typeof allTasks>()
  for (const t of allTasks) {
    const key = t.assigned_to ?? 'Unassigned'
    byUser.set(key, [...(byUser.get(key) ?? []), t])
  }

  const entries = Array.from(byUser.entries()).sort((a, b) => b[1].length - a[1].length)

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="By User" pageSubtitle="Task workload per team member">
      {entries.length === 0 ? (
        <p className="text-slate-400">No tasks found.</p>
      ) : (
        <div className="space-y-6">
          {entries.map(([name, userTasks]) => {
            const open = userTasks.filter(t => t.status !== 'completed')
            const done = userTasks.filter(t => t.status === 'completed')
            return (
              <div key={name} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                      {name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <h2 className="font-semibold text-slate-900">{name}</h2>
                  </div>
                  <div className="text-sm text-slate-500">
                    <span className="font-medium text-indigo-600">{open.length}</span> open · <span className="font-medium text-green-600">{done.length}</span> done
                  </div>
                </div>
                {open.length > 0 && (
                  <ul className="space-y-1.5">
                    {open.slice(0, 8).map(t => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${t.status === 'in_progress' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                        <span className="truncate text-slate-700">{t.name}</span>
                        {t.project_id && (
                          <Link href={`/projects/${t.project_id}`} className="ml-auto text-xs text-slate-400 hover:text-indigo-600 shrink-0">
                            {projectMap.get(t.project_id) ?? 'Project'}
                          </Link>
                        )}
                      </li>
                    ))}
                    {open.length > 8 && <li className="text-xs text-slate-400">+{open.length - 8} more</li>}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
    }
