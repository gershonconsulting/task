export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { TEMPLATES } from '@/lib/templates'
import { updateTaskStatusGlobal } from '@/lib/actions'
import Link from 'next/link'

// Onboarding slugs shown as the "client bundle" on dashboard
const ONBOARDING_SLUGS = [
  'client-onboarding',
  'social-content-creation-onboarding',
  'lead-generation-onboarding',
  'social-selling-onboarding',
]

function pctColor(pct: number) {
  if (pct === 100) return '#22c55e'
  if (pct >= 50)  return '#f59e0b'
  if (pct > 0)   return '#f97316'
  return '#94a3b8'
}

function CircleProgress({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pctColor(pct)
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">` +
    `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#f1f5f9" strokeWidth="8"/>` +
    `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" strokeWidth="8" strokeDasharray="${dash} ${circ}" strokeLinecap="round"/>` +
    `</svg>`
  )
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const supa = supabaseAdmin()

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supa.from('projects').select('id, company_name, status, template_slug, client_email, start_date, created_at').order('created_at', { ascending: false }),
    supa.from('tasks').select('id, status, assigned_to, due_date, project_id, name, priority'),
  ])

  const allProjects = projects ?? []
  const allTasks    = tasks ?? []

  const totalTasks     = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'completed').length
  const inProgressTasks= allTasks.filter(t => t.status === 'in_progress').length
  const overallPct     = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0

  // Task counts per project
  const taskByProject = new Map<string, { total: number; done: number; inprog: number; tasks: typeof allTasks }>()
  for (const t of allTasks) {
    const cur = taskByProject.get(t.project_id) ?? { total: 0, done: 0, inprog: 0, tasks: [] }
    cur.total++
    if (t.status === 'completed') cur.done++
    if (t.status === 'in_progress') cur.inprog++
    cur.tasks.push(t)
    taskByProject.set(t.project_id, cur)
  }

  // Group projects by client
  const clientMap = new Map<string, typeof allProjects>()
  for (const p of allProjects) {
    const key = p.client_email ?? 'unknown'
    if (!clientMap.has(key)) clientMap.set(key, [])
    clientMap.get(key)!.push(p)
  }
  const clients = Array.from(clientMap.entries()).sort((a, b) => {
    const la = Math.max(...a[1].map(p => new Date(p.created_at).getTime()))
    const lb = Math.max(...b[1].map(p => new Date(p.created_at).getTime()))
    return lb - la
  })

  const tplMap = new Map(TEMPLATES.map(t => [t.slug, t]))

  // Overdue tasks
  const now = Date.now()
  const overdue = allTasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date).getTime() < now)
  // Due this week
  const weekMs = 7 * 86400000
  const dueThisWeek = allTasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date).getTime() >= now && new Date(t.due_date).getTime() <= now + weekMs)

  // Onboarding tasks pending assignment (for the "give tasks to clients" section)
  const onboardingProjects = allProjects.filter(p => ONBOARDING_SLUGS.includes(p.template_slug))
  const unassignedOnboardingTasks = allTasks.filter(t =>
    onboardingProjects.some(p => p.id === t.project_id) && t.status !== 'completed'
  )

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="Dashboard" pageSubtitle={'Welcome back, ' + user.name.split(' ')[0]}>

      {/* ── BIG OVERALL STAT BAR ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Overall % — BIG */}
        <div className="col-span-2 md:col-span-1 bg-indigo-600 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Overall Progress</div>
          <div className="text-7xl font-black text-white leading-none mt-2">{overallPct}<span className="text-3xl text-indigo-300">%</span></div>
          <div className="mt-3 w-full bg-indigo-500 rounded-full h-2">
            <div className="h-2 rounded-full bg-white transition-all" style={{ width: overallPct + '%' }} />
          </div>
          <div className="text-indigo-200 text-xs mt-2">{completedTasks} of {totalTasks} tasks done</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Clients</div>
          <div className="text-5xl font-black text-slate-800 mt-1">{clients.length}</div>
          <div className="text-xs text-slate-400 mt-2">{allProjects.length} projects total</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-500">In Progress</div>
          <div className="text-5xl font-black text-amber-500 mt-1">{inProgressTasks}</div>
          <div className="text-xs text-slate-400 mt-2">tasks active now</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-red-500">Overdue</div>
          <div className="text-5xl font-black text-red-500 mt-1">{overdue.length}</div>
          <div className="text-xs text-slate-400 mt-2">{dueThisWeek.length} due this week</div>
        </div>
      </div>

      {/* ── CLIENT CARDS ─────────────────────────────────────────────────── */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Clients</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {clients.map(([email, clientProjects]) => {
          const company = clientProjects[0]?.company_name ?? email
          // Total progress across ALL client projects
          const clientTasks = allTasks.filter(t => clientProjects.some(p => p.id === t.project_id))
          const clientDone  = clientTasks.filter(t => t.status === 'completed').length
          const clientPct   = clientTasks.length > 0 ? Math.round(clientDone / clientTasks.length * 100) : 0
          const color       = pctColor(clientPct)

          // Show onboarding projects for this client
          const obProjects = clientProjects.filter(p => ONBOARDING_SLUGS.includes(p.template_slug))
          // Other (monthly etc)
          const otherCount = clientProjects.filter(p => !ONBOARDING_SLUGS.includes(p.template_slug)).length

          return (
            <div key={email} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
              {/* Card header with big % */}
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-base truncate">{company}</div>
                  <div className="text-xs text-slate-400 truncate">{email}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all" style={{ width: clientPct + '%', backgroundColor: color }} />
                    </div>
                    <span className="text-xs font-medium text-slate-500">{clientDone}/{clientTasks.length}</span>
                  </div>
                </div>
                {/* BIG % badge */}
                <div className="ml-4 shrink-0 flex flex-col items-center">
                  <div className="text-4xl font-black leading-none" style={{ color }}>{clientPct}</div>
                  <div className="text-lg font-bold leading-none" style={{ color }}>%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{otherCount > 0 ? otherCount + ' more' : ''}</div>
                </div>
              </div>

              {/* Onboarding project pills */}
              {obProjects.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  {obProjects.map(p => {
                    const tpl    = tplMap.get(p.template_slug)
                    const counts = taskByProject.get(p.id) ?? { total: 0, done: 0, inprog: 0, tasks: [] }
                    const pct    = counts.total > 0 ? Math.round(counts.done / counts.total * 100) : 0
                    const pc     = pctColor(pct)
                    return (
                      <Link key={p.id} href={'/projects/' + p.id}
                        className="flex items-center gap-3 group rounded-lg px-3 py-2 hover:bg-slate-50 border border-slate-100 transition">
                        <span className="text-lg">{tpl?.icon ?? '📁'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-700 truncate group-hover:text-indigo-600">{tpl?.label ?? p.template_slug}</div>
                          <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                            <div className="h-1 rounded-full" style={{ width: pct + '%', backgroundColor: pc }} />
                          </div>
                        </div>
                        <div className="text-xl font-black shrink-0" style={{ color: pc }}>{pct}<span className="text-xs font-bold">%</span></div>
                      </Link>
                    )
                  })}
                </div>
              )}
              {obProjects.length === 0 && (
                <div className="px-4 py-3 text-xs text-slate-400 italic">No onboarding project yet</div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── PENDING ONBOARDING TASKS (client tasks to assign) ────────────── */}
      {unassignedOnboardingTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Onboarding Tasks to Complete <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">{unassignedOnboardingTasks.length} pending</span>
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {unassignedOnboardingTasks.slice(0, 15).map(t => {
              const proj    = onboardingProjects.find(p => p.id === t.project_id)
              const tpl     = proj ? tplMap.get(proj.template_slug) : null
              const isOver  = t.due_date && new Date(t.due_date).getTime() < now
              const nextStatus = t.status === 'pending' ? 'in_progress' : 'completed'
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition">
                  {/* Status toggle */}
                  <form action={updateTaskStatusGlobal}>
                    <input type="hidden" name="taskId" value={t.id} />
                    <input type="hidden" name="status" value={nextStatus} />
                    <input type="hidden" name="projectId" value={t.project_id} />
                    <button type="submit"
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                        t.status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                        t.status === 'in_progress' ? 'bg-amber-400 border-amber-400 text-white' :
                        'border-slate-300 hover:border-indigo-400'
                      }`}>
                      {t.status === 'completed' && <span className="text-xs">✓</span>}
                      {t.status === 'in_progress' && <span className="text-xs">→</span>}
                    </button>
                  </form>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{tpl?.icon} {proj?.company_name}</span>
                      {t.assigned_to && <span className="text-slate-300">·</span>}
                      {t.assigned_to && <span>{t.assigned_to}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.priority === 'high' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">HIGH</span>}
                    {isOver && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">OVERDUE</span>}
                    {t.due_date && !isOver && <span className="text-xs text-slate-400">{t.due_date}</span>}
                    <Link href={'/projects/' + t.project_id} className="text-xs text-indigo-500 hover:text-indigo-700">→</Link>
                  </div>
                </div>
              )
            })}
          </div>
          {unassignedOnboardingTasks.length > 15 && (
            <p className="text-xs text-slate-400 mt-2 text-right">+{unassignedOnboardingTasks.length - 15} more — <Link href="/tasks" className="text-indigo-500 hover:underline">view all tasks</Link></p>
          )}
        </div>
      )}

      {/* ── OVERDUE ALERT ─────────────────────────────────────────────────── */}
      {overdue.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider">⚠ Overdue Tasks ({overdue.length})</h2>
            <Link href="/tasks" className="text-xs text-red-600 hover:underline">View all →</Link>
          </div>
          <div className="space-y-1">
            {overdue.slice(0, 5).map(t => {
              const proj = allProjects.find(p => p.id === t.project_id)
              return (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-red-800 truncate">{t.name}</span>
                  <span className="text-xs text-red-500 ml-2 shrink-0">{proj?.company_name} · {t.due_date}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </AppShell>
  )
          }
