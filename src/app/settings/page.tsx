import { redirect } from 'next/navigation'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { isAdminEmail } from '@/lib/roles'
import AppHeader from '@/components/AppHeader'
import PasswordForm from './PasswordForm'

export const runtime = 'edge'

export default async function SettingsPage() {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
    if (!session.user) redirect('/login')

      const isBootstrap = isAdminEmail(session.user.email)

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                  <div className="max-w-2xl mx-auto px-6 py-8">
                          <AppHeader
                                    title="Settings"
                                              subtitle="Account preferences"
                                                        back={{ href: '/projects', label: 'Projects' }}
                                                                  user={{ name: session.user.name, role: 'admin' }}
                                                                          />

                                                                                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
                                                                                            <div>
                                                                                                        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Account</h2>
                                                                                                                    <div className="space-y-3">
                                                                                                                                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                                                                                                                                  <span className="text-sm text-slate-500">Email</span>
                                                                                                                                                                  <span className="text-sm font-medium text-slate-900">{session.user.email}</span>
                                                                                                                                                                                </div>
                                                                                                                                                                                              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                                                                                                                                                                                              <span className="text-sm text-slate-500">Display name</span>
                                                                                                                                                                                                                              <span className="text-sm font-medium text-slate-900">{session.user.name}</span>
                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                            {isBootstrap && (
                                                                                                                                                                                                                                                                                        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                                                                                                                                                                                                                                                                                      <strong>You&apos;re signed in via the bootstrap path.</strong> Password changes are managed
                                                                                                                                                                                                                                                                                                                    via the <code className="font-mono text-xs">ADMIN_PASSWORD</code> environment variable in
                                                                                                                                                                                                                                                                                                                                  Cloudflare Pages. Once a real database user is created for your email, you&apos;ll be able
                                                                                                                                                                                                                                                                                                                                                to change your password here.
                                                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                                                                      )}
                                                                                                                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                                                                                                                                {!isBootstrap && <PasswordForm />}
                                                                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                                                                                                                                                    )
                                                                                                                                                                                                                                                                                                                                                                                                    }
