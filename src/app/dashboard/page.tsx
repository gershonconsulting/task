export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import ClientBoard, { toCard, type BoardRow } from '@/components/ClientBoard'
import { loadBoardData } from '@/lib/clientBoard'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const board = await loadBoardData()
  const { clients } = board

  // Rows are attention: whatever needs you first sits at the top of every column.
  const rows: BoardRow[] = [
    {
      id: 'risk', label: 'Needs you', tone: 'overdue',
      cells: clients.map(c => c.projects.filter(p => p.status === 'overdue').map(p => toCard(p))),
    },
    {
      id: 'run', label: 'Running', tone: 'active',
      cells: clients.map(c => c.projects.filter(p => p.status === 'active' || p.status === 'idle').map(p => toCard(p))),
    },
    {
      id: 'done', label: 'Done', tone: 'complete',
      cells: clients.map(c => c.projects.filter(p => p.status === 'complete').map(p => toCard(p))),
    },
  ]

  return (
    <AppShell
      userName={user.name}
      userRole={user.role}
      pageTitle="Dashboard"
      pageSubtitle={'Welcome back, ' + user.name.split(' ')[0]}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="col-span-2 md:col-span-1 bg-indigo-600 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Overall progress</div>
          <div className="text-6xl font-black text-white leading-none mt-2 tabular-nums">
            {board.overallPct}<span className="text-2xl text-indigo-300">%</span>
          </div>
          <div className="mt-3 w-full bg-indigo-500 rounded-full h-2">
            <div className="h-2 rounded-full bg-white" style={{ width: board.overallPct + '%' }} />
          </div>
          <div className="text-indigo-200 text-xs mt-2 tabular-nums">{board.taskDone} of {board.taskTotal} tasks done</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Clients</div>
          <div className="text-4xl font-black text-slate-800 mt-1 tabular-nums">{clients.length}</div>
          <div className="text-xs text-slate-400 mt-2 tabular-nums">{board.projectCount} projects</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-red-500">Overdue</div>
          <div className="text-4xl font-black text-red-500 mt-1 tabular-nums">{board.taskOverdue}</div>
          <div className="text-xs text-slate-400 mt-2 tabular-nums">across {board.clientsAtRisk} clients</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-green-600">Clear</div>
          <div className="text-4xl font-black text-green-600 mt-1 tabular-nums">{clients.length - board.clientsAtRisk}</div>
          <div className="text-xs text-slate-400 mt-2">clients with nothing late</div>
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Columns: client · Rows: attention</h2>
        <Link href="/tasks" className="text-xs text-indigo-500 hover:underline">All tasks &rarr;</Link>
      </div>

      <ClientBoard clients={clients} rows={rows} maxHeight="calc(100vh - 24rem)" />
    </AppShell>
  )
}
