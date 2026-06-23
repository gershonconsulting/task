export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const supa = supabaseAdmin()

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supa.from('projects').select('id, company_name, status, template_slug, client_email, created_at').order('created_at', { ascending: false }),
    supa.from('tasks').select('id, status, assigned_to, due_date, project_id, name'),
  ])

  const allProjects = projects ?? []
  const allTasks = tasks ?? []

  const totalProjects = allProjects.length
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'completed').length
  const pendingTasks = allTasks.filter(t => t.status === 'pending').length
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length

  // By-status breakdown
  const byStatus: Record<string, number> = {}
  for (const t of allTasks) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1
  }

  // My tasks (assigned to current user)
  const myTasks = allTasks.filter(t => t.assigned_to === user.name || t.assigned_to === user.email)

  // Upcoming: tasks due in next 7 days that are not completed
  const now = Date.now()
  const weekMs = 7 * 86400000
  const upcoming = allTasks
    .filter(t => t.status !== 'completed' && t.due_date)
    .filter(t => {
      const d = new Date(t.due_date!).getTime()
      return d >= now && d <= now + weekMs
    })
    .slice(0, 5)

  // Stalled: projects with all tasks pending (nothing in progress or completed)
  const tasksByProject = new Map<string, typeof allTasks>()
  for (const t of allTasks) tasksByProject.set(t.project_id, [...(tasksByProject.get(t.project_id) ?? []), t])
  const stalledProjects = allProjects.filter(p => {
    const ts = tasksByProject.get(p.id) ?? []
    return ts.length > 0 && ts.every(t => t.status === 'pending')
  })

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="Dashboard" pageSubtitle={`Welcome back, ${user.name.split(' ')[0]}`}>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Projects', value: totalProjects, color: '#6366f1' },
          { label: 'Total Tasks', value: totalTasks, color: '#0ea5e9' },
          { label: 'Completed', value: completedTasks, color: '#22c55e' },
          { label: 'In Progress', value: inProgressTasks, color: '#f59e0b' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent projects */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Recent Projects</h2>
          {allProjects.length === 0 ? (
            <p className="text-slate-400 text-sm">No projects yet.</p>
          ) : (
            <ul className="space-y-2">
              {allProjects.slice(0, 5).map(p => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="flex justify-between items-center text-sm hover:text-indigo-600 transition">
                    <span className="font-medium text-slate-900 truncate">{p.company_name}</span>
                    <span className="text-xs text-slate-400 ml-2 shrink-0">{p.status.replace('_', ' ')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/projects" className="mt-4 block text-xs text-indigo-600 hover:text-indigo-800">View all projects →</Link>
        </div>

        {/* Task breakdown */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Task Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Pending', count: pendingTasks, color: '#94a3b8' },
              { label: 'In Progress', count: inProgressTasks, color: '#f59e0b' },
              { label: 'Completed', count: completedTasks, color: '#22c55e' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">{s.label}</span>
                  <span className="text-slate-500">{s.count} / {totalTasks}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full" style={{ width: totalTasks ? `${Math.round(s.count / totalTasks * 100)}%` : '0%', backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My tasks */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">My Tasks</h2>
          {myTasks.length === 0 ? (
            <p className="text-slate-400 text-sm">No tasks assigned to you.</p>
          ) : (
            <ul className="space-y-2">
              {myTasks.slice(0, 6).map(t => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${t.status === 'completed' ? 'bg-green-400' : t.status === 'in_progress' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                  <span className="truncate text-slate-700">{t.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Upcoming Deadlines (7d)</h2>
          {upcoming.length === 0 ? (
            <p className="text-slate-400 text-sm">No deadlines in the next 7 days.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map(t => (
                <li key={t.id} className="flex justify-between items-center text-sm">
                  <span className="truncate text-slate-700">{t.name}</span>
                  <span className="text-xs text-slate-400 ml-2 shrink-0">{t.due_date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {stalledProjects.length > 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 mb-3">Stalled Projects</h2>
          <ul className="space-y-1">
            {stalledProjects.map(p => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="text-sm text-amber-800 hover:text-amber-900 hover:underline">{p.company_name}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  )
    }
