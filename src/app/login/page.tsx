'use client'

import { useState, useEffect } from 'react'
import pkg from '../../../package.json'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'team'
}

const DEFAULT_USERS: TeamMember[] = [
  { id: 'olivier', name: 'Olivier Attia', email: 'olivier@gershonconsulting.com', role: 'admin' },
  { id: 'winnie', name: 'Winnie Lauren', email: 'winnie.lauren@gershonconsulting.com', role: 'team' },
  { id: 'aina', name: 'Aina Rama', email: 'aina.rama@gershonconsulting.com', role: 'team' },
  { id: 'sai', name: 'Sai', email: 'sai@gershonconsulting.com', role: 'team' },
]

export default function LoginPage() {
  const [tab, setTab] = useState<'team' | 'client'>('team')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<TeamMember[]>(DEFAULT_USERS)
  const [clientEmail, setClientEmail] = useState('')
  const [clientPassword, setClientPassword] = useState('')
  const [clientLoading, setClientLoading] = useState(false)

  useEffect(() => {
    fetch('/api/settings/team')
      .then(r => r.json())
      .then(data => { if (data.members?.length) setUsers(data.members) })
      .catch(() => {})
  }, [])

  async function pickTeamMember(user: TeamMember) {
    setLoading(user.id)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: user.id }),
      })
      if (res.ok) {
        window.location.href = '/projects'
      } else {
        const d = await res.json()
        setError(d.error ?? 'Something went wrong.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setLoading(null)
    }
  }

  async function handleClientLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setClientLoading(true)
    try {
      const res = await fetch('/api/auth/client-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clientEmail, password: clientPassword }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        window.location.href = '/client'
      } else {
        setError(data.error ?? 'Invalid email or password.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setClientLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center px-6 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-indigo-600 font-bold mb-2">Gershon Consulting</p>
      <h1 className="text-3xl font-light text-slate-900 mb-1">Task Manager</h1>
      <p className="text-sm text-slate-500 mb-8">Sign in to continue</p>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-8 w-full max-w-xs">
        <button
          onClick={() => { setTab('team'); setError(null) }}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${tab === 'team' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Team
        </button>
        <button
          onClick={() => { setTab('client'); setError(null) }}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${tab === 'client' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Client
        </button>
      </div>

      {tab === 'team' ? (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => pickTeamMember(u)}
              disabled={loading !== null}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg px-5 py-4 shadow-sm hover:shadow-md hover:border-indigo-400 transition disabled:opacity-50 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                {u.name[0]}
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">
                  {loading === u.id ? 'Signing in…' : u.name}
                </div>
                <div className="text-xs text-slate-500 capitalize">{u.role}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleClientLogin} className="w-full max-w-xs space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={clientPassword}
              onChange={e => setClientPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={clientLoading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold transition"
          >
            {clientLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {error && <p className="mt-6 text-sm text-red-600 text-center">{error}</p>}
      <p className="mt-10 text-xs text-slate-400">v{pkg.version}</p>
    </div>
  )
}
