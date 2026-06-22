'use client'

import { useState, useEffect } from 'react'

type Priority = 'low' | 'medium' | 'high'

interface TemplateTask {
  id: string
  name: string
  description?: string
  assignedTo: string | null
  priority?: Priority
  dueOffsetDays?: number
}

interface ProcessTemplate {
  slug: string
  label: string
  icon: string
  color: string
  description: string
  tasks: TemplateTask[]
}

const PEOPLE = ['Olivier', 'Winnie Lauren', 'Aina Rama', 'Sai', null]
const PRIORITIES: Priority[] = ['low', 'medium', 'high']

function priorityColor(p: Priority | undefined) {
  if (p === 'high') return 'text-red-600 bg-red-50'
  if (p === 'low') return 'text-slate-400 bg-slate-50'
  return 'text-amber-600 bg-amber-50'
}

export default function TemplatesEditor() {
  const [templates, setTemplates] = useState<ProcessTemplate[]>([])
  const [overrides, setOverrides] = useState<Record<string, { tasks?: TemplateTask[] }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/templates')
      .then(r => r.json())
      .then(data => {
        setTemplates(data.templates)
        setOverrides(data.overrides ?? {})
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load templates')
        setLoading(false)
      })
  }, [])

  function getEffectiveTasks(slug: string, baseTasks: TemplateTask[]): TemplateTask[] {
    return overrides[slug]?.tasks ?? baseTasks
  }

  function updateTasks(slug: string, tasks: TemplateTask[]) {
    setOverrides(prev => ({ ...prev, [slug]: { ...prev[slug], tasks } }))
    setSaved(false)
  }

  function updateTask(slug: string, idx: number, patch: Partial<TemplateTask>) {
    const base = templates.find(t => t.slug === slug)!.tasks
    const tasks = [...getEffectiveTasks(slug, base)]
    tasks[idx] = { ...tasks[idx], ...patch }
    updateTasks(slug, tasks)
  }

  function addTask(slug: string) {
    const base = templates.find(t => t.slug === slug)!.tasks
    const tasks = [...getEffectiveTasks(slug, base)]
    const newId = slug.substring(0, 3) + '-' + Date.now()
    tasks.push({ id: newId, name: 'New task', assignedTo: null, priority: 'medium' })
    updateTasks(slug, tasks)
  }

  function removeTask(slug: string, idx: number) {
    const base = templates.find(t => t.slug === slug)!.tasks
    const tasks = [...getEffectiveTasks(slug, base)]
    tasks.splice(idx, 1)
    updateTasks(slug, tasks)
  }

  function moveTask(slug: string, idx: number, dir: -1 | 1) {
    const base = templates.find(t => t.slug === slug)!.tasks
    const tasks = [...getEffectiveTasks(slug, base)]
    const to = idx + dir
    if (to < 0 || to >= tasks.length) return
    ;[tasks[idx], tasks[to]] = [tasks[to], tasks[idx]]
    updateTasks(slug, tasks)
  }

  function resetTemplate(slug: string) {
    setOverrides(prev => {
      const next = { ...prev }
      delete next[slug]
      return next
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
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

  if (loading) return <div className="text-center py-12 text-slate-400">Loading templates…</div>

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}

      {templates.map(tpl => {
        const isOpen = openSlug === tpl.slug
        const tasks = getEffectiveTasks(tpl.slug, tpl.tasks)
        const isModified = !!overrides[tpl.slug]

        return (
          <div key={tpl.slug} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSlug(isOpen ? null : tpl.slug)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tpl.icon}</span>
                <div className="text-left">
                  <div className="font-semibold text-slate-900 text-sm">
                    {tpl.label}
                    {isModified && <span className="ml-2 text-xs text-indigo-500 font-normal">(modified)</span>}
                  </div>
                  <div className="text-xs text-slate-400">{tasks.length} tasks</div>
                </div>
              </div>
              <span className="text-slate-400 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                {tasks.map((task, idx) => (
                  <div key={task.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-md">
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button
                        type="button"
                        onClick={() => moveTask(tpl.slug, idx, -1)}
                        disabled={idx === 0}
                        className="text-slate-300 hover:text-slate-600 disabled:opacity-20 text-xs leading-none"
                        title="Move up"
                      >▲</button>
                      <button
                        type="button"
                        onClick={() => moveTask(tpl.slug, idx, 1)}
                        disabled={idx === tasks.length - 1}
                        className="text-slate-300 hover:text-slate-600 disabled:opacity-20 text-xs leading-none"
                        title="Move down"
                      >▼</button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        value={task.name}
                        onChange={e => updateTask(tpl.slug, idx, { name: e.target.value })}
                        className="col-span-1 sm:col-span-1 px-2 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                        placeholder="Task name"
                      />
                      <select
                        value={task.assignedTo ?? ''}
                        onChange={e => updateTask(tpl.slug, idx, { assignedTo: e.target.value || null })}
                        className="px-2 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                      >
                        <option value="">Unassigned</option>
                        {PEOPLE.filter(Boolean).map(p => (
                          <option key={p!} value={p!}>{p}</option>
                        ))}
                      </select>
                      <div className="flex gap-2 items-center">
                        <select
                          value={task.priority ?? 'medium'}
                          onChange={e => updateTask(tpl.slug, idx, { priority: e.target.value as Priority })}
                          className={`px-2 py-1.5 rounded border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-400 ${priorityColor(task.priority)}`}
                        >
                          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input
                          type="number"
                          value={task.dueOffsetDays ?? ''}
                          onChange={e => updateTask(tpl.slug, idx, { dueOffsetDays: e.target.value === '' ? undefined : Number(e.target.value) })}
                          className="w-16 px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:border-indigo-400 bg-white"
                          placeholder="+days"
                          title="Due offset in days from project start"
                        />
                        <button
                          type="button"
                          onClick={() => removeTask(tpl.slug, idx)}
                          className="text-red-400 hover:text-red-600 text-xs font-bold px-1"
                          title="Remove task"
                        >✕</button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => addTask(tpl.slug)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >+ Add task</button>
                  {isModified && (
                    <button
                      type="button"
                      onClick={() => resetTemplate(tpl.slug)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >↺ Reset to default</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
      </div>
    </div>
  )
      }
