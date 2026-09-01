export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import ClientBoard, { toCard, type BoardRow } from '@/components/ClientBoard'
import { loadBoardData } from '@/lib/clientBoard'

export default async function UsersPage() {
  const user = await getCurrentUser()
  const { clients } = await loadBoardData()

  // Rows are people. Each card is that person's share of the project, not the whole project.
  const load = new Map<string, number>()
  for (const c of clients) {
    for (const p of c.projects) {
      for (const s of p.providers) load.set(s.name, (load.get(s.name) ?? 0) + s.total)
    }
  }
  const people = [...load.entries()]
    .sort((a, b) => (a[0] === 'Unassigned' ? 1 : b[0] === 'Unassigned' ? -1 : b[1] - a[1]))
    .map(([name]) => name)

  const rows: BoardRow[] = people.map(name => ({
    id: name,
    label: name,
    cells: clients.map(c => c.projects
      .map(p => {
        const share = p.providers.find(s => s.name === name)
        return share ? toCard(p, { share }) : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)),
  }))

  return (
    <AppShell
      userName={user.name}
      userRole={user.role}
      pageTitle="By Provider"
      pageSubtitle="One row per person — each card is their share of the project, not the whole thing"
    >
      <ClientBoard clients={clients} rows={rows} />
    </AppShell>
  )
}
