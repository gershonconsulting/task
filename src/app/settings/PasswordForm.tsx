'use client'

import { useState } from 'react'

export default function PasswordForm() {
    const [current, setCurrent] = useState('')
    const [next, setNext] = useState('')
    const [confirm, setConfirm] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (next !== confirm) {
                setStatus('error')
                setMessage('New passwords do not match.')
                return
        }
        setStatus('loading')
        setMessage(null)
        try {
                const res = await fetch('/api/account/password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ currentPassword: current, newPassword: next }),
                })
                const data = await res.json()
                if (res.ok) {
                          setStatus('success')
                          setMessage('Password updated successfully.')
                          setCurrent('')
                          setNext('')
                          setConfirm('')
                } else {
                          setStatus('error')
                          setMessage(data.error ?? 'Failed to update password.')
                }
        } catch {
                setStatus('error')
                setMessage('Network error. Please try again.')
        }
  }

  return (
        <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Change Password</h2>h2>
          {status === 'success' && (
                  <div className="mb-4 p-3 rounded-md border border-green-200 bg-green-50 text-sm text-green-800">
                    {message}
                  </div>div>
              )}
          {status === 'error' && (
                  <div className="mb-4 p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-800">
                    {message}
                  </div>div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                                <label htmlFor="current" className="block text-sm font-medium text-slate-700 mb-1">
                                            Current password
                                </label>label>
                                <input
                                              id="current"
                                              type="password"
                                              required
                                              value={current}
                                              onChange={e => setCurrent(e.target.value)}
                                              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                      </div>div>
                      <div>
                                <label htmlFor="next" className="block text-sm font-medium text-slate-700 mb-1">
                                            New password
                                </label>label>
                                <input
                                              id="next"
                                              type="password"
                                              required
                                              minLength={8}
                                              value={next}
                                              onChange={e => setNext(e.target.value)}
                                              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                      </div>div>
                      <div>
                                <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1">
                                            Confirm new password
                                </label>label>
                                <input
                                              id="confirm"
                                              type="password"
                                              required
                                              minLength={8}
                                              value={confirm}
                                              onChange={e => setConfirm(e.target.value)}
                                              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                      </div>div>
                      <button
                                  type="submit"
                                  disabled={status === 'loading'}
                                  className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                                >
                        {status === 'loading' ? 'Saving...' : 'Update password'}
                      </button>button>
              </form>form>
        </div>div>
      )
}</div>
