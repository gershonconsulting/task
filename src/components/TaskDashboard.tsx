'use client'
import { useState } from 'react'
import pkg from '../../package.json'

type Priority = 'low' | 'medium' | 'high'
type Status = 'todo' | 'inprogress' | 'done'
interface Task { id: string; title: string; assignee: string; priority: Priority; status: Status }

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-green-900 text-green-300',
  medium: 'bg-yellow-900 text-yellow-300',
  high: 'bg-red-900 text-red-300',
}

export default function TaskDashboard({ user }: { user: { name: string; picture?: string } }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  const addTask = () => {
    if (!title.trim()) return
    setTasks(t => [...t, { id: Date.now().toString(), title, assignee, priority, status: 'todo' }])
    setTitle(''); setAssignee('')
  }

  const move = (id: string, status: Status) => setTasks(t => t.map(x => x.id === id ? { ...x, status } : x))
  const remove = (id: string) => setTasks(t => t.filter(x => x.id !== id))

  const cols: { key: Status; label: string }[] = [
    { key: 'todo', label: 'To Do' },
    { key: 'inprogress', label: 'In Progress' },
    { key: 'done', label: 'Done' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-white">GershonCRM — Tasks</h1>
        <span className="inline-block bg-white text-indigo-700 font-bold text-xs px-2.5 py-1 rounded-full shadow tracking-wide">v{pkg.version}</span>>
        </div>
        <div className="flex items-center gap-3">
          {user.picture && <img src={user.picture} className="w-8 h-8 rounded-full" />}
          <span className="text-gray-300 text-sm">{user.name}</span>
          <a href="/api/auth/logout" className="text-gray-500 hover:text-white text-sm">Sign out</a>
        </div>
      </header>
      <div className="p-6">
        <div className="bg-gray-900 rounded-lg p-4 mb-6 flex gap-3 flex-wrap">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" className="flex-1 min-w-48 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-blue-500" />
          <input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Assignee" className="w-40 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-blue-500" />
          <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button onClick={addTask} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition">Add Task</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {cols.map(col => (
            <div key={col.key} className="bg-gray-900 rounded-lg p-4">
              <h2 className="font-semibold text-gray-300 mb-3">{col.label} <span className="text-gray-500 text-sm">({tasks.filter(t => t.status === col.key).length})</span></h2>
              <div className="space-y-2">
                {tasks.filter(t => t.status === col.key).map(task => (
                  <div key={task.id} className="bg-gray-800 rounded p-3">
                    <p className="text-white text-sm font-medium mb-2">{task.title}</p>
                    {task.assignee && <p className="text-gray-400 text-xs mb-2">→ {task.assignee}</p>}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                      <div className="flex gap-1">
                        {col.key !== 'todo' && <button onClick={() => move(task.id, col.key === 'inprogress' ? 'todo' : 'inprogress')} className="text-gray-500 hover:text-white text-xs">←</button>}
                        {col.key !== 'done' && <button onClick={() => move(task.id, col.key === 'todo' ? 'inprogress' : 'done')} className="text-gray-500 hover:text-white text-xs">→</button>}
                        <button onClick={() => remove(task.id)} className="text-red-700 hover:text-red-400 text-xs ml-1">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
