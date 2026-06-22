import { notFound } from 'next/navigation'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, type SessionData } from '@/lib/session'
import { supabaseAdmin, type ProjectRow, type TaskRow } from '@/lib/supabaseServer'
import { getTemplate } from '@/lib/templates'
import AppHeader from '@/components/AppHeader'
import TaskList from './TaskList'
import { deleteProject } from './actions'

export const runtime = 'edge'

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
    const userName = session.user?.name ?? 'Guest'

  const supa = supabaseAdmin()
    const { data: project } = await supa.from('projects').select('*').eq('id', id).maybeSingle()
    if (!project) notFound()
    const p = project as ProjectRow

  const { data: tasks } = await supa.from('tasks').select('*').eq('project_id', id).order('position', { ascending: true })
    const taskRows = (tasks ?? []) as TaskRow[]

  const tpl = getTemplate(p.template_slug)
    const total = taskRows.length
    const done = taskRows.filter(t => t.status === 'completed').length
    const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
              <div className="max-w-5xl mx-auto px-6 py-8">
                      <AppHeader
                                  title={p.company_name}
                                  subtitle={`${tpl?.icon ?? ''} ${tpl?.label ?? p.template_slug} · ${p.status.replace('_', ' ')}`}
                                  back={{ href: '/projects', label: 'Projects' }}
                                  user={{ name: userName, role: 'admin' }}
                                />
              
                      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Progress</div>div>
                                            <div className="text-3xl font-light text-slate-900 mt-1">{pct}%</div>div>
                                            <div className="text-xs text-slate-500 mt-1">{done}/{total} tasks done</div>div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                                                          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: tpl?.color ?? '#6366f1' }} />
                                            </div>div>
                                </div>div>
                                <div>
                                            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Contact</div>div>
                                            <div className="text-sm text-slate-900 mt-1">{[p.client_first_name, p.client_last_name].filter(Boolean).join(' ') || '—'}</div>div>
                                  {p.client_title && <div className="text-xs text-slate-500">{p.client_title}</div>div>}
                                            <div className="text-xs text-slate-500 mt-1 truncate">{p.client_email}</div>div>
                                </div>div>
                                <div>
                                            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Timeline</div>div>
                                            <div className="text-sm text-slate-900 mt-1">{p.start_date ?? '—'}</div>div>
                                            <div className="text-xs text-slate-500">to {p.end_date ?? '—'}</div>div>
                                </div>div>
                                <div>
                                            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Created by</div>div>
                                            <div className="text-sm text-slate-900 mt-1 truncate">{p.created_by_email}</div>div>
                                            <div className="text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</div>div>
                                </div>div>
                      </section>section>
              
                      <TaskList projectId={p.id} tasks={taskRows} canEditMeta={true} canDelete={true} />
              
                      <form action={deleteProject} className="mt-10 border-t border-red-100 pt-5">
                                <input type="hidden" name="projectId" value={p.id} />
                                <button type="submit" formAction={deleteProject} className="text-xs text-red-600 hover:text-red-800 underline">
                                            Delete this project (cannot be undone)
                                </button>button>
                      </form>form>
              </div>div>
        </div>div>
      )
}</div>
