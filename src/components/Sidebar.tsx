'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import pkg from '../../package.json'

interface SidebarProps {
  userName: string
  userRole: string
  isOwner?: boolean
}

type Item = { href: string; label: string; icon: string }
type Group = { label?: string; items: Item[] }

// Stroke icons in the Linalysis style (24×24 viewBox, inner SVG markup).
const I = {
  dash: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  building: '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/>',
  layers: '<path d="M12 2l10 6-10 6L2 8z"/><path d="M2 16l10 6 10-6"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
}

const TEAM_NAV: Group[] = [
  { items: [
    { href: '/dashboard', label: 'Dashboard', icon: I.dash },
    { href: '/tasks', label: 'Tasks', icon: I.check },
  ] },
  { label: 'Boards', items: [
    { href: '/clients', label: 'By Client', icon: I.building },
    { href: '/projects', label: 'By Project', icon: I.folder },
    { href: '/stages', label: 'By Stage', icon: I.layers },
    { href: '/users', label: 'By Person', icon: I.users },
    { href: '/tools', label: 'By Tool', icon: I.tool },
  ] },
  { label: 'Reports', items: [
    { href: '/monthly-reports', label: 'Monthly Reports', icon: I.cal },
    { href: '/reports', label: 'Project Reports', icon: I.doc },
  ] },
]

const CLIENT_NAV: Group[] = [{ items: [{ href: '/client', label: 'My Tasks', icon: I.check }] }]

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-[18px] h-[18px] shrink-0" dangerouslySetInnerHTML={{ __html: d }} />
  )
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#CC3333" />
      <path d="M18 33l9 9 19-20" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login?signed_out=1'
}

export default function Sidebar({ userName, userRole, isOwner }: SidebarProps) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const isClient = userRole === 'client'
  const NAV = isClient ? CLIENT_NAV : TEAM_NAV

  function isActive(href: string) {
    if (href === '/dashboard' || href === '/client') return path === href
    return path === href || path.startsWith(href + '/')
  }

  const linkCls = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors ${
      active ? 'bg-brand-600 text-white' : 'text-[#1d1d1f] hover:bg-brand-50 hover:text-brand-600'}`

  const body = (
    <>
      <Link href={isClient ? '/client' : '/dashboard'} className="flex items-center gap-2.5 px-2.5 pt-1 pb-4" onClick={() => setOpen(false)}>
        <BrandMark />
        <span className="leading-tight">
          <span className="block text-[20px] font-extrabold tracking-tight text-brand-600">Task</span>
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">by Gershon.AI</span>
        </span>
      </Link>
      <nav className="flex-1 flex flex-col gap-0.5">
        {NAV.map((g, gi) => (
          <div key={gi} className={gi ? 'mt-3' : ''}>
            {g.label && <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6e6e73] px-3 pt-2 pb-1">{g.label}</div>}
            {g.items.map(item => (
              <Link key={item.href} href={item.href} className={linkCls(isActive(item.href))} onClick={() => setOpen(false)}>
                <Icon d={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-3 pt-3 border-t border-[#e5e7eb] flex flex-col gap-0.5">
        {isOwner && (
          <Link href="/admin" className={linkCls(isActive('/admin'))} onClick={() => setOpen(false)}>
            <Icon d={I.shield} /> Admin · Users
          </Link>
        )}
        {!isClient && (
          <Link href="/settings" className={linkCls(isActive('/settings'))} onClick={() => setOpen(false)}>
            <Icon d={I.gear} /> Settings
          </Link>
        )}
        <button onClick={handleLogout} className={linkCls(false) + ' w-full text-left'}>
          <Icon d={I.out} /> Sign out
        </button>
        <div className="px-3 pt-3 text-[12px] text-[#6e6e73] flex items-center justify-between">
          <span className="truncate">{userName}</span>
          <span className="text-[10.5px] font-bold text-brand-600 bg-brand-50 border border-brand-100 rounded-full px-2 py-0.5">v{pkg.version}</span>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* desktop */}
      <aside className="hidden md:flex w-60 shrink-0 bg-white border-r border-[#e5e7eb] px-3 py-[18px] flex-col sticky top-0 h-screen overflow-y-auto">
        {body}
      </aside>
      {/* mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-lg bg-white border border-[#e5e7eb] shadow-sm flex items-center justify-center"
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="relative w-60 max-w-[85vw] bg-white h-full px-3 py-[18px] flex flex-col overflow-y-auto shadow-xl">{body}</aside>
        </div>
      )}
    </>
  )
}
