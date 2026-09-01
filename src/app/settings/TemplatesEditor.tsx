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

type ProjectType = 'simple' | 'advanced' | 'complex'

interface ProcessTemplate {
  slug: string
  label: string
  icon: string
  color: string
  description: string
  category?: string
  projectType?: ProjectType
  tasks: TemplateTask[]
}

const PROJECT_TYPES: ProjectType[] = ['simple', 'advanced', 'complex']

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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

interface NewTemplateFormProps {
  categories: string[]
  onCreate: (tpl: ProcessTemplate) => void
}

function NewTemplateForm({ categories, onCreate }: NewTemplateFormProps) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('📁')
  const [color, setColor] = useState('#6366f1')
  const [category, setCategory] = useState('Custom')
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('advanced')

  function reset() {
    setLabel(''); setIcon('📁'); setColor('#6366f1')
    setCategory('Custom'); setDescription(''); setProjectType('advanced')
  }

  function submit() {
    const name = label.trim()
    if (!name) return
    const base = slugify(name) || 'template'
    onCreate({
      slug: base,
      label: name,
      icon: icon || '📁',
      color,
      description: description.trim(),
      category: category.trim() || 'Custom',
      projectType,
      tasks: [{ id: base.substring(0, 3) + '-1', name: 'First task', assignedTo: null, priority: 'medium' }],
    })
    reset()
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-lg border-2 border-dashed border-slate-300 text-sm font-semibold text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition"
      >+ New template</button>
    )
  }

  return (
    <div className="bg-white rounded-lg border-2 border-indigo-300 shadow-sm p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">New template</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          autoFocus
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
          className="sm:col-span-2 px-3 py-2 rounded border border-slate-300 text-sm bg-white"
          placeholder="Template name (e.g. Quarterly Review)"
        />
        <input
          value={icon}
          onChange={e => setIcon(e.target.value)}
          className="px-3 py-2 rounded border border-slate-300 text-sm bg-white text-center"
          placeholder="📁"
          title="Emoji icon"
          maxLength={4}
        />
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-10 h-9 rounded cursor-pointer border border-slate-200"
            title="Accent colour"
          />
          <select
            value={projectType}
            onChange={e => setProjectType(e.target.value as ProjectType)}
            className="flex-1 px-2 py-2 rounded border border-slate-300 text-xs bg-white capitalize"
            title="Project type"
          >
            {PROJECT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <input
          value={category}
          onChange={e => setCategory(e.target.value)}
          list="template-categories"
          className="px-3 py-2 rounded border border-slate-300 text-sm bg-white"
          placeholder="Category"
        />
        <datalist id="template-categories">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="sm:col-span-3 px-3 py-2 rounded border border-slate-300 text-sm bg-white"
          placeholder="Short description (optional)"
        />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={submit} disabled={!label.trim()}
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold">
          Create template
        </button>
        <button type="button" onClick={() => { reset(); setOpen(false) }}
          className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
        <span className="text-xs text-slate-400">It starts with one task — add the rest below, then Save changes.</span>
      </div>
    </div>
  )
}

export default function TemplatesEditor() {
  const [templates, setTemplates] = useState<ProcessTemplate[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [overrides, setOverrides] = useState<Record<string, { tasks?: TemplateTask[] }>>({})
  const [customTemplates, setCustomTemplates] = useState<ProcessTemplate[]>([])
  const [people, setPeople] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/templates').then(r => r.json()),
      fetch('/api/settings/team').then(r => r.json()),
    ]).then(([tplData, teamData]) => {
      setTemplates(tplData.templates)
      setOverrides(tplData.overrides ?? {})
      setCustomTemplates(tplData.customTemplates ?? [])
      setTools(tplData.tools ?? [])
      const names = (teamData.members ?? []).map((m: { name: string }) => m.name).filter(Boolean)
      setPeople(names)
      setLoading(false)
    }).catch(() => {
      setError('Failed to load settings')
      setLoading(false)
    })
  }, [])

  const customSlugs = new Set(customTemplates.map(t => t.slug))

  function isCustom(slug: string) { return customSlugs.has(slug) }

  function getEffectiveTasks(slug: string, baseTasks: TemplateTask[]): TemplateTask[] {
    if (isCustom(slug)) return customTemplates.find(t => t.slug === slug)?.tasks ?? baseTasks
    return overrides[slug]?.tasks ?? baseTasks
  }

  function updateTasks(slug: string, tasks: TemplateTask[]) {
    if (isCustom(slug)) {
      setCustomTemplates(prev => prev.map(t => t.slug === slug ? { ...t, tasks } : t))
    } else {
      setOverrides(prev => ({ ...prev, [slug]: { ...prev[slug], tasks } }))
    }
    setSaved(false)
  }

  function createTemplate(tpl: ProcessTemplate) {
    // guarantee a unique slug
    let slug = tpl.slug
    let n = 2
    while (templates.some(t => t.slug === slug)) { slug = tpl.slug + '-' + n; n++ }
    const created = { ...tpl, slug }
    setCustomTemplates(prev => [...prev, created])
    setTemplates(prev => [...prev, created])
    setOpenSlug(slug)
    setSaved(false)
  }

  function deleteTemplate(slug: string) {
    if (!isCustom(slug)) return
    if (!confirm('Delete this template? Projects already created from it keep their tasks.')) return
    setCustomTemplates(prev => prev.filter(t => t.slug !== slug))
    setTemplates(prev => prev.filter(t => t.slug !== slug))
    if (openSlug === slug) setOpenSlug(null)
    setSaved(false)
  }

  function updateMeta(slug: string, patch: Partial<ProcessTemplate>) {
    setCustomTemplates(prev => prev.map(t => t.slug === slug ? { ...t, ...patch } : t))
    setTemplates(prev => prev.map(t => t.slug === slug ? { ...t, ...patch } : t))
    setSaved(false)
  }

  function reorder(from: number, to: number) {
    if (from === to) return
    setTemplates(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
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
        body: JSON.stringify({
          overrides,
          tools,
          customTemplates,
          order: templates.map(t => t.slug),
        }),
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
          Drag the <span className="font-mono">⠿</span> handle to reorder — this order is used here and in the new-project picker.
        </p>
        <div className="space-y-3">
          {templates.map((tpl, tIdx) => {
            const isOpen = openSlug === tpl.slug
            const tasks = getEffectiveTasks(tpl.slug, tpl.tasks)
            const custom = isCustom(tpl.slug)
            const isModified = !custom && !!overrides[tpl.slug]
            const isDragTarget = overIdx === tIdx && dragIdx !== null && dragIdx !== tIdx

            return (
              <div
                key={tpl.slug}
                onDragOver={e => { e.preventDefault(); setOverIdx(tIdx) }}
                onDrop={e => {
                  e.preventDefault()
                  if (dragIdx !== null) reorder(dragIdx, tIdx)
                  setDragIdx(null); setOverIdx(null)
                }}
                className={'bg-white rounded-lg border shadow-sm overflow-hidden transition '
                  + (isDragTarget ? 'border-indigo-400 ring-2 ring-indigo-200 ' : 'border-slate-200 ')
                  + (dragIdx === tIdx ? 'opacity-50' : '')}
              >
                <div className="w-full flex items-center gap-2 px-3 py-4 hover:bg-slate-50 transition">
                  <span
                    draggable
                    onDragStart={() => setDragIdx(tIdx)}
                    onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                    className="cursor-grab active:cursor-grabbing select-none px-1 text-slate-300 hover:text-slate-500 text-lg leading-none"
                    title="Drag to reorder"
                  >⠿</span>

                  <button
                    type="button"
                    onClick={() => setOpenSlug(isOpen ? null : tpl.slug)}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{tpl.icon}</span>
                      <div className="text-left">
                        <div className="font-semibold text-slate-900 text-sm">
                          {tpl.label}
                          {custom && <span className="ml-2 text-[10px] uppercase tracking-wider font-bold text-indigo-500">custom</span>}
                          {isModified && <span className="ml-2 text-xs text-indigo-500 font-normal">(modified)</span>}
                        </div>
                        <div className="text-xs text-slate-400">
                          {tasks.length} tasks{tpl.category ? ' · ' + tpl.category : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-slate-400 text-xs pr-2">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {custom && (
                    <button type="button" onClick={() => deleteTemplate(tpl.slug)}
                      className="text-red-400 hover:text-red-600 text-xs font-bold px-2" title="Delete template">✕</button>
                  )}
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                    {custom && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pb-2 border-b border-slate-100">
                        <input
                          value={tpl.label}
                          onChange={e => updateMeta(tpl.slug, { label: e.target.value })}
                          className="sm:col-span-2 px-2 py-1.5 rounded border border-slate-200 text-sm bg-white"
                          placeholder="Template name"
                        />
                        <input
                          value={tpl.icon}
                          onChange={e => updateMeta(tpl.slug, { icon: e.target.value })}
                          className="px-2 py-1.5 rounded border border-slate-200 text-sm bg-white text-center"
                          maxLength={4}
                          title="Emoji icon"
                        />
                        <input
                          value={tpl.category ?? ''}
                          onChange={e => updateMeta(tpl.slug, { category: e.target.value })}
                          className="px-2 py-1.5 rounded border border-slate-200 text-sm bg-white"
                          placeholder="Category"
                        />
                        <input
                          value={tpl.description ?? ''}
                          onChange={e => updateMeta(tpl.slug, { description: e.target.value })}
                          className="sm:col-span-3 px-2 py-1.5 rounded border border-slate-200 text-sm bg-white"
                          placeholder="Description"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={tpl.color}
                            onChange={e => updateMeta(tpl.slug, { color: e.target.value })}
                            className="w-9 h-8 rounded cursor-pointer border border-slate-200"
                            title="Accent colour"
                          />
                          <select
                            value={tpl.projectType ?? 'advanced'}
                            onChange={e => updateMeta(tpl.slug, { projectType: e.target.value as ProjectType })}
                            className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-xs bg-white capitalize"
                            >
                            {PROJECT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
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
                      {isModified && !custom && (
                        <button type="button" onClick={() => resetTemplate(tpl.slug)}
                          className="text-xs text-slate-400 hover:text-slate-600">↺ Reset to default</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <NewTemplateForm
            categories={Array.from(new Set(templates.map(t => t.category).filter(Boolean) as string[]))}
            onCreate={createTemplate}
          />
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
