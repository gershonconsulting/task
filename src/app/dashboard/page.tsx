export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { TEMPLATES } from '@/lib/templates'
import Link from 'next/link'

// Templates that constitute the standard client launch bundle
const LAUNCH_SLUGS = ['client-onboarding', 'social-content-creation', 'social-selling', 'lead-generation']

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const supa = supabaseAdmin()

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supa.from('projects').select('id, company_name, status, template_slug, client_email, start_date, created_at').order('created_at', { ascending: false }),
    supa.from('tasks').select('id, status, assigned_to, due_date, project_id, name'),
  ])

  const allProjects = projects ?? []
  const allTasks = tasks ?? []

  const totalProjects = allProjects.length
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'completed').length
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length
  const pendingTasks = allTasks.filter(t => t.status === 'pending').length

  // Task counts per project for progress bars
  const taskCountByProject = new Map<string, { total: number; done: number }>()
  for (const t of allTasks) {
    const cur = taskCountByProject.get(t.project_id) ?? { total: 0, done: 0 }
    cur.total++
    if (t.status === 'completed') cur.done++
    taskCountByProject.set(t.project_id, cur)
  }

  // Group projects by client_email (the grouping key)
  const clientMap = new Map<string, typeof allProjects>()
  for (const p of allProjects) {
    const key = p.client_email ?? 'unknown'
    if (!clientMap.has(key)) clientMap.set(key, [])
    clientMap.get(key)!.push(p)
  }

  // Sort clients: most recently created project first
  const clients = Array.from(clientMap.entries()).sort((a, b) => {
    const latestA = Math.max(...a[1].map(p => new Date(p.created_at).getTime()))
    const latestB = Math.max(...b[1].map(p => new Date(p.created_at).getTime()))
    return latestB - latestA
  })

  // Template lookup for icon/label/color
  const tplMap = new Map(TEMPLATES.map(t => [t.slug, t]))

  // Upcoming deadlines (next 7 days)
  const now = Date.now()
  const weekMs = 7 * 86400000
  const upcoming = allTasks
    .filter(t => t.status !== 'completed' && t.due_date)
    .filter(t => { const d = new Date(t.due_date!).getTime(); return d >= now && d <= now + weekMs })
    .slice(0, 5)

  // Stalled projects
  const tasksByProject = new Map<string, typeof allTasks>()
  for (const t of allTasks) tasksByProject.set(t.project_id, [...(tasksByProject.get(t.project_id) ?? []), t])
  const stalledProjects = allProjects.filter(p => {
    const ts = tasksByProject.get(p.id) ?? []
    return ts.length > 0 && ts.every(t => t.status === 'pending')
  })

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="Dashboard" pageSubtitle={'Welcome back, ' + user.name.split(' ')[0]}>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Clients', value: clients.length, color: '#6366f1' },
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

      {/* Client bundles */}
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Clients</h2>
        <div className="space-y-4">
          {clients.map(([clientEmail, clientProjects]) => {
            // Use company name from first project, email as subtitle
            const firstName = clientProjects[0]?.company_name ?? clientEmail
            // For each launch slug, find the matching project (or null)
            const launchProjects = LAUNCH_SLUGS.map(slug =>
              clientProjects.find(p => p.template_slug === slug) ?? null
            )
            // Other projects not in the launch bundle
            const otherProjects = clientProjects.filter(p => !LAUNCH_SLUGS.includes(p.template_slug))

            return (
              <div key={clientEmail} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Client header */}
                <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{firstName}</div>
                    <div className="text-xs text-slate-500">{clientEmail}</div>
                  </div>
                  <div className="text-xs text-slate-400">{clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}</div>
                </div>
                {/* Launch bundle row */}
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
                  {LAUNCH_SLUGS.map((slug, i) => {
                    const p = launchProjects[i]
                    const tpl = tplMap.get(slug)
                    const counts = p ? (taskCountByProject.get(p.id) ?? { total: 0, done: 0 }) : null
                    const pct = counts && counts.total > 0 ? Math.round(counts.done / counts.total * 100) : 0

                    return (
                      <div key={slug} className={'p-4 ' + (p ? '' : 'opacity-40')}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-base">{tpl?.icon ?? '📁'}</span>
                          <span className="text-xs font-medium text-slate-600 truncate">{tpl?.label ?? slug}</span>
                        </div>
                        {p ? (
                          <>
                            <Link href={'/projects/' + p.id} className="block text-sm font-semibold text-slate-900 hover:text-indigo-600 truncate mb-2">
                              {p.company_name}
                            </Link>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="h-1.5 rounded-full" style={{ width: pct + '%', backgroundColor: tpl?.color ?? '#6366f1' }} />
                              </div>
                              <span className="text-xs text-slate-400 shrink-0">{pct}%</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-400">{counts?.done}/{counts?.total} done</div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400 italic">Not started</div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* Other projects */}
                {otherProjects.length > 0 && (
                  <div className="px-4 pb-3 pt-1 border-t border-slate-100 flex gap-3 flex-wrap">
                    {otherProjects.map(p => {
                      const tpl = tplMap.get(p.template_slug)
                      const counts = taskCountByProject.get(p.id) ?? { total: 0, done: 0 }
                      const pct = counts.total > 0 ? Math.round(counts.done / counts.total * 100) : 0
                      return (
                        <Link key={p.id} href={'/projects/' + p.id}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 bg-slate-50 rounded-md px-2 py-1 border border-slate-200">
                          <span>{tpl?.icon ?? '📁'}</span>
                          <span>{tpl?.label ?? p.template_slug}</span>
                          <span className="text-slate-400">{pct}%</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                  <div className="h-2 rounded-full" style={{ width: totalTasks ? Math.round(s.count / totalTasks * 100) + '%' : '0%', backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 mb-3">Stalled Projects</h2>
          <ul className="space-y-1">
            {stalledProjects.map(p => (
              <li key={p.id}>
                <Link href={'/projects/' + p.id} className="text-sm text-amber-800 hover:text-amber-900 hover:underline">{p.company_name}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  )
}
