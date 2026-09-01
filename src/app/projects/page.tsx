export const runtime = 'edge'

import Link from 'next/link'
import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import ClientBoard, { toCard, type BoardRow } from '@/components/ClientBoard'
import { loadBoardData, PROJECT_GROUPS } from '@/lib/clientBoard'

export default async function ProjectsPage() {
  const user = await getCurrentUser()
  const { clients, projectCount } = await loadBoardData()

  // Rows are the four project groups.
  const rows: BoardRow[] = PROJECT_GROUPS.map(g => ({
    id: g,
    label: g,
    cells: clients.map(c => c.projects.filter(p => p.group === g).map(p => toCard(p))),
  }))

  return (
    <AppShell
      userName={user.name}
      userRole={user.role}
      pageTitle="Projects"
      pageSubtitle="All engagements — OnBoarding, OnGoing, Closing, Internal"
    >
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/projects/new"
          className="inline-block px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
        >
          + New Project
        </Link>
        <span className="text-xs text-slate-400 tabular-nums">
          {projectCount} project{projectCount === 1 ? '' : 's'} across {clients.length} client{clients.length === 1 ? '' : 's'}
        </span>
      </div>

      {projectCount === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-300">
          <p className="text-slate-500 mb-4">No projects yet.</p>
          <Link href="/projects/new" className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold">
            Create the first one
          </Link>
        </div>
      ) : (
        <ClientBoard clients={clients} rows={rows} maxHeight="calc(100vh - 17rem)" />
      )}
    </AppShell>
  )
}
