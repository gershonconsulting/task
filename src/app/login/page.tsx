'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import pkg from '../../../package.json'

const USERS = [
  { key: 'olivier', name: 'Olivier Attia', email: 'olivier@gershonconsulting.com', role: 'Admin' },
  { key: 'winnie',  name: 'Winnie Lauren',  email: 'winnie.lauren@gershonconsulting.com', role: 'Team' },
  { key: 'aina',    name: 'Aina Rama',      email: 'aina.rama@gershonconsulting.com',    role: 'Team' },
  ]

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

  async function pick(user: typeof USERS[0]) {
        setLoading(user.key)
        setError(null)
        try {
                const res = await fetch('/api/auth/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ person: user.key }),
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

  return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center px-6 py-12">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-600 font-bold mb-2">Gershon Consulting</p>p>
              <h1 className="text-3xl font-light text-slate-900 mb-1">Task Manager</h1>h1>
              <p className="text-sm text-slate-500 mb-10">Who are you?</p>p>
        
              <div className="flex flex-col gap-4 w-full max-w-xs">
                {USERS.map(u => (
                    <button
                                  key={u.key}
                                  onClick={() => pick(u)}
                                  disabled={loading !== null}
                                  className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg px-5 py-4 shadow-sm hover:shadow-md hover:border-indigo-400 transition disabled:opacity-50 text-left"
                                >
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                                  {u.name[0]}
                                </div>div>
                                <div>
                                              <div className="font-semibold text-slate-900 text-sm">
                                                {loading === u.key ? 'Signing in…' : u.name}
                                              </div>div>
                                              <div className="text-xs text-slate-500">{u.role}</div>div>
                                </div>div>
                    </button>button>
                  ))}
              </div>div>
        
          {error && <p className="mt-6 text-sm text-red-600">{error}</p>p>}
              <p className="mt-10 text-xs text-slate-400">v{pkg.version}</p>p>
        </div>div>
      )
}</div>
