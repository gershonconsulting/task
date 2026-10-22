import Sidebar from './Sidebar'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, type SessionData } from '@/lib/session'
import { isOwnerUser } from '@/lib/team'
import { authEnforced } from '@/lib/site'

async function ownerSignedIn(): Promise<boolean> {
  try {
    const s = await getIronSession<SessionData>(await cookies(), getSessionOptions())
    if (s.user) return isOwnerUser(s.user)
  } catch { /* no session */ }
  return !authEnforced()
}

interface AppShellProps {
  children: React.ReactNode
  userName: string
  userRole: string
  pageTitle: string
  pageSubtitle?: string
  actions?: React.ReactNode
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?'
}

/** Gershon unified shell — white 240px sidebar, sticky white page header, content on #fafafa (Linalysis layout, red #CC3333). */
export default async function AppShell({ children, userName, userRole, pageTitle, pageSubtitle, actions }: AppShellProps) {
  const isOwner = await ownerSignedIn()
  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <Sidebar userName={userName} userRole={userRole} isOwner={isOwner} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="gx-topbar sticky top-0 z-30 h-16 bg-white border-b border-[#e5e7eb] flex items-center justify-between gap-3 pl-16 pr-4 md:px-7">
          <div className="min-w-0">
            <h1 className="text-[18px] font-bold tracking-tight truncate">{pageTitle}</h1>
            {pageSubtitle && <p className="text-[12px] text-[#6e6e73] truncate -mt-0.5">{pageSubtitle}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {actions}
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-[13px] font-semibold">{userName}</div>
              <div className="text-[11px] text-[#6e6e73] capitalize">{userRole}</div>
            </div>
            <span className="w-[34px] h-[34px] rounded-full bg-brand-600 text-white inline-flex items-center justify-center font-bold text-[13px]">
              {initials(userName)}
            </span>
          </div>
        </header>
        <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 py-5 md:px-7 md:py-7">
          {children}
        </main>
      </div>
    </div>
  )
}
