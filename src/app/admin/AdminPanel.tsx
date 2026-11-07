'use client'

import { useEffect, useMemo, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'team'
  linkedin?: string
  linkedinEmail?: string
  linkedinLinked: boolean
  lastLogin?: string
  picture?: string
  inviteUrl?: string
  invitedAt?: string
  createdAt?: string
  owner: boolean
}

const input = 'w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm bg-white focus:outline-none focus:border-brand-600'
const label = 'block text-[11px] font-semibold text-[#6e6e73] mb-1'

/** "https://www.linkedin.com/in/jane-doe-1a2b3c/" → "Jane Doe" */
function nameFromUrl(url: string): string {
  const m = url.match(/linkedin\.com\/in\/([^/?#\s]+)/i)
  if (!m) return ''
  let slug = m[1]
  try { slug = decodeURIComponent(slug) } catch { /* keep */ }
  return slug.split('-').filter(p => p && !/\d/.test(p) && !/^[a-f0-9]{6,}$/i.test(p))
    .map(p => p[0].toUpperCase() + p.slice(1)).join(' ')
}

function initials(n: string) { return n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?' }
function day(d?: string) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '' }

function Avatar({ u }: { u: User }) {
  if (u.picture) return <img src={u.picture} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
  return <span className="w-10 h-10 rounded-full bg-brand-600 text-white inline-flex items-center justify-center font-bold text-sm shrink-0">{initials(u.name)}</span>
}

function Status({ u }: { u: User }) {
  if (u.linkedinLinked) return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Active{u.lastLogin ? ' · last sign-in ' + day(u.lastLogin) : ''}</span>
  if (u.inviteUrl) return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Invited{u.invitedAt ? ' ' + day(u.invitedAt) : ''} · not signed in yet</span>
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#6e6e73] border border-[#e5e7eb]">Not signed in yet</span>
}

export default function AdminPanel({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<User>>({})

  // create form
  const [li, setLi] = useState('')
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [email, setEmail] = useState('')
  const [liEmail, setLiEmail] = useState('')
  const [role, setRole] = useState<'team' | 'admin'>('team')
  const [sendEmail, setSendEmail] = useState(true)

  async function load() {
    const r = await fetch('/api/admin/users')
    const d = await r.json()
    if (r.ok) setUsers(d.users ?? []); else setMsg({ kind: 'err', text: d.error ?? 'Could not load users' })
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    const list = n ? users.filter(u => [u.name, u.email, u.linkedin, u.linkedinEmail].some(x => (x ?? '').toLowerCase().includes(n))) : users
    return [...list].sort((a, b) => Number(b.owner) - Number(a.owner) || a.name.localeCompare(b.name))
  }, [users, q])

  const counts = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.linkedinLinked).length,
    pending: users.filter(u => !u.linkedinLinked).length,
    admins: users.filter(u => u.role === 'admin').length,
  }), [users])

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setMsg({ kind: 'ok', text: 'Invite link copied.' }) }
    catch { window.prompt('Copy this invite link', text) }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy('create'); setMsg(null)
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedin: li, name, email, linkedinEmail: liEmail, role }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not create the user')
      let text = `${d.user.name} created.`
      if (sendEmail && email) {
        const s = await fetch('/api/admin/users/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.user.id, send: true }) })
        const sd = await s.json()
        text += s.ok ? ` Invite e-mailed to ${email}.` : ` E-mail not sent (${sd.error}) — copy the invite link below.`
      } else {
        text += ' Copy the invite link and send it to them.'
      }
      setMsg({ kind: 'ok', text })
      setLi(''); setName(''); setNameTouched(false); setEmail(''); setLiEmail(''); setRole('team')
      await load()
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message })
    } finally { setBusy(null) }
  }

  async function patch(id: string, body: Record<string, unknown>, ok: string) {
    setBusy(id); setMsg(null)
    const r = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) })
    const d = await r.json()
    setBusy(null)
    if (!r.ok) { setMsg({ kind: 'err', text: d.error ?? 'Update failed' }); return false }
    setMsg({ kind: 'ok', text: ok }); await load(); return true
  }

  async function invite(u: User, send: boolean) {
    setBusy(u.id); setMsg(null)
    const r = await fetch('/api/admin/users/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, send }) })
    const d = await r.json()
    setBusy(null)
    if (!r.ok) { setMsg({ kind: 'err', text: d.error ?? 'Invite failed' }); return }
    if (send) setMsg({ kind: 'ok', text: `Invite e-mailed to ${u.email}.` })
    else await copy(d.inviteUrl)
    await load()
  }

  async function remove(u: User) {
    if (!window.confirm(`Remove ${u.name}? They will no longer be able to sign in.`)) return
    setBusy(u.id); setMsg(null)
    const r = await fetch('/api/admin/users?id=' + encodeURIComponent(u.id), { method: 'DELETE' })
    const d = await r.json()
    setBusy(null)
    if (!r.ok) { setMsg({ kind: 'err', text: d.error ?? 'Remove failed' }); return }
    setMsg({ kind: 'ok', text: `${u.name} removed.` }); await load()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Users', counts.total], ['Signed in', counts.active], ['Waiting for first sign-in', counts.pending], ['Admins', counts.admins]].map(([l, v]) => (
          <div key={l as string} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73]">{l}</div>
            <div className="text-2xl font-extrabold tracking-tight mt-0.5">{loading ? '…' : v}</div>
          </div>
        ))}
      </div>

      {/* create */}
      <form onSubmit={create} className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-bold">Create a user</h2>
        <p className="text-sm text-[#6e6e73] mt-0.5 mb-4">Paste their LinkedIn profile. They get a personal invite link — their first LinkedIn sign-in through it binds their account, then the normal “Sign in with LinkedIn” button works.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className={label}>LinkedIn profile link *</span>
            <input required value={li} placeholder="https://www.linkedin.com/in/…" className={input}
              onChange={e => { setLi(e.target.value); if (!nameTouched) setName(nameFromUrl(e.target.value)) }} />
          </label>
          <label className="block">
            <span className={label}>Full name *</span>
            <input required value={name} onChange={e => { setName(e.target.value); setNameTouched(true) }} placeholder="Jane Doe" className={input} />
          </label>
          <label className="block">
            <span className={label}>Work e-mail (invite + Friday report)</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@gershonconsulting.com" className={input} />
          </label>
          <label className="block">
            <span className={label}>LinkedIn login e-mail, if different (optional)</span>
            <input type="email" value={liEmail} onChange={e => setLiEmail(e.target.value)} placeholder="optional" className={input} />
          </label>
          <label className="block">
            <span className={label}>Role</span>
            <select value={role} onChange={e => setRole(e.target.value as 'team' | 'admin')} className={input}>
              <option value="team">Team — sees and updates tasks</option>
              <option value="admin">Admin — also edits settings and templates</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <button type="submit" disabled={busy === 'create'} className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold">
            {busy === 'create' ? 'Creating…' : 'Create user'}
          </button>
          <label className="inline-flex items-center gap-2 text-sm text-[#3a3a3c]">
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="accent-[#CC3333]" />
            E-mail the invite to their work address
          </label>
        </div>
      </form>

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${msg.kind === 'ok' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-brand-50 border-brand-200 text-brand-800'}`}>{msg.text}</div>
      )}

      {/* list */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#e5e7eb]">
          <h2 className="text-base font-bold">Users</h2>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, e-mail, LinkedIn…" className={input + ' max-w-xs'} />
        </div>
        {loading ? <div className="p-8 text-center text-[#6e6e73] text-sm">Loading…</div> : (
          <ul className="divide-y divide-[#f0f0f2]">
            {shown.map(u => (
              <li key={u.id} className="px-5 py-4">
                {editing === u.id ? (
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="block"><span className={label}>Full name</span><input className={input} value={draft.name ?? ''} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
                      <label className="block"><span className={label}>Work e-mail</span><input className={input} value={draft.email ?? ''} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
                      <label className="block"><span className={label}>LinkedIn profile link</span><input className={input} value={draft.linkedin ?? ''} onChange={e => setDraft({ ...draft, linkedin: e.target.value })} /></label>
                      <label className="block"><span className={label}>LinkedIn login e-mail</span><input className={input} value={draft.linkedinEmail ?? ''} onChange={e => setDraft({ ...draft, linkedinEmail: e.target.value })} /></label>
                      <label className="block"><span className={label}>Role</span>
                        <select className={input} value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as 'admin' | 'team' })}>
                          <option value="team">Team</option><option value="admin">Admin</option>
                        </select></label>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" disabled={busy === u.id} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-50"
                        onClick={async () => { if (await patch(u.id, { name: draft.name, email: draft.email, linkedin: draft.linkedin || undefined, linkedinEmail: draft.linkedinEmail ?? '', role: draft.role }, 'Saved.')) setEditing(null) }}>Save</button>
                      <button type="button" className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-sm font-semibold" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-4">
                    <Avatar u={u} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{u.name}</span>
                        <span className={`text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-[#f5f5f7] text-[#6e6e73]'}`}>{u.role}</span>
                        {u.owner && <span className="text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#1d1d1f] text-white">owner</span>}
                        <Status u={u} />
                      </div>
                      <div className="text-[13px] text-[#6e6e73] mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                        {u.email && <span>{u.email}</span>}
                        {u.linkedin
                          ? <a href={u.linkedin} target="_blank" rel="noreferrer" className="text-[#0a66c2] hover:underline">LinkedIn profile ↗</a>
                          : <span className="text-amber-700">No LinkedIn profile</span>}
                        {u.linkedinEmail && u.linkedinEmail !== u.email && <span>LinkedIn: {u.linkedinEmail}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold">
                      {!u.linkedinLinked && (
                        <>
                          <button type="button" disabled={busy === u.id} onClick={() => u.inviteUrl ? copy(u.inviteUrl) : invite(u, false)} className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] hover:border-brand-600 hover:text-brand-600">Copy invite link</button>
                          {u.email && <button type="button" disabled={busy === u.id} onClick={() => invite(u, true)} className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] hover:border-brand-600 hover:text-brand-600">E-mail invite</button>}
                        </>
                      )}
                      {u.linkedinLinked && u.id !== selfId && (
                        <button type="button" disabled={busy === u.id} title="Forget the LinkedIn account bound to this user and issue a new invite"
                          onClick={() => window.confirm(`Reset ${u.name}'s LinkedIn link? They will need a new invite to sign in.`) && patch(u.id, { unlink: true }, `${u.name}'s LinkedIn link reset — a new invite link is ready.`)}
                          className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] hover:border-brand-600 hover:text-brand-600">Reset LinkedIn</button>
                      )}
                      <button type="button" onClick={() => { setEditing(u.id); setDraft(u) }} className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] hover:border-brand-600 hover:text-brand-600">Edit</button>
                      {u.id !== selfId && <button type="button" disabled={busy === u.id} onClick={() => remove(u)} className="px-3 py-1.5 rounded-lg text-[#6e6e73] hover:text-brand-600">Remove</button>}
                    </div>
                  </div>
                )}
              </li>
            ))}
            {!shown.length && <li className="p-8 text-center text-sm text-[#6e6e73]">No user matches.</li>}
          </ul>
        )}
      </div>
    </div>
  )
}
