'use client'
import { useState } from 'react'

interface Task { id: string; name: string; status: string; priority: string; due_date: string | null; assigned_to: string | null }
interface Props {
  user: { name: string; email: string; mustChangePassword?: boolean }
  project: { id: string; company_name: string; status: string } | null
  tasks: Task[]
  template?: { label: string; icon: string; color: string }
}

const STATUS_LABEL: Record<string, string> = { pending: 'Pending', in_progress: 'In progress', completed: 'Done' }
const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
}
const PRIORITY_DOT: Record<string, string> = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-slate-300' }

export default function ClientPortal({ user, project, tasks, template }: Props) {
  const [showPwForm, setShowPwForm] = useState(!!user.mustChangePassword)
  const [newPw, setNewPw] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaved, setPwSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const done = tasks.filter(t => t.status === 'completed').length
  const total = tasks.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const accent = template?.color ?? '#6366f1'

  async function handlePwSave(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: newPw }) })
      if (res.ok) { setPwSaved(true); setShowPwForm(false); setNewPw('') }
      else { const d = await res.json(); setPwError(d.error ?? 'Failed to save') }
    } catch { setPwError('Network error') } finally { setSaving(false) }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-0.5">GershonCRM</div>
          <h1 className="text-xl font-bold">{project?.company_name ?? 'My Project'}</h1>
          {template && <p className="text-blue-200 text-sm">{template.icon} {template.label}</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold">{user.name || user.email}</div>
            <div className="text-xs text-blue-200">{user.email}</div>
          </div>
          <button onClick={handleLogout} className="text-xs text-blue-200 hover:text-white border border-blue-400 px-3 py-1.5 rounded-md transition">Log out</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {user.mustChangePassword && !pwSaved && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-semibold mb-1">🔒 Please set a new password</p>
            <p className="text-xs text-amber-700 mb-2">You are using a temporary password. Please choose a permanent one.</p>
            {!showPwForm && <button onClick={() => setShowPwForm(true)} className="text-xs text-amber-700 underline">Change password now</button>}
          </div>
        )}

        {showPwForm && (
          <form onSubmit={handlePwSave} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Set new password</h2>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 6 characters)" className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm mb-3 focus:outline-none focus:border-indigo-500" minLength={6} />
            {pwError && <p className="text-xs text-red-600 mb-2">{pwError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold disabled:bg-slate-300">{saving ? 'Saving...' : 'Save password'}</button>
              {!user.mustChangePassword && <button type="button" onClick={() => setShowPwForm(false)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>}
            </div>
          </form>
        )}

        {pwSaved && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">✓ Password updated.</div>}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">Project progress</h2>
            <span className="text-2xl font-light" style={{ color: accent }}>{pct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-2">
            <div className="h-3 rounded-full transition-all" style={{ width: pct + '%', backgroundColor: accent }} />
          </div>
          <p className="text-xs text-slate-500">{done} of {total} tasks completed</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Tasks</h2></div>
          {tasks.length === 0 ? <p className="text-center py-8 text-slate-400 text-sm">No tasks yet.</p> : (
            <div className="divide-y divide-slate-50">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={'inline-block w-2 h-2 rounded-full shrink-0 ' + (PRIORITY_DOT[t.priority] ?? 'bg-slate-300')} />
                  <span className="flex-1 text-sm text-slate-800 truncate min-w-0">{t.name}</span>
                  {t.assigned_to && <span className="text-xs text-slate-400 shrink-0 hidden sm:block">{t.assigned_to.split(' ')[0]}</span>}
                  {t.due_date && <span className="text-xs text-slate-400 shrink-0 hidden md:block">{new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  <span className={'text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ' + (STATUS_STYLE[t.status] ?? STATUS_STYLE.pending)}>{STATUS_LABEL[t.status] ?? t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-center"><button onClick={() => setShowPwForm(true)} className="text-xs text-slate-400 hover:text-slate-600">Change password</button></div>
      </main>
    </div>
  )
}
