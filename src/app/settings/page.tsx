import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { getCurrentUser } from '@/lib/currentUser'
import TemplatesEditor from './TemplatesEditor'

export const runtime = 'edge'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <AppShell userName={user.name} userRole={user.role} pageTitle="Settings">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage project templates — changes apply to all new projects.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Project Templates</h2>
          <p className="text-sm text-slate-500 mb-4">
            Edit the default tasks, assignees and due-date offsets for each template.
            Changes are saved to the database and take effect on the next new project.
          </p>
          <TemplatesEditor />
        </div>
      </div>
    </AppShell>
  )
          }
