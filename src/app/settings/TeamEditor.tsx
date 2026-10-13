'use client'

import { useState, useEffect } from 'react'

interface TeamMember {
  id: string
  name: string
  email: string
  linkedin?: string
  linkedinEmail?: string
  linkedinLinked?: boolean
  lastLogin?: string
  unlink?: boolean
  role: 'admin' | 'team'
}

function genId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
}

export default function TeamEditor() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/team')
      .then(r => r.json())
      .then(data => { setMembers(data.members ?? []); setLoading(false) })
      .catch(() => { setError('Failed to load team members'); setLoading(false) })
  }, [])

  function update(idx: number, patch: Partial<TeamMember>) {
    setMembers(prev => { const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next })
    setSaved(false)
  }

  function remove(idx: number) {
    setMembers(prev => prev.filter((_, i) => i !== idx))
    setSaved(false)
  }

  function add() {
    setMembers(prev => [...prev, { id: genId('new'), name: '', email: '', role: 'team' }])
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Loading…</div>

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}

      {members.map((m, idx) => (
        <div key={m.id} className="p-4 bg-[#fafafa] border border-[#e5e7eb] rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {m.name ? m.name[0].toUpperCase() : '?'}
            </div>
            <input value={m.name} onChange={e => update(idx, { name: e.target.value })} placeholder="Full name"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm font-semibold bg-white focus:outline-none focus:border-brand-600" />
            <select value={m.role} onChange={e => update(idx, { role: e.target.value as 'admin' | 'team' })}
              className="px-2 py-2 rounded-lg border border-[#e5e7eb] text-sm bg-white focus:outline-none focus:border-brand-600">
              <option value="team">Team</option>
              <option value="admin">Admin</option>
            </select>
            <button type="button" onClick={() => remove(idx)} className="text-[#6e6e73] hover:text-red-600 text-xs font-semibold px-1" title="Remove member">Remove</button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-[11px] font-semibold text-[#6e6e73] mb-1">Work email (Friday report goes here)</span>
              <input value={m.email} onChange={e => update(idx, { email: e.target.value })} type="email" placeholder="name@gershonconsulting.com"
                className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm bg-white focus:outline-none focus:border-brand-600" />
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold text-[#6e6e73] mb-1">LinkedIn profile (needed to sign in)</span>
              <input value={m.linkedin ?? ''} onChange={e => update(idx, { linkedin: e.target.value })} type="url" placeholder="https://www.linkedin.com/in/…"
                className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm bg-white focus:outline-none focus:border-brand-600" />
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold text-[#6e6e73] mb-1">LinkedIn login email, if different</span>
              <input value={m.linkedinEmail ?? ''} onChange={e => update(idx, { linkedinEmail: e.target.value })} type="email" placeholder="optional"
                className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] text-sm bg-white focus:outline-none focus:border-brand-600" />
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className={`font-semibold px-2 py-0.5 rounded-full ${m.linkedinLinked && !m.unlink ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-white text-[#6e6e73] border border-[#e5e7eb]'}`}>
              {m.linkedinLinked && !m.unlink ? 'Signed in with LinkedIn' + (m.lastLogin ? ' · last ' + new Date(m.lastLogin).toLocaleDateString() : '') : 'Has not signed in yet'}
            </span>
            {m.linkedinLinked && !m.unlink && (
              <button type="button" onClick={() => update(idx, { unlink: true })} className="text-[#6e6e73] hover:text-red-600 underline" title="Forget the LinkedIn account bound to this member">unlink</button>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >+ Add member</button>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold"
        >
          {saving ? 'Saving…' : 'Save team'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
      </div>
    </div>
  )
}
