export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import { loadBoardData, PROJECT_GROUPS } from '@/lib/clientBoard'
import { loadMyWork } from '@/lib/myWork'
import { redirect } from 'next/navigation'
import Link from 'next/link'

/**
 * Dashboard = where we stand with our clients: headline numbers, then charts,
 * then one line per client. Personal to-dos live on /tasks (opens on "Me").
 */
export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (user.role === 'client') redirect('/client')
  const [work, board] = await Promise.all([loadMyWork(user), loadBoardData()])
  const { clients } = board
  const active = clients.filter(c => c.status !== 'complete')
  const allProjects = clients.flatMap(c => c.projects)
  const running = allProjects.filter(p => p.status !== 'complete')
  const byGroup = PROJECT_GROUPS.map(g => ({
    g, total: allProjects.filter(p => p.group === g).length,
    late: allProjects.filter(p => p.group === g && p.status === 'overdue').length,
  }))
  const maxGroup = Math.max(1, ...byGroup.map(x => x.total))
  const people = work.team.filter(t => t.open > 0 || t.doneLast7 > 0)
  const maxOpen = Math.max(1, ...people.map(t => t.open))
  const maxWeek = Math.max(1, ...work.weekly.map(w => w.done))
  const myLate = work.overdue.length, myToday = work.dueToday.length

  const card = 'bg-white border border-[#e5e7eb] rounded-xl p-5'
  const label = 'text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6e6e73]'
  const h3 = 'text-[15px] font-bold'
  const Kpi = ({ title, value, sub, tone = '', href }: { title: string; value: React.ReactNode; sub: string; tone?: string; href?: string }) => {
    const inner = (<><div className={label}>{title}</div><div className={`text-[28px] font-extrabold mt-1 tracking-tight tabular-nums ${tone}`}>{value}</div><div className="text-[11px] text-[#6e6e73]">{sub}</div></>)
    return href
      ? <Link href={href} className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-4 hover:border-brand-600 transition-colors">{inner}</Link>
      : <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-4">{inner}</div>
  }
  const fmtWeek = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="Dashboard"
      pageSubtitle={'Where we stand with our clients · ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })}>

      {/* My own work, one line — the detail lives on Tasks */}
      <Link href="/tasks" className="flex items-center justify-between gap-4 flex-wrap px-5 py-3.5 mb-5 rounded-xl border border-[#e5e7eb] border-l-4 border-l-brand-600 bg-gradient-to-br from-brand-50 to-white hover:border-brand-600 transition-colors">
        <span className="text-[14px]">
          <strong>{user.name.split(' ')[0]}:</strong>{' '}
          {myLate ? <><strong className="text-brand-600">{myLate} late</strong>{myToday ? <>, {myToday} due today</> : null}</> : myToday ? <>{myToday} due today</> : 'nothing late, nothing due today'}
          {work.thisWeek.length ? <> · {work.thisWeek.length} more this week</> : null}
        </span>
        <span className="text-[13px] font-semibold text-brand-600">My tasks →</span>
      </Link>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-5">
        <Kpi title="Active clients" value={active.length} sub={`${clients.length} clients in total`} href="/clients" />
        <Kpi title="Projects running" value={running.length} sub={`${allProjects.length - running.length} finished`} href="/projects" />
        <Kpi title="Overall progress" value={<>{board.overallPct}<span className="text-[16px] text-[#6e6e73]">%</span></>} sub={`${board.taskDone} of ${board.taskTotal} tasks done`} />
        <Kpi title="Late tasks" value={work.totals.late} sub={`at ${board.clientsAtRisk} client${board.clientsAtRisk === 1 ? '' : 's'}`} tone={work.totals.late ? 'text-brand-600' : ''} href="/tasks?who=all" />
        <Kpi title="Due next 7 days" value={work.totals.dueNext7} sub={`${work.totals.unassigned} open tasks have nobody`} href="/tasks?who=all" />
        <Kpi title="Done · last 7 days" value={work.totals.doneLast7} sub="tasks completed by the team" tone="text-[#057642]" />
      </div>

      <div className="grid lg:grid-cols-[3fr_2fr] gap-3.5 mb-5">
        {/* Progress by client */}
        <section className={card}>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className={h3}>Progress by client</h3>
            <span className="text-[12px] text-[#6e6e73]">% of tasks done · late tasks on the right</span>
          </div>
          <ul className="space-y-2.5">
            {clients.map(c => (
              <li key={c.key} title={`${c.name}: ${c.pct}% done (${c.done}/${c.total} tasks), ${c.overdue} late, ${c.projects.length} projects`}>
                <Link href="/clients" className="grid grid-cols-[150px_1fr_64px] items-center gap-3 group">
                  <span className="text-[13px] font-medium truncate group-hover:text-brand-600">{c.name}</span>
                  <span className="relative h-3 bg-[#f0f0f2] rounded">
                    <span className="absolute inset-y-0 left-0 rounded bg-[#1d1d1f]" style={{ width: Math.max(c.pct, 1) + '%' }} />
                    <span className="absolute -top-0.5 text-[10.5px] tabular-nums font-semibold" style={{ left: `calc(${Math.min(c.pct, 88)}% + 6px)` }}>{c.pct}%</span>
                  </span>
                  <span className={`text-[12px] text-right tabular-nums ${c.overdue ? 'text-brand-600 font-semibold' : 'text-[#6e6e73]'}`}>{c.overdue ? `${c.overdue} late` : 'on time'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-3.5">
          {/* Projects by stage */}
          <section className={card}>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className={h3}>Projects by stage</h3>
              <Link href="/projects" className="text-[12px] text-brand-600 hover:underline">See projects →</Link>
            </div>
            <ul className="space-y-2">
              {byGroup.map(x => (
                <li key={x.g} className="grid grid-cols-[96px_1fr_70px] items-center gap-3" title={`${x.g}: ${x.total} projects, ${x.late} with late tasks`}>
                  <span className="text-[13px]">{x.g}</span>
                  <span className="h-3 bg-[#f0f0f2] rounded relative"><span className="absolute inset-y-0 left-0 rounded bg-[#1d1d1f]" style={{ width: (x.total / maxGroup * 100) + '%' }} /></span>
                  <span className="text-[12px] text-right tabular-nums"><strong>{x.total}</strong>{x.late ? <span className="text-brand-600"> · {x.late} late</span> : null}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Completed per week */}
          <section className={card}>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className={h3}>Tasks completed per week</h3>
              <span className="text-[12px] text-[#6e6e73]">last 8 weeks</span>
            </div>
            <div className="flex items-end gap-2 h-28 border-b border-[#e5e7eb]">
              {work.weekly.map((w, i) => (
                <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end h-full" title={`Week of ${fmtWeek(w.weekStart)}: ${w.done} tasks done`}>
                  <span className="text-[10.5px] tabular-nums text-[#6e6e73] mb-0.5">{w.done || ''}</span>
                  <span className={`w-full max-w-[28px] rounded-t ${i === work.weekly.length - 1 ? 'bg-brand-600' : 'bg-[#1d1d1f]'}`} style={{ height: Math.max(w.done / maxWeek * 100, w.done ? 4 : 1) + '%' }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              {work.weekly.map((w, i) => <span key={w.weekStart} className="flex-1 text-center text-[10px] text-[#6e6e73]">{i === work.weekly.length - 1 ? 'this wk' : fmtWeek(w.weekStart)}</span>)}
            </div>
          </section>
        </div>
      </div>

      {/* Workload by person */}
      <section className={card + ' mb-5'}>
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h3 className={h3}>Workload by person</h3>
          <span className="flex items-center gap-4 text-[12px] text-[#6e6e73]">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-600" /> late</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#9ca3af]" /> open, on time</span>
          </span>
        </div>
        <ul className="space-y-2.5">
          {people.map(t => (
            <li key={t.member.id} title={`${t.member.name}: ${t.open} open (${t.overdue} late), ${t.dueThisWeek} due next 7 days, ${t.doneLast7} done last 7 days`}>
              <Link href={'/tasks?who=' + encodeURIComponent(t.member.id)} className="grid grid-cols-[150px_1fr_190px] items-center gap-3 group">
                <span className="text-[13px] font-medium truncate group-hover:text-brand-600">{t.member.name}</span>
                <span className="h-3 flex gap-[2px]" style={{ width: (t.open / maxOpen * 100) + '%' }}>
                  {t.overdue > 0 && <span className="h-full rounded-l bg-brand-600" style={{ flex: t.overdue }} />}
                  {t.open - t.overdue > 0 && <span className={`h-full bg-[#9ca3af] ${t.overdue ? '' : 'rounded-l'} rounded-r`} style={{ flex: t.open - t.overdue }} />}
                </span>
                <span className="text-[12px] text-right tabular-nums text-[#6e6e73]">
                  <strong className="text-[#1d1d1f]">{t.open}</strong> open{t.overdue ? <span className="text-brand-600 font-semibold"> · {t.overdue} late</span> : null} · <span className="text-[#057642]">{t.doneLast7} done</span>
                </span>
              </Link>
            </li>
          ))}
          {work.unassignedOverdue > 0 && (
            <li className="text-[12px] text-brand-700 pt-1">{work.unassignedOverdue} late task{work.unassignedOverdue === 1 ? ' has' : 's have'} nobody assigned — <Link href="/tasks?who=unassigned" className="underline">assign them</Link></li>
          )}
        </ul>
      </section>

      {/* Clients — one line each, late first */}
      <section className={card}>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className={h3}>Clients <span className="text-[#6e6e73] font-medium">· late first</span></h3>
          <Link href="/clients" className="text-[12px] font-semibold text-brand-600 hover:underline">Client board →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-[#6e6e73] border-b border-[#e5e7eb]">
                <th className="py-2 pr-3 font-semibold">Client</th>
                <th className="py-2 px-3 font-semibold text-right">Projects</th>
                <th className="py-2 px-3 font-semibold text-right">Late</th>
                <th className="py-2 px-3 font-semibold">Most urgent next step</th>
                <th className="py-2 pl-3 font-semibold text-right">Done</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => {
                const urgent = c.projects.filter(p => p.next).sort((a, b) => (b.next!.daysLate - a.next!.daysLate) || (a.next!.due ?? '9999').localeCompare(b.next!.due ?? '9999'))[0]
                return (
                  <tr key={c.key} className="border-b border-[#f0f0f2] hover:bg-brand-50 align-top">
                    <td className="py-2.5 pr-3 font-semibold">{c.name}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{c.projects.length}</td>
                    <td className={`py-2.5 px-3 text-right tabular-nums ${c.overdue ? 'text-brand-600 font-bold' : 'text-[#6e6e73]'}`}>{c.overdue || '—'}</td>
                    <td className="py-2.5 px-3">
                      {urgent ? (
                        <Link href={`/projects/${urgent.id}`} className="hover:text-brand-600">
                          {urgent.next!.name}
                          <span className="text-[11px] text-[#6e6e73]"> · {urgent.template?.label ?? urgent.companyName} · </span>
                          <span className={`text-[11px] ${urgent.next!.who ? 'text-[#6e6e73]' : 'text-brand-600 font-semibold'}`}>{urgent.next!.who ?? 'nobody assigned'}</span>
                          {urgent.next!.daysLate > 0 && <span className="text-[11px] text-brand-600 font-semibold"> · {urgent.next!.daysLate}d late</span>}
                        </Link>
                      ) : <span className="text-[#057642]">All done ✓</span>}
                    </td>
                    <td className="py-2.5 pl-3 text-right tabular-nums">{c.pct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
