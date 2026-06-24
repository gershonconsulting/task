'use client'

import { useState, useEffect } from 'react'

interface TeamMember {
  id: string
  name: string
  email: string
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
        <div key={m.id} className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-md">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {m.name ? m.name[0].toUpperCase() : '?'}
          </div>
          <input
            value={m.name}
            onChange={e => update(idx, { name: e.target.value })}
            placeholder="Full name"
            className="flex-1 min-w-[120px] px-2 py-1.5 rounded border border-slate-200 text-sm bg-white focus:outline-none focus:border-indigo-400"
          />
          <input
            value={m.email}
            onChange={e => update(idx, { email: e.target.value })}
            placeholder="email@gershonconsulting.com"
            type="email"
            className="flex-[2] min-w-[180px] px-2 py-1.5 rounded border border-slate-200 text-sm bg-white focus:outline-none focus:border-indigo-400"
          />
          <select
            value={m.role}
            onChange={e => update(idx, { role: e.target.value as 'admin' | 'team' })}
            className="px-2 py-1.5 rounded border border-slate-200 text-sm bg-white focus:outline-none focus:border-indigo-400"
          >
            <option value="team">Team</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="button"
            onClick={() => remove(idx)}
            className="text-red-400 hover:text-red-600 text-xs font-bold px-1"
            title="Remove member"
          >✕</button>
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
