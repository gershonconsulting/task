export const runtime = 'edge'

import { getCurrentUser } from '@/lib/currentUser'
import AppShell from '@/components/AppShell'
import NewProjectForm from './NewProjectForm'

export default async function NewProjectPage() {
  const user = await getCurrentUser()
  return (
    <AppShell
      userName={user.name}
      userRole={user.role}
      pageTitle="New Project"
      pageSubtitle="Pick a template and fill in client info — tasks auto-populate"
    >
      <NewProjectForm />
    </AppShell>
  )
}
