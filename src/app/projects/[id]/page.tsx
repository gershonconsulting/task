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
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const openTasks = taskRows.filter(t => t.status !== 'completed').sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  const late = openTasks.filter(t => t.due_date && t.due_date < today).length
  const next = openTasks[0]
  const nice = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

  return (
    <AppShell
      userName={user.name}
      userRole={user.role}
      pageTitle={p.company_name}
      pageSubtitle={''+( tpl?.icon ?? '') + ' ' + (tpl?.label ?? p.template_slug) + ' · ' + p.status.replace('_', ' ')}
    >
      <div className="mb-4 flex items-center gap-4">
        <Link href="/projects" className="text-sm text-[#6e6e73] hover:text-brand-600">← Projects</Link>
        <Link href={'/projects/' + id + '/report'} className="ml-auto text-sm font-semibold text-brand-600 hover:underline">Status report →</Link>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-4">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6e6e73]">Progress</div>
          <div className="text-[28px] font-extrabold tracking-tight mt-1">{pct}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1"><div className="h-1.5 rounded-full bg-brand-600" style={{ width: pct + '%' }} /></div>
          <div className="text-[11px] text-[#6e6e73] mt-1.5">{done} of {total} tasks done</div>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-4">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6e6e73]">Late</div>
          <div className={'text-[28px] font-extrabold tracking-tight mt-1 ' + (late ? 'text-brand-600' : '')}>{late}</div>
          <div className="text-[11px] text-[#6e6e73]">{late ? 'tasks past their due date' : 'nothing late'}</div>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-4 col-span-2">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6e6e73]">Next step</div>
          {next ? (
            <>
              <div className="text-[15px] font-semibold mt-1.5 truncate">{next.name}</div>
              <div className="text-[12px] text-[#6e6e73] mt-0.5">{next.assigned_to ?? 'nobody assigned'}{next.due_date ? ' · due ' + nice(next.due_date) : ''}</div>
            </>
          ) : <div className="text-[15px] font-semibold mt-1.5 text-[#057642]">All done ✓</div>}
          <div className="text-[11px] text-[#6e6e73] mt-2 truncate">
            {[p.client_first_name, p.client_last_name].filter(Boolean).join(' ') || 'Contact'} · {p.client_email} · started {p.start_date ? nice(p.start_date) : '—'}
          </div>
        </div>
      </section>

      <TaskList projectId={p.id} tasks={taskRows} canEditMeta={true} canDelete={true} tools={tools} team={team} />

      <details className="mt-10 border-t border-[#e5e7eb] pt-4">
        <summary className="cursor-pointer text-xs text-[#6e6e73] hover:text-red-700">Delete this project…</summary>
        <form action={deleteProject} className="mt-3 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <input type="hidden" name="projectId" value={p.id} />
          <span className="text-xs text-red-800">This removes the project and all its tasks. It cannot be undone.</span>
          <button type="submit" formAction={deleteProject} className="ml-auto text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md px-3 py-1.5">
            Yes, delete it
          </button>
        </form>
      </details>
    </AppShell>
  )
}
