export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import ClientBoard, { toCard, type BoardRow } from '@/components/ClientBoard'
import { loadBoardData } from '@/lib/clientBoard'

export default async function ClientsPage() {
  const user = await getCurrentUser()
  const { clients } = await loadBoardData()

  // No rows here — the whole portfolio in one band, cards open to show who is on each project.
  const rows: BoardRow[] = [{
    id: 'all',
    label: null,
    cells: clients.map(c => c.projects.map(p => toCard(p, { detail: true }))),
  }]

  return (
    <AppShell
      userName={user.name}
      userRole={user.role}
      pageTitle="By Client"
      pageSubtitle="One column per client — click a project to see who is carrying it"
    >
      <ClientBoard clients={clients} rows={rows} />
    </AppShell>
  )
}
