import Sidebar from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
  userName: string
  userRole: string
  pageTitle: string
  pageSubtitle?: string
}

export default function AppShell({ children, userName, userRole, pageTitle, pageSubtitle }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar userName={userName} userRole={userRole} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-6">
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          {pageSubtitle && <p className="text-blue-100 text-sm mt-1">{pageSubtitle}</p>}
        </header>
        <main className="flex-1 px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
