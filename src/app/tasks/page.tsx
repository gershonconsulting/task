export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import Link from 'next/link'
import { getTemplate } from '@/lib/templates'

// Known team members — shown as quick filter tabs
const PROVIDERS = ['Winnie Lauren', 'Aina Rama', 'Olivier', 'Sai']

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; status?: string }>
}) {
  const user = await getCurrentUser()
  const { provider, status } = await searchParams
  const supa = supabaseAdmin()

  // Use select('*') to handle missing columns (e.g. 'tool' before migration)
  const [tasksResult, projectsResult] = await Promise.all([
    supa.from('tasks').select('*'),
    supa.from('projects').select('id, company_name, client_email, template_slug'),
  ])

  const allTasks = (tasksResult.data ?? []) as Array<{
    id: string; name: string; status: string | null; assigned_to: string | null;
    due_date: string | null; priority: string | null; tool?: string | null; project_id: string | null;
  }>
  const projectMap = new Map((projectsResult.data ?? []).map((p: { id: string; company_name: string; client_email: string; template_slug: string }) => [p.id, p]))

  // Filter
  let filtered = allTasks
  if (provider && provider !== 'all') {
    filtered = filtered.filter(t => t.assigned_to === provider)
  }
  if (status && status !== 'all') {
    filtered = filtered.filter(t => t.status === status)
  }

  // Sort: pending first, then in_progress, then completed; within same status sort by due_date
  const STATUS_ORDER: Record<string, number> = { pending: 0, in_progress: 1, completed: 2 }
  filtered = filtered.slice().sort((a, b) => {
    const sA = STATUS_ORDER[a.status ?? 'pending'] ?? 0
    const sB = STATUS_ORDER[b.status ?? 'pending'] ?? 0
    if (sA !== sB) return sA - sB
    return (a.due_date ?? '').localeCompare(b.due_date ?? '')
  })

  const STATUS_STYLE: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 border-green-200',
    in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
    pending: 'bg-slate-100 text-slate-500 border-slate-200',
  }
  const PRIORITY_DOT: Record<string, string> = {
    high: 'bg-red-400',
    medium: 'bg-amber-400',
    low: 'bg-slate-300',
  }

  const activeProvider = provider ?? 'all'
  const activeStatus = status ?? 'all'

  function filterLink(p?: string, s?: string) {
    const params = new URLSearchParams()
    if (p && p !== 'all') params.set('provider', p)
    if (s && s !== 'all') params.set('status', s)
    const qs = params.toString()
    return '/tasks' + (qs ? '?' + qs : '')
  }

  const totalCount = filtered.length
  const doneCount = filtered.filter(t => t.status === 'completed').length
  const openCount = filtered.filter(t => t.status !== 'completed').length

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="Tasks" pageSubtitle="All tasks across every project">
      {/* Provider filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Provider:</span>
        {['all', ...PROVIDERS].map(p => (
          <Link
            key={p}
            href={filterLink(p, activeStatus)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
              activeProvider === p
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {p === 'all' ? 'Everyone' : p.split(' ')[0]}
          </Link>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'in_progress', label: 'In progress' },
          { key: 'completed', label: 'Done' },
        ].map(s => (
          <Link
            key={s.key}
            href={filterLink(activeProvider, s.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
              activeStatus === s.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-4 mb-4 text-sm text-slate-500">
        <span><span className="font-semibold text-slate-800">{totalCount}</span> tasks</span>
        <span><span className="font-semibold text-green-600">{doneCount}</span> done</span>
        <span><span className="font-semibold text-indigo-600">{openCount}</span> open</span>
      </div>

      {/* Task table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-200">
          <p className="text-slate-400">No tasks match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filtered.map(t => {
              const proj = projectMap.get(t.project_id ?? '')
              const tpl = proj ? getTemplate((proj as { template_slug: string }).template_slug) : undefined
              const today = new Date().toISOString().slice(0, 10)
              const overdue = t.due_date && t.due_date < today && t.status !== 'completed'
              return (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                  {/* Priority dot */}
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority ?? 'medium'] ?? 'bg-slate-300'}`} />

                  {/* Task name */}
                  <span className="flex-1 text-sm text-slate-800 truncate min-w-0">{t.name}</span>

                  {/* Tool badge */}
                  {t.tool && (
                    <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-200 shrink-0 hidden sm:inline">
                      {t.tool}
                    </span>
                  )}

                  {/* Assignee */}
                  <span className="text-xs text-slate-400 shrink-0 hidden md:block w-24 truncate text-right">
                    {t.assigned_to ? t.assigned_to.split(' ')[0] : '—'}
                  </span>

                  {/* Due date */}
                  {t.due_date && (
                    <span className={`text-xs shrink-0 hidden lg:block ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      {overdue ? '⚠ ' : ''}{new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}

                  {/* Status badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[t.status ?? 'pending']}`}>
                    {t.status === 'in_progress' ? 'In progress' : t.status === 'completed' ? 'Done' : 'Pending'}
                  </span>

                  {/* Project link */}
                  {proj && (
                    <Link href={"/projects/" + (proj as { id: string }).id} className="text-xs text-slate-300 hover:text-indigo-500 shrink-0 hidden xl:flex items-center gap-1">
                      <span>{tpl?.icon ?? '📁'}</span>
                      <span className="max-w-[100px] truncate">{(proj as { company_name: string }).company_name}</span>
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </AppShell>
  )
      }
