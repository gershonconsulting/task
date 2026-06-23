export const runtime = 'edge'

import Link from 'next/link'
import { getCurrentUser } from '@/lib/currentUser'
import { supabaseAdmin, type ProjectProgressRow } from '@/lib/supabaseServer'
import { getTemplate } from '@/lib/templates'
import AppShell from '@/components/AppShell'

export default async function ProjectsPage() {
  const user = await getCurrentUser()

  let rows: ProjectProgressRow[] | null = null
  let dbError: string | null = null
  try {
    const { data, error } = await supabaseAdmin()
      .from('project_progress')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) dbError = error.message
    else rows = data as ProjectProgressRow[]
  } catch (e: unknown) {
    dbError = e instanceof Error ? e.message : String(e)
  }

  return (
    <AppShell
      userName={user.name}
      userRole={user.role}
      pageTitle="Projects"
      pageSubtitle="All client engagements"
    >
      <div className="mb-6">
        <Link href="/projects/new" className="inline-block px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
          + New Project
        </Link>
      </div>
      {dbError && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm mb-6">
          <strong>Database error:</strong> {dbError}
        </div>
      )}
      {!dbError && rows && rows.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-300">
          <p className="text-slate-500 mb-4">No projects yet.</p>
          <Link href="/projects/new" className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold">
            Create the first one
          </Link>
        </div>
      )}
      {!dbError && rows && rows.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <ProjectCard key={r.project_id} row={r} />
          ))}
        </ul>
      )}
    </AppShell>
  )
}

function ProjectCard({ row }: { row: ProjectProgressRow }) {
  const tpl = getTemplate(row.template_slug)
  const accent = tpl?.color ?? '#6366f1'
  return (
    <li className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <Link href={`/projects/${row.project_id}`} className="block">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="text-xs uppercase font-semibold" style={{ color: accent }}>
              {tpl?.icon} {tpl?.label ?? row.template_slug}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-1 truncate">{row.company_name}</h2>
          </div>
        </div>
        <div className="text-xs text-slate-500 mb-1.5">{row.completed_tasks} / {row.total_tasks} tasks done</div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div className="h-2 rounded-full" style={{ width: `${row.percent_complete}%`, backgroundColor: accent }} />
        </div>
        <div className="flex justify-between mt-3 text-xs">
          <span style={{ color: accent }}>{row.percent_complete}%</span>
          <span className="text-slate-400">{new Date(row.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </Link>
    </li>
  )
}
