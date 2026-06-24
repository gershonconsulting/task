'use client'

import { useState, useEffect } from 'react'

type Priority = 'low' | 'medium' | 'high'

interface Tool {
  slug: string
  label: string
  icon: string
  color: string
  url?: string
}

interface TemplateTask {
  id: string
  name: string
  description?: string
  assignedTo: string | null
  priority?: Priority
  dueOffsetDays?: number
  tool?: string
}

interface ProcessTemplate {
  slug: string
  label: string
  icon: string
  color: string
  description: string
  tasks: TemplateTask[]
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high']

function priorityColor(p: Priority | undefined) {
  if (p === 'high') return 'text-red-600 bg-red-50'
  if (p === 'low') return 'text-slate-400 bg-slate-50'
  return 'text-amber-600 bg-amber-50'
}

function faviconUrl(url: string | undefined): string | null {
  if (!url || url.trim() === '') return null
  try {
    const domain = url.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=32'
  } catch {
    return null
  }
}

interface ToolIconProps {
  tool: Tool
  size?: number
}

function ToolIcon({ tool, size = 20 }: ToolIconProps) {
  const favicon = faviconUrl(tool.url)
  if (favicon) {
    return (
      <img
        src={favicon}
        alt={tool.label}
        width={size}
        height={size}
        className="rounded-sm object-contain"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return <span style={{ fontSize: size - 4 }}>{tool.icon || '🔧'}</span>
}

interface ToolsEditorProps {
  tools: Tool[]
  onChange: (tools: Tool[]) => void
}

function ToolsEditor({ tools, onChange }: ToolsEditorProps) {
  function updateTool(idx: number, patch: Partial<Tool>) {
    const next = [...tools]
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }
  function removeTool(idx: number) {
    onChange(tools.filter((_, i) => i !== idx))
  }
  function addTool() {
    onChange([...tools, { slug: 'new-tool-' + Date.now(), label: 'New Tool', icon: '🔧', color: '#6366f1', url: '' }])
  }

  return (
    <div className="space-y-2">
      {tools.map((tool, idx) => (
        <div key={tool.slug} className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
          <div className="w-8 h-8 flex items-center justify-center bg-white rounded border border-slate-200 shrink-0">
            <ToolIcon tool={tool} size={20} />
          </div>
          <input
            value={tool.label}
            onChange={e => updateTool(idx, { label: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })}
            className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-sm bg-white"
            placeholder="Tool name"
          />
          <input
            value={tool.url ?? ''}
            onChange={e => updateTool(idx, { url: e.target.value })}
            className="w-36 px-2 py-1.5 rounded border border-slate-200 text-xs bg-white text-slate-500"
            placeholder="website.com"
            title="Website domain for auto icon"
          />
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={tool.color}
              onChange={e => updateTool(idx, { color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-slate-200"
              title="Badge color"
            />
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tool.color }}
          >
            <ToolIcon tool={tool} size={14} />
            {tool.label}
          </span>
          <button
            type="button"
            onClick={() => removeTool(idx)}
            className="text-red-400 hover:text-red-600 text-xs font-bold px-1"
            title="Remove tool"
          >✕</button>
        </div>
      ))}
      <button
        type="button"
        onClick={addTool}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >+ Add tool</button>
    </div>
  )
}

export default function TemplatesEditor() {
  const [templates, setTemplates] = useState<ProcessTemplate[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [overrides, setOverrides] = useState<Record<string, { tasks?: TemplateTask[] }>>({})
  const [people, setPeople] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/templates').then(r => r.json()),
      fetch('/api/settings/team').then(r => r.json()),
    ]).then(([tplData, teamData]) => {
      setTemplates(tplData.templates)
      setOverrides(tplData.overrides ?? {})
      setTools(tplData.tools ?? [])
      const names = (teamData.members ?? []).map((m: { name: string }) => m.name).filter(Boolean)
      setPeople(names)
      setLoading(false)
    }).catch(() => {
      setError('Failed to load settings')
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
        body: JSON.stringify({ overrides, tools }),
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

  if (loading) return <div className="text-center py-12 text-slate-400">Loading…</div>

  const toolMap = Object.fromEntries(tools.map(t => [t.slug, t]))

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}

      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">Tools</h2>
        <p className="text-sm text-slate-500 mb-3">
          Define the tools your team uses. Enter the website domain to auto-load the app icon.
        </p>
        <ToolsEditor tools={tools} onChange={t => { setTools(t); setSaved(false) }} />
      </div>

      <hr className="border-slate-200" />

      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">Project Templates</h2>
        <p className="text-sm text-slate-500 mb-4">
          Edit default tasks, assignees, due-date offsets and tools for each template.
          "Client" can be selected as assignee for tasks the client performs themselves.
        </p>
        <div className="space-y-3">
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
                    {tasks.map((task, idx) => {
                      const taskTool = task.tool ? toolMap[task.tool] : null
                      return (
                        <div key={task.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-md">
                          <div className="flex flex-col gap-0.5 pt-1">
                            <button type="button" onClick={() => moveTask(tpl.slug, idx, -1)} disabled={idx === 0}
                              className="text-slate-300 hover:text-slate-600 disabled:opacity-20 text-xs leading-none" title="Move up">▲</button>
                            <button type="button" onClick={() => moveTask(tpl.slug, idx, 1)} disabled={idx === tasks.length - 1}
                              className="text-slate-300 hover:text-slate-600 disabled:opacity-20 text-xs leading-none" title="Move down">▼</button>
                          </div>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <input
                              value={task.name}
                              onChange={e => updateTask(tpl.slug, idx, { name: e.target.value })}
                              className="sm:col-span-2 px-2 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                              placeholder="Task name"
                            />
                            <select
                              value={task.assignedTo ?? ''}
                              onChange={e => updateTask(tpl.slug, idx, { assignedTo: e.target.value || null })}
                              className="px-2 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                            >
                              <option value="">Unassigned</option>
                              <option value="client">🧑 Client</option>
                              {people.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>

                            <select
                              value={task.tool ?? ''}
                              onChange={e => updateTask(tpl.slug, idx, { tool: e.target.value || undefined })}
                              className="px-2 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                            >
                              <option value="">No tool</option>
                              {tools.map(t => (
                                <option key={t.slug} value={t.slug}>{t.icon} {t.label}</option>
                              ))}
                            </select>

                            <div className="sm:col-span-2 flex gap-2 items-center">
                              <select
                                value={task.priority ?? 'medium'}
                                onChange={e => updateTask(tpl.slug, idx, { priority: e.target.value as Priority })}
                                className={'px-2 py-1.5 rounded border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-400 ' + priorityColor(task.priority)}
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
                              {taskTool && (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
                                  style={{ backgroundColor: taskTool.color }}
                                >
                                  <ToolIcon tool={taskTool} size={14} />
                                  {taskTool.label}
                                </span>
                              )}
                              <button type="button" onClick={() => removeTask(tpl.slug, idx)}
                                className="ml-auto text-red-400 hover:text-red-600 text-xs font-bold px-1" title="Remove task">✕</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    <div className="flex items-center gap-3 pt-1">
                      <button type="button" onClick={() => addTask(tpl.slug)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add task</button>
                      {isModified && (
                        <button type="button" onClick={() => resetTemplate(tpl.slug)}
                          className="text-xs text-slate-400 hover:text-slate-600">↺ Reset to default</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

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
