import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, type SessionData } from '@/lib/session'
import AppHeader from '@/components/AppHeader'
import NewProjectForm from './NewProjectForm'

export const runtime = 'edge'

export default async function NewProjectPage() {
      const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
      const userName = session.user?.name ?? 'Guest'

  return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="max-w-4xl mx-auto px-6 py-8">
                        <AppHeader
                                      title="New Project"
                                      subtitle="Pick a template and fill in client info — tasks auto-populate"
                                      back={{ href: '/projects', label: 'Projects' }}
                                      user={{ name: userName, role: 'admin' }}
                                    />
                        <NewProjectForm />
                </div>div>
          </div>div>
        )
}</div>
