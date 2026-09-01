export const runtime = 'edge'

import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/currentUser'
import { supabaseAdmin, type ProjectRow, type TaskRow } from '@/lib/supabaseServer'
import { DEFAULT_TOOLS } from '@/lib/templates'
import { loadTemplateMap } from '@/lib/templates/runtime'
import AppShell from '@/components/AppShell'
import TaskList from './TaskList'
import { deleteProject } from './actions'
import Link from 'next/link'

const DEFAULT_TEAM = ['Olivier', 'Winnie Lauren', 'Aina Rama', 'Sai']

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) {
  const tplMap = await loadTemplateMap()
  const { id } = await props.params
  const user = await getCurrentUser()

  const supa = supabaseAdmin()
  const { data: project } = await supa.from('projects').select('*').eq('id', id).maybeSingle()
  if (!project) notFound()
  const p = project as ProjectRow

  const { data: tasks } = await supa.from('tasks').select('*').eq('project_id', id).order('position', { ascending: true })
  const taskRows = (tasks ?? []) as TaskRow[]

  // Load tools and team from app_settings
  let tools = DEFAULT_TOOLS
  let team = DEFAULT_TEAM
  try {
    const [toolsSetting, teamSetting] = await Promise.all([
      supa.from('app_settings').select('value').eq('key', 'tools').single(),
      supa.from('app_settings').select('value').eq('key', 'team_members').single(),
    ])
    if (toolsSetting.data?.value) tools = JSON.parse(toolsSetting.data.value)
    if (teamSetting.data?.value) {
      const members = JSON.parse(teamSetting.data.value) as { name: string }[]
      team = members.map(m => m.name).filter(Boolean)
    }
  } catch { /* use defaults */ }

  const tpl = tplMap.get(p.template_slug)
  const total = taskRows.length
  const done = taskRows.filter(t => t.status === 'completed').length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <AppShell
      userName={user.name}
      userRole={user.role}
      pageTitle={p.company_name}
      pageSubtitle={''+( tpl?.icon ?? '') + ' ' + (tpl?.label ?? p.template_slug) + ' · ' + p.status.replace('_', ' ')}
    >
      <div className="mb-4 flex items-center gap-4">
        <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-700">← Projects</Link>
        <Link href={'/projects/' + id + '/report'} className="ml-auto text-sm text-indigo-600 hover:text-indigo-800">Status report →</Link>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Progress</div>
          <div className="text-3xl font-light text-slate-900 mt-1">{pct}%</div>
          <div className="text-xs text-slate-500 mt-1">{done}/{total} tasks done</div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
            <div className="h-2 rounded-full" style={{ width: pct + '%', backgroundColor: tpl?.color ?? '#6366f1' }} />
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Contact</div>
          <div className="text-sm text-slate-900 mt-1">{[p.client_first_name, p.client_last_name].filter(Boolean).join(' ') || '—'}</div>
          {p.client_title && <div className="text-xs text-slate-500">{p.client_title}</div>}
          <div className="text-xs text-slate-500 mt-1 truncate">{p.client_email}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Timeline</div>
          <div className="text-sm text-slate-900 mt-1">{p.start_date ?? '—'}</div>
          <div className="text-xs text-slate-500">to {p.end_date ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Created by</div>
          <div className="text-sm text-slate-900 mt-1 truncate">{p.created_by_email}</div>
          <div className="text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</div>
        </div>
      </section>

      <TaskList projectId={p.id} tasks={taskRows} canEditMeta={true} canDelete={true} tools={tools} team={team} />

      <form action={deleteProject} className="mt-10 border-t border-red-100 pt-5">
        <input type="hidden" name="projectId" value={p.id} />
        <button type="submit" formAction={deleteProject} className="text-xs text-red-600 hover:text-red-800 underline">
          Delete this project (cannot be undone)
        </button>
      </form>
    </AppShell>
  )
}
