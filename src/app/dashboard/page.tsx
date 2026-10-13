export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import ClientBoard, { toCard, type BoardRow } from '@/components/ClientBoard'
import MyTaskList from '@/components/MyTaskList'
import { loadBoardData } from '@/lib/clientBoard'
import { loadMyWork } from '@/lib/myWork'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function plural(n: number, one: string, many = one + 's') { return `${n} ${n === 1 ? one : many}` }

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (user.role === 'client') redirect('/client')
  const [work, board] = await Promise.all([loadMyWork(user), loadBoardData()])
  const first = user.name.split(' ')[0]
  const isAdmin = user.role === 'admin'

  const doNow = [...work.overdue, ...work.dueToday]
  const openCount = doNow.length + work.thisWeek.length + work.later.length + work.noDate.length

  // The one sentence that says what to do.
  let headline: React.ReactNode
  if (work.overdue.length) {
    headline = <>You have <strong className="text-brand-600">{plural(work.overdue.length, 'late task')}</strong>{work.dueToday.length ? <> and <strong>{work.dueToday.length} due today</strong></> : null}. Start with the first one below — it is the most late.</>
  } else if (work.dueToday.length) {
    headline = <>Nothing late. <strong>{plural(work.dueToday.length, 'task')} due today</strong>{work.thisWeek.length ? <>, then {work.thisWeek.length} more this week</> : null}.</>
  } else if (work.thisWeek.length) {
    headline = <>Nothing late, nothing due today. <strong>{plural(work.thisWeek.length, 'task')}</strong> due in the next 7 days.</>
  } else {
    headline = <>You are clear — nothing late and nothing due this week.{openCount ? <> {plural(openCount, 'open task')} further out.</> : null}</>
  }

  const rows: BoardRow[] = [
    { id: 'risk', label: 'Late', tone: 'overdue', cells: board.clients.map(c => c.projects.filter(p => p.status === 'overdue').map(p => toCard(p))) },
    { id: 'run', label: 'Running', tone: 'active', cells: board.clients.map(c => c.projects.filter(p => p.status === 'active' || p.status === 'idle').map(p => toCard(p))) },
    { id: 'done', label: 'Done', tone: 'complete', cells: board.clients.map(c => c.projects.filter(p => p.status === 'complete').map(p => toCard(p))) },
  ]

  const kpi = 'bg-white border border-[#e5e7eb] rounded-xl px-5 py-4'
  const kpiLabel = 'text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6e6e73]'
  const card = 'bg-white border border-[#e5e7eb] rounded-xl p-5'

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="My Dashboard"
      pageSubtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })}>

      {/* What to do — one sentence */}
      <div className="flex items-center justify-between gap-4 flex-wrap px-5 py-4 mb-5 rounded-xl border border-[#e5e7eb] border-l-4 border-l-brand-600 bg-gradient-to-br from-brand-50 to-white">
        <p className="text-[15px]"><span className="font-semibold">{first},</span> {headline}</p>
        <Link href="/tasks" className="text-[13px] font-semibold text-brand-600 hover:underline shrink-0">All tasks →</Link>
      </div>

      {/* My numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <div className={kpi}><div className={kpiLabel}>Late</div><div className={`text-[28px] font-extrabold mt-1 tracking-tight ${work.overdue.length ? 'text-brand-600' : ''}`}>{work.overdue.length}</div><div className="text-[11px] text-[#6e6e73]">assigned to you, past due</div></div>
        <div className={kpi}><div className={kpiLabel}>Due today</div><div className="text-[28px] font-extrabold mt-1 tracking-tight">{work.dueToday.length}</div><div className="text-[11px] text-[#6e6e73]">to finish before tonight</div></div>
        <div className={kpi}><div className={kpiLabel}>Next 7 days</div><div className="text-[28px] font-extrabold mt-1 tracking-tight">{work.thisWeek.length}</div><div className="text-[11px] text-[#6e6e73]">coming up this week</div></div>
        <div className={kpi}><div className={kpiLabel}>Done · last 7 days</div><div className="text-[28px] font-extrabold mt-1 tracking-tight text-[#057642]">{work.doneLast7.length}</div><div className="text-[11px] text-[#6e6e73]">tasks you completed</div></div>
      </div>

      {/* My lists */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-3.5 mb-5">
        <section className={card}>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-[15px] font-bold">1 · Do now</h3>
            <span className="text-[12px] text-[#6e6e73]">late first, then today · tick ✓ when done</span>
          </div>
          <MyTaskList tasks={doNow} today={work.today} limit={15} empty="Nothing late and nothing due today." />
        </section>
        <section className={card}>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-[15px] font-bold">2 · This week</h3>
            <span className="text-[12px] text-[#6e6e73]">next 7 days</span>
          </div>
          <MyTaskList tasks={work.thisWeek} today={work.today} limit={10} empty="Nothing due in the next 7 days." />
          {(work.later.length > 0 || work.noDate.length > 0) && (
            <details className="mt-4 pt-3 border-t border-[#f0f0f2]">
              <summary className="text-[13px] font-semibold cursor-pointer text-[#6e6e73] hover:text-brand-600">
                3 · Later ({work.later.length}) and without a date ({work.noDate.length})
              </summary>
              <div className="mt-2"><MyTaskList tasks={[...work.later, ...work.noDate]} today={work.today} limit={20} empty="" /></div>
            </details>
          )}
        </section>
      </div>

      {/* Team — admins see who is behind */}
      {isAdmin && (
        <section className={card + ' mb-5'}>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-[15px] font-bold">Team</h3>
            <span className="text-[12px] text-[#6e6e73]">registered members · Settings → Team members</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-[#6e6e73] border-b border-[#e5e7eb]">
                  <th className="py-2 pr-3 font-semibold">Member</th>
                  <th className="py-2 px-3 font-semibold text-right">Late</th>
                  <th className="py-2 px-3 font-semibold text-right">Next 7 days</th>
                  <th className="py-2 px-3 font-semibold text-right">Open</th>
                  <th className="py-2 pl-3 font-semibold text-right">Done · 7 days</th>
                </tr>
              </thead>
              <tbody>
                {work.team.map(t => (
                  <tr key={t.member.id} className="border-b border-[#f0f0f2] hover:bg-brand-50">
                    <td className="py-2 pr-3"><Link href={'/tasks?provider=' + encodeURIComponent(t.member.name)} className="font-medium hover:text-brand-600">{t.member.name}</Link></td>
                    <td className={`py-2 px-3 text-right tabular-nums ${t.overdue ? 'text-brand-600 font-bold' : 'text-[#6e6e73]'}`}>{t.overdue}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{t.dueThisWeek}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{t.open}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-[#057642]">{t.doneLast7}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {work.unassignedOverdue > 0 && (
            <p className="text-[12px] text-brand-700 mt-3">{plural(work.unassignedOverdue, 'late task')} {work.unassignedOverdue === 1 ? 'has' : 'have'} nobody assigned — <Link href="/tasks?status=pending" className="underline">assign them</Link>.</p>
          )}
        </section>
      )}

      {/* All clients */}
      <div className="flex items-baseline justify-between mt-7 mb-2">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#6e6e73]">All clients · {board.clients.length} clients · {board.projectCount} projects · {board.overallPct}% done</h2>
        <Link href="/clients" className="text-[12px] text-brand-600 hover:underline">By client →</Link>
      </div>
      <ClientBoard clients={board.clients} rows={rows} maxHeight="70vh" />
    </AppShell>
  )
}
