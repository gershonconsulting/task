'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import pkg from '../../package.json'

interface SidebarProps {
  userName: string
  userRole: string
}

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: '📊' },
  { href: '/projects',   label: 'By Project',   icon: '📁' },
  { href: '/clients',    label: 'By Client',    icon: '🏢' },
  { href: '/tasks',      label: 'Tasks',        icon: '✅' },
  { href: '/tools',      label: 'By Tool',      icon: '🔧' },
  { href: '/users',      label: 'By Provider',  icon: '👥' },
  { href: '/stages',     label: 'By Stage',     icon: '📋' },
  { href: '/reports',    label: 'Reports',      icon: '📄' },
]

export default function Sidebar({ userName, userRole }: SidebarProps) {
  const path = usePathname()
  function isActive(href: string) {
    if (href === '/dashboard') return path === '/dashboard'
    return path.startsWith(href)
  }
  return (
    <aside className="w-56 min-h-screen bg-indigo-900 text-white flex flex-col shrink-0">
      <div className="px-5 pt-6 pb-4 border-b border-indigo-800">
        <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-1">GershonCRM</div>
        <div className="text-white font-semibold text-sm">Task Manager</div>
        <span className="inline-block mt-1 text-[10px] bg-indigo-700 text-indigo-200 px-2 py-0.5 rounded-full">v{pkg.version}</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${isActive(item.href) ? 'bg-white/15 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'}`}>
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        {userRole === 'admin' && (
          <Link href="/admin/users" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${isActive('/admin/users') ? 'bg-white/15 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'}`}>
            <span className="text-base">🔧</span>
            Admin users
          </Link>
        )}
      </nav>
      <div className="px-5 py-4 border-t border-indigo-800">
        <div className="text-xs text-indigo-300 mb-0.5">Signed in as</div>
        <div className="text-sm font-semibold text-white truncate">{userName}</div>
        <div className="mt-3 flex gap-3 text-xs">
          <Link href="/settings" className="text-indigo-300 hover:text-white transition">Settings</Link>
          <Link href="/login" className="text-indigo-300 hover:text-white transition">Switch user</Link>
        </div>
      </div>
    </aside>
  )
}
