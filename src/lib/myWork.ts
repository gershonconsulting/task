import { supabaseAdmin } from './supabaseServer'
import { isAssignedTo, loadTeam, type TeamMember } from './team'

export interface WorkTask {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: string | null
  dueDate: string | null
  assignedTo: string | null
  projectId: string
  client: string
  projectLabel: string
  daysLate: number
  updatedAt: string
}

export interface MemberLoad {
  member: TeamMember
  open: number
  overdue: number
  dueThisWeek: number
  doneLast7: number
}

export interface MyWork {
  today: string
  weekEnd: string
  overdue: WorkTask[]
  dueToday: WorkTask[]
  thisWeek: WorkTask[]
  later: WorkTask[]
  noDate: WorkTask[]
  doneLast7: WorkTask[]
  team: MemberLoad[]
  unassignedOverdue: number
  /** Whole-team numbers for the dashboard. */
  totals: { open: number; late: number; dueNext7: number; doneLast7: number; unassigned: number }
  /** Tasks marked done per week, oldest first (last 8 weeks, weeks start Monday). */
  weekly: { weekStart: string; done: number }[]
}

/** Today in New York as YYYY-MM-DD. */
export function etToday(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 86400000)
}

/** "Flying Secoya - Social Content Creation onboarding" → "Flying Secoya" */
export function cleanClient(name: string | null | undefined): string {
  return String(name ?? '').split(/\s[-–—|]\s/)[0].trim() || 'No client'
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }
function byDueThenPriority(a: WorkTask, b: WorkTask) {
  const d = (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
  if (d) return d
  return (PRIORITY_RANK[a.priority ?? 'medium'] ?? 1) - (PRIORITY_RANK[b.priority ?? 'medium'] ?? 1)
}

type Row = {
  id: string; name: string; status: WorkTask['status']; priority: string | null; due_date: string | null
  assigned_to: string | null; project_id: string; updated_at: string
}

/** Everything the dashboard needs for one person, plus the team load table. */
export async function loadMyWork(who: { id?: string; name: string; email: string }): Promise<MyWork> {
  const supa = supabaseAdmin()
  const [{ data: tasks }, { data: projects }, team] = await Promise.all([
    supa.from('tasks').select('id, name, status, priority, due_date, assigned_to, project_id, updated_at'),
    supa.from('projects').select('id, company_name, status').neq('status', 'archived'),
    loadTeam(),
  ])
  const proj = new Map((projects ?? []).map((p: { id: string; company_name: string }) => [p.id, p]))
  const today = etToday()
  const weekEnd = addDays(today, 7)
  const weekAgo = addDays(today, -7)

  const all: WorkTask[] = ((tasks ?? []) as Row[])
    .filter(t => proj.has(t.project_id))
    .map(t => {
      const p = proj.get(t.project_id)!
      return {
        id: t.id, name: t.name, status: t.status, priority: t.priority, dueDate: t.due_date,
        assignedTo: t.assigned_to, projectId: t.project_id,
        client: cleanClient(p.company_name), projectLabel: p.company_name,
        daysLate: t.due_date && t.status !== 'completed' ? Math.max(0, daysBetween(t.due_date, today)) : 0,
        updatedAt: t.updated_at,
      }
    })

  const me = team.find(m => m.id === who.id) ?? team.find(m => m.email === who.email) ?? { name: who.name, email: who.email }
  const mine = all.filter(t => isAssignedTo(me, t.assignedTo))
  const open = mine.filter(t => t.status !== 'completed')

  const overdue = open.filter(t => t.dueDate && t.dueDate < today).sort(byDueThenPriority)
  const dueToday = open.filter(t => t.dueDate === today).sort(byDueThenPriority)
  const thisWeek = open.filter(t => t.dueDate && t.dueDate > today && t.dueDate <= weekEnd).sort(byDueThenPriority)
  const later = open.filter(t => t.dueDate && t.dueDate > weekEnd).sort(byDueThenPriority)
  const noDate = open.filter(t => !t.dueDate).sort(byDueThenPriority)
  const doneLast7 = mine.filter(t => t.status === 'completed' && t.updatedAt.slice(0, 10) >= weekAgo)

  const teamLoad: MemberLoad[] = team.map(m => {
    const ts = all.filter(t => isAssignedTo(m, t.assignedTo))
    const o = ts.filter(t => t.status !== 'completed')
    return {
      member: m,
      open: o.length,
      overdue: o.filter(t => t.dueDate && t.dueDate < today).length,
      dueThisWeek: o.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd).length,
      doneLast7: ts.filter(t => t.status === 'completed' && t.updatedAt.slice(0, 10) >= weekAgo).length,
    }
  })
  const unassignedOverdue = all.filter(t => !t.assignedTo && t.status !== 'completed' && t.dueDate && t.dueDate < today).length

  const openAll = all.filter(t => t.status !== 'completed')
  const totals = {
    open: openAll.length,
    late: openAll.filter(t => t.dueDate && t.dueDate < today).length,
    dueNext7: openAll.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd).length,
    doneLast7: all.filter(t => t.status === 'completed' && t.updatedAt.slice(0, 10) >= weekAgo).length,
    unassigned: openAll.filter(t => !t.assignedTo).length,
  }
  const dow = (new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7
  const thisMonday = addDays(today, -dow)
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(thisMonday, -7 * (7 - i)), end = addDays(start, 7)
    return { weekStart: start, done: all.filter(t => t.status === 'completed' && t.updatedAt.slice(0, 10) >= start && t.updatedAt.slice(0, 10) < end).length }
  })

  return { today, weekEnd, overdue, dueToday, thisWeek, later, noDate, doneLast7, team: teamLoad, unassignedOverdue, totals, weekly }
}
