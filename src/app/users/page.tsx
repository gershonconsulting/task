export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getTemplate } from '@/lib/templates'
import StatusSelect from '../tasks/StatusSelect'
import Link from 'next/link'

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
}

interface ProjMeta { id: string; company_name: string; client_email: string | null; template_slug: string }

export default async function UsersPage() {
  const user = await getCurrentUser()
  const supa = supabaseAdmin()

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supa.from('tasks').select('*'),
    supa.from('projects').select('id, company_name, client_email, template_slug'),
  ])

  const allTasks = (tasks ?? []) as Array<{
    id: string; name: string; status: string | null; assigned_to: string | null;
    due_date: string | null; priority: string | null; project_id: string | null; tool?: string | null;
  }>
  const projectMap = new Map((projects ?? []).map(p => [p.id, p as ProjMeta]))

  const byUser = new Map<string, typeof allTasks>()
  for (const t of allTasks) {
    const key = t.assigned_to ?? 'Unassigned'
    byUser.set(key, [...(byUser.get(key) ?? []), t])
  }
  const entries = Array.from(byUser.entries()).sort((a, b) => b[1].length - a[1].length)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle='By Provider' pageSubtitle='Task workload per team member, grouped by client'>
      {entries.length === 0 ? (
        <p className='text-slate-400'>No tasks found.</p>
      ) : (
        <div className='space-y-6'>
          {entries.map(([name, userTasks]) => {
            const open = userTasks.filter(t => t.status !== 'completed')
            const done = userTasks.filter(t => t.status === 'completed')
            const byClient = new Map<string, typeof userTasks>()
            for (const t of userTasks) {
              const proj = t.project_id ? projectMap.get(t.project_id) : undefined
              const ck = proj?.company_name ?? 'No client'
              byClient.set(ck, [...(byClient.get(ck) ?? []), t])
            }
            const clientGroups = Array.from(byClient.entries()).sort((a, b) => a[0].localeCompare(b[0]))
            return (
              <div key={name} className='bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden'>
                <div className='flex items-center justify-between px-5 py-4 border-b border-slate-100'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0'>
                      {name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <h2 className='font-semibold text-slate-900'>{name}</h2>
                  </div>
                  <div className='text-sm text-slate-500'>
                    <span className='font-medium text-indigo-600'>{open.length}</span> open
                    <span className='mx-1'>·</span>
                    <span className='font-medium text-green-600'>{done.length}</span> done
                  </div>
                </div>
                <div className='divide-y divide-slate-100'>
                  {clientGroups.map(([clientName, clientTasks]) => (
                    <div key={clientName}>
                      <div className='px-5 py-2 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500'>
                        {clientName} <span className='text-slate-400 font-medium'>· {clientTasks.length}</span>
                      </div>
                      <div className='divide-y divide-slate-50'>
                        {clientTasks.map(t => {
                          const st = t.status ?? 'pending'
                          const overdue = t.due_date && t.due_date < today && st !== 'completed'
                          const proj = t.project_id ? projectMap.get(t.project_id) : undefined
                          const tpl = proj ? getTemplate(proj.template_slug) : undefined
                          return (
                            <div key={t.id} className='flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition'>
                              <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority ?? 'medium'] ?? 'bg-slate-300'}`} title={(t.priority ?? 'medium') + ' priority'} />
                              <StatusSelect taskId={t.id} projectId={t.project_id ?? ''} status={st} />
                              <span className='flex-1 text-sm text-slate-800 truncate min-w-0'>{t.name}</span>
                              {tpl && (
                                <span className='text-xs text-slate-400 shrink-0 hidden md:inline-flex items-center gap-1'>
                                  <span>{tpl.icon}</span>
                                  <span className='truncate max-w-[120px]'>{tpl.label}</span>
                                </span>
                              )}
                              {t.tool && (
                                <span className='text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-200 shrink-0 hidden sm:inline'>{t.tool}</span>
                              )}
                              {t.due_date && (
                                <span className={`text-xs shrink-0 ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                                  {overdue ? '⚠ ' : ''}{new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {t.project_id && (
                                <Link href={'/projects/' + t.project_id} className='text-xs text-slate-300 hover:text-indigo-500 shrink-0 hidden xl:block'>↗</Link>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
