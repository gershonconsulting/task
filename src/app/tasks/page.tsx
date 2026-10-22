export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { supabaseAdmin } from '@/lib/supabaseServer'
import Link from 'next/link'
import { loadTemplateMap } from '@/lib/templates/runtime'
import { isAssignedTo, loadTeam } from '@/lib/team'
import { addDays, cleanClient, etToday } from '@/lib/myWork'
import StatusSelect from './StatusSelect'

type T = {
  id: string; name: string; status: string | null; assigned_to: string | null
  due_date: string | null; priority: string | null; project_id: string | null; updated_at: string
}

function niceDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; provider?: string; status?: string; q?: string }>
}) {
  const user = await getCurrentUser()
  const sp = await searchParams
  const supa = supabaseAdmin()
  const [tplMap, team, tasksRes, projRes] = await Promise.all([
    loadTemplateMap(),
    loadTeam(),
    supa.from('tasks').select('id, name, status, assigned_to, due_date, priority, project_id, updated_at'),
    supa.from('projects').select('id, company_name, template_slug, status'),
  ])
  const projects = new Map(((projRes.data ?? []) as { id: string; company_name: string; template_slug: string; status: string }[])
    .filter(p => p.status !== 'archived').map(p => [p.id, p]))
  const all = ((tasksRes.data ?? []) as T[]).filter(t => t.project_id && projects.has(t.project_id))

  // Filters — default: my open tasks.
  const me = team.find(m => m.id === user.id) ?? team.find(m => m.email === user.email)
  const legacyProvider = sp.provider ? team.find(m => m.name === sp.provider)?.id : undefined
  const who = sp.who ?? legacyProvider ?? 'me'
  const status = sp.status ?? 'open'
  const q = (sp.q ?? '').trim().toLowerCase()

  let rows = all
  if (who === 'me') rows = rows.filter(t => isAssignedTo(me ?? { name: user.name, email: user.email }, t.assigned_to))
  else if (who === 'unassigned') rows = rows.filter(t => !t.assigned_to)
  else if (who !== 'all') { const m = team.find(x => x.id === who); if (m) rows = rows.filter(t => isAssignedTo(m, t.assigned_to)) }
  if (q) rows = rows.filter(t => {
    const p = projects.get(t.project_id!)!
    return (t.name + ' ' + p.company_name + ' ' + (t.assigned_to ?? '')).toLowerCase().includes(q)
  })
  const open = rows.filter(t => t.status !== 'completed')
  const done = rows.filter(t => t.status === 'completed').sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  const today = etToday(), week = addDays(today, 7)
  const byDue = (a: T, b: T) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
  const groups = [
    { id: 'late', title: 'Late', tone: 'text-brand-600', items: open.filter(t => t.due_date && t.due_date < today).sort(byDue) },
    { id: 'today', title: 'Due today', tone: 'text-amber-700', items: open.filter(t => t.due_date === today) },
    { id: 'week', title: 'Next 7 days', tone: 'text-[#1d1d1f]', items: open.filter(t => t.due_date && t.due_date > today && t.due_date <= week).sort(byDue) },
    { id: 'later', title: 'Later', tone: 'text-[#1d1d1f]', items: open.filter(t => t.due_date && t.due_date > week).sort(byDue) },
    { id: 'nodate', title: 'No due date', tone: 'text-[#6e6e73]', items: open.filter(t => !t.due_date) },
  ].filter(g => g.items.length)

  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ who, status, ...(q ? { q } : {}), ...patch })
    if (p.get('who') === 'me') p.delete('who')
    if (p.get('status') === 'open') p.delete('status')
    if (!p.get('q')) p.delete('q')
    const s = p.toString()
    return '/tasks' + (s ? '?' + s : '')
  }
  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-[13px] font-medium border transition ${active ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-[#1d1d1f] border-[#e5e7eb] hover:border-brand-600 hover:text-brand-600'}`

  const whoChips = [
    { id: 'me', label: 'Me' },
    { id: 'all', label: 'Everyone' },
    ...team.filter(m => m.id !== me?.id).map(m => ({ id: m.id, label: m.name.split(' ')[0] })),
    { id: 'unassigned', label: 'Nobody assigned' },
  ]
  const whoLabel = whoChips.find(c => c.id === who)?.label ?? 'Everyone'

  const Row = ({ t }: { t: T }) => {
    const p = projects.get(t.project_id!)!
    const tpl = tplMap.get(p.template_slug)
    const st = t.status ?? 'pending'
    const late = st !== 'completed' && t.due_date && t.due_date < today
    const daysLate = late ? Math.round((new Date(today + 'T12:00:00Z').getTime() - new Date(t.due_date + 'T12:00:00Z').getTime()) / 86400000) : 0
    return (
      <li className="flex items-center gap-3 py-2.5">
        <StatusSelect taskId={t.id} projectId={t.project_id ?? ''} status={st} />
        <div className="flex-1 min-w-0">
          <div className={`text-[14px] break-words sm:truncate ${st === 'completed' ? 'text-[#6e6e73] line-through decoration-slate-300' : 'font-medium'}`}>
            {t.priority === 'high' && st !== 'completed' && <span className="mr-1.5 text-[10px] font-bold uppercase text-brand-700 bg-brand-50 border border-brand-100 rounded px-1.5 py-0.5 align-middle">high</span>}
            {t.name}
          </div>
          <Link href={'/projects/' + p.id} className="text-[12px] text-[#6e6e73] hover:text-brand-600 truncate block">
            {cleanClient(p.company_name)} · {tpl?.icon} {tpl?.label ?? p.template_slug}
          </Link>
        </div>
        <span className={`text-[12px] shrink-0 w-28 truncate text-right hidden sm:block ${t.assigned_to ? 'text-[#6e6e73]' : 'text-brand-600 font-semibold'}`}>
          {t.assigned_to ?? 'nobody'}
        </span>
        <span className={`text-[12px] shrink-0 w-20 sm:w-28 text-right ${late ? 'text-brand-600 font-semibold' : t.due_date === today ? 'text-amber-700 font-semibold' : 'text-[#6e6e73]'}`}>
          {!t.due_date ? '—' : late ? `${daysLate}d late` : t.due_date === today ? 'today' : niceDate(t.due_date)}
        </span>
      </li>
    )
  }

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="Tasks"
      pageSubtitle={`${whoLabel === 'Me' ? 'My' : whoLabel === 'Everyone' ? 'Everyone’s' : whoLabel + '’s'} ${status === 'done' ? 'finished' : status === 'all' ? '' : 'open'} tasks — most urgent first`}>

      <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6e6e73] w-14">Who</span>
          {whoChips.map(c => <Link key={c.id} href={link({ who: c.id })} className={chip(who === c.id)}>{c.label}</Link>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6e6e73] w-14">Show</span>
          {[{ k: 'open', l: 'To do' }, { k: 'done', l: 'Done' }, { k: 'all', l: 'All' }].map(s =>
            <Link key={s.k} href={link({ status: s.k })} className={chip(status === s.k)}>{s.l}</Link>)}
          <form action="/tasks" className="ml-auto flex items-center gap-2">
            {who !== 'me' && <input type="hidden" name="who" value={who} />}
            {status !== 'open' && <input type="hidden" name="status" value={status} />}
            <input name="q" defaultValue={sp.q ?? ''} placeholder="Search a task or client…"
              className="w-64 max-w-full px-3 py-1.5 rounded-lg border border-[#e5e7eb] text-[13px] focus:outline-none focus:border-brand-600" />
          </form>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 text-[13px] text-[#6e6e73]">
        <span><strong className="text-[#1d1d1f]">{open.length}</strong> to do</span>
        {groups[0]?.id === 'late' && <span><strong className="text-brand-600">{groups[0].items.length}</strong> late</span>}
        <span><strong className="text-[#057642]">{done.length}</strong> done</span>
      </div>

      {status !== 'done' && (groups.length === 0
        ? <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-8 text-center text-[#6e6e73]">Nothing to do here. ✓</div>
        : groups.map(g => (
          <section key={g.id} className="bg-white border border-[#e5e7eb] rounded-xl px-5 pt-4 pb-2 mb-4">
            <h3 className={`text-[13px] font-extrabold uppercase tracking-[0.06em] ${g.tone}`}>{g.title} <span className="text-[#6e6e73] font-semibold">({g.items.length})</span></h3>
            <ul className="divide-y divide-[#f0f0f2]">{g.items.map(t => <Row key={t.id} t={t} />)}</ul>
          </section>
        )))}

      {status !== 'open' && done.length > 0 && (
        <section className="bg-white border border-[#e5e7eb] rounded-xl px-5 pt-4 pb-2 mb-4">
          <h3 className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-[#057642]">Done <span className="text-[#6e6e73] font-semibold">({done.length})</span></h3>
          <ul className="divide-y divide-[#f0f0f2]">{done.slice(0, 200).map(t => <Row key={t.id} t={t} />)}</ul>
        </section>
      )}
    </AppShell>
  )
}
