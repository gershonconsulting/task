export const runtime = 'edge'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin, type ProjectRow, type TaskRow } from '@/lib/supabaseServer'
import { loadTemplateMap } from '@/lib/templates/runtime'
import { cleanClient, etToday } from '@/lib/myWork'
import PrintButton from '@/components/PrintButton'

function nice(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/** Printable one-page status report for a project — shareable with the client. */
export default async function ReportPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supa = supabaseAdmin()
  const [{ data: project }, { data: tasks }, tplMap] = await Promise.all([
    supa.from('projects').select('*').eq('id', id).maybeSingle(),
    supa.from('tasks').select('*').eq('project_id', id).order('position', { ascending: true }),
    loadTemplateMap(),
  ])
  if (!project) notFound()
  const p = project as ProjectRow
  const rows = (tasks ?? []) as TaskRow[]
  const tpl = tplMap.get(p.template_slug)
  const today = etToday()

  const total = rows.length
  const completed = rows.filter(t => t.status === 'completed')
  const open = rows.filter(t => t.status !== 'completed').sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  const late = open.filter(t => t.due_date && t.due_date < today)
  const pct = total === 0 ? 0 : Math.round((completed.length / total) * 100)

  const stat = (label: string, value: string | number, tone = '') => (
    <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 print:border-[#ccc]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6e6e73]">{label}</div>
      <div className={`text-[24px] font-extrabold tracking-tight ${tone}`}>{value}</div>
    </div>
  )
  const line = (t: TaskRow, showDue: boolean) => {
    const isLate = t.status !== 'completed' && t.due_date && t.due_date < today
    return (
      <li key={t.id} className="flex items-baseline justify-between gap-4 py-2 border-b border-[#f0f0f2] text-[14px]">
        <span>{t.status === 'in_progress' && <span className="mr-2 text-[10px] font-bold uppercase text-amber-700">in progress</span>}{t.name}</span>
        <span className={`text-[12px] shrink-0 ${isLate ? 'text-brand-600 font-semibold' : 'text-[#6e6e73]'}`}>
          {t.assigned_to ?? 'Unassigned'}{showDue && t.due_date ? ' · ' + (isLate ? 'late, was due ' : 'due ') + nice(t.due_date) : ''}
        </span>
      </li>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] print:bg-white">
      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href={'/projects/' + p.id} className="text-sm text-[#6e6e73] hover:text-brand-600">← Back to project</Link>
          <PrintButton />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <svg viewBox="0 0 64 64" width="22" height="22"><rect width="64" height="64" rx="14" fill="#CC3333" /><path d="M18 33l9 9 19-20" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-[12px] font-semibold text-[#6e6e73]">Gershon Consulting · Status report</span>
        </div>
        <h1 className="text-[26px] font-extrabold tracking-tight">{cleanClient(p.company_name)}</h1>
        <p className="text-[13px] text-[#6e6e73] mb-6">{tpl?.icon} {tpl?.label ?? p.template_slug} · started {p.start_date ? nice(p.start_date) : '—'} · report of {nice(today)}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {stat('Complete', pct + '%')}
          {stat('Done', completed.length, 'text-[#057642]')}
          {stat('Still to do', open.length)}
          {stat('Late', late.length, late.length ? 'text-brand-600' : '')}
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-8"><div className="h-2 bg-brand-600 rounded-full" style={{ width: pct + '%' }} /></div>

        {open.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-[#6e6e73] mb-1">Next steps</h2>
            <ul>{open.map(t => line(t, true))}</ul>
          </section>
        )}
        {completed.length > 0 && (
          <section>
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-[#057642] mb-1">Done</h2>
            <ul>{completed.map(t => line(t, false))}</ul>
          </section>
        )}
        {total === 0 && <p className="text-[#6e6e73]">This project has no tasks yet.</p>}
      </div>
    </div>
  )
}
