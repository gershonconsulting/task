export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import ClientBoard, { toCard, type BoardRow } from '@/components/ClientBoard'
import { loadBoardData, type ProjStatus } from '@/lib/clientBoard'

const BANDS: { id: ProjStatus; label: string }[] = [
  { id: 'overdue',  label: 'Overdue' },
  { id: 'active',   label: 'In progress' },
  { id: 'idle',     label: 'Not started' },
  { id: 'complete', label: 'Complete' },
]

export default async function StagesPage() {
  const user = await getCurrentUser()
  const { clients } = await loadBoardData()

  const rows: BoardRow[] = BANDS.map(b => ({
    id: b.id,
    label: b.label,
    tone: b.id,
    cells: clients.map(c => c.projects.filter(p => p.status === b.id).map(p => toCard(p))),
  }))

  return (
    <AppShell
      userName={user.name}
      userRole={user.role}
      pageTitle="By Stage"
      pageSubtitle="Read a row to compare every client at one status; read a column for one client's whole spread"
    >
      <ClientBoard clients={clients} rows={rows} />
    </AppShell>
  )
}
