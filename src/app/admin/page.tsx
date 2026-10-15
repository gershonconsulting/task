import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { getCurrentUser } from '@/lib/currentUser'
import { isOwnerUser } from '@/lib/team'
import AdminPanel from './AdminPanel'

export const runtime = 'edge'

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!isOwnerUser(user)) redirect('/dashboard')

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="Admin" pageSubtitle="Users who can sign in with LinkedIn">
      <AdminPanel selfId={user.id ?? ''} />
    </AppShell>
  )
}
