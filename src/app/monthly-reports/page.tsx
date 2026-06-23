export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import Link from 'next/link'

const MONTHS_BACK = 6

const MONTHLY_TEMPLATES = [
  { slug: 'monthly-report', label: 'Monthly Reports', icon: '📅' },
  { slug: 'facturation',    label: 'Facturation',     icon: '💳' },
]

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
}
function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}
function generateMonths(count: number): { year: number; month: number; key: string; label: string }[] {
  const now = new Date()
  const months = []
  for (let i = 0; i < count; i++) {
    let month = now.getMonth() + 1 - i
    let year  = now.getFullYear()
    while (month <= 0) { month += 12; year-- }
    months.push({ year, month, key: monthKey(year, month), label: monthLabel(year, month) })
  }
  return months.reverse()
}

export default async function MonthlyReportsPage() {
  const user   = await getCurrentUser()
  const supa   = supabaseAdmin()
  const months = generateMonths(MONTHS_BACK)
  const now    = new Date()
  const currentMonthKey = monthKey(now.getFullYear(), now.getMonth() + 1)

  // Load all monthly projects for both templates
  const { data: allProjects } = await supa
    .from('projects')
    .select('id, company_name, client_email, start_date, status, template_slug')
    .in('template_slug', MONTHLY_TEMPLATES.map(t => t.slug))
    .order('start_date', { ascending: false })

  const projects = allProjects ?? []

  // Task completion counts
  const { data: taskCounts } = await supa
    .from('tasks')
    .select('project_id, status')
    .in('project_id', projects.map(r => r.id))

  const tasksByProject = new Map<string, { total: number; done: number }>()
  for (const t of taskCounts ?? []) {
    const cur = tasksByProject.get(t.project_id) ?? { total: 0, done: 0 }
    cur.total++
    if (t.status === 'completed') cur.done++
    tasksByProject.set(t.project_id, cur)
  }

  // Distinct clients (from all projects, sorted alphabetically by company)
  const clientMap = new Map<string, string>()
  for (const p of projects) {
    if (p.client_email && !clientMap.has(p.client_email)) {
      clientMap.set(p.client_email, p.company_name ?? p.client_email)
    }
  }
  const clients = Array.from(clientMap.entries()).sort((a, b) => a[1].localeCompare(b[1]))

  // Build index per template: "email|monthKey" → project
  const idxByTemplate = new Map<string, Map<string, typeof projects[0]>>()
  for (const tmpl of MONTHLY_TEMPLATES) {
    const idx = new Map<string, typeof projects[0]>()
    for (const p of projects.filter(r => r.template_slug === tmpl.slug)) {
      if (!p.client_email || !p.start_date) continue
      idx.set(p.client_email + '|' + p.start_date.slice(0, 7), p)
    }
    idxByTemplate.set(tmpl.slug, idx)
  }

  return (
    <AppShell userName={user.name} userRole={user.role}
      pageTitle="Monthly Projects" pageSubtitle="Auto-created on the 1st of every month for all clients">

      {/* Generate button */}
      <div className="flex items-center justify-between mb-8">
        <p className="text-sm text-slate-500">
          Showing last {MONTHS_BACK} months · {clients.length} client{clients.length !== 1 ? 's' : ''}
        </p>
        <form method="POST" action="/api/cron/monthly-reports">
          <button type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
            ⚡ Generate {monthLabel(now.getFullYear(), now.getMonth() + 1)}
          </button>
        </form>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-200">
          <p className="text-slate-400 mb-2">No clients yet.</p>
          <p className="text-slate-300 text-sm">Create a project first — clients appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {MONTHLY_TEMPLATES.map(tmpl => {
            const idx = idxByTemplate.get(tmpl.slug)!
            return (
              <div key={tmpl.slug}>
                <h2 className="text-base font-semibold text-slate-700 mb-3">{tmpl.icon} {tmpl.label}</h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-5 py-3 font-semibold text-slate-600 w-48 min-w-[180px]">Client</th>
                        {months.map(m => (
                          <th key={m.key} className={`text-center px-3 py-3 font-semibold whitespace-nowrap ${m.key === currentMonthKey ? 'text-indigo-600' : 'text-slate-500'}`}>
                            {m.label}
                            {m.key === currentMonthKey && <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">now</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {clients.map(([email, company]) => (
                        <tr key={email} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-3">
                            <div className="font-medium text-slate-800 truncate max-w-[170px]">{company}</div>
                            <div className="text-xs text-slate-400 truncate max-w-[170px]">{email}</div>
                          </td>
                          {months.map(m => {
                            const proj   = idx.get(email + '|' + m.key)
                            const counts = proj ? (tasksByProject.get(proj.id) ?? { total: 0, done: 0 }) : null
                            const pct    = counts && counts.total > 0 ? Math.round(counts.done / counts.total * 100) : 0

                            if (!proj) return (
                              <td key={m.key} className="px-3 py-3 text-center">
                                <span className="text-slate-200 text-xs">—</span>
                              </td>
                            )

                            const statusColor =
                              pct === 100 ? 'bg-green-100 text-green-700 border-green-200' :
                              pct > 0     ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                            'bg-slate-100 text-slate-500 border-slate-200'

                            return (
                              <td key={m.key} className="px-3 py-3 text-center">
                                <Link href={"/projects/" + proj.id}
                                  className={`inline-flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border ${statusColor} hover:opacity-80 transition min-w-[60px]`}>
                                  <span className="font-semibold text-xs">{pct}%</span>
                                  <span className="text-[10px] opacity-70">{counts?.done}/{counts?.total}</span>
                                </Link>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" /> 100% done</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" /> In progress</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block" /> Not started</span>
        <span className="flex items-center gap-1.5"><span className="text-slate-200">—</span> Not created</span>
      </div>
    </AppShell>
  )
                  }
