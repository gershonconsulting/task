import Link from 'next/link'
import { updateTaskStatusGlobal } from '@/lib/actions'
import type { WorkTask } from '@/lib/myWork'

function dueLabel(t: WorkTask, today: string): { text: string; cls: string } {
  if (!t.dueDate) return { text: 'no date', cls: 'text-[#6e6e73]' }
  if (t.daysLate > 0) return { text: t.daysLate === 1 ? '1 day late' : `${t.daysLate} days late`, cls: 'text-brand-600 font-semibold' }
  if (t.dueDate === today) return { text: 'today', cls: 'text-amber-700 font-semibold' }
  const d = new Date(t.dueDate + 'T12:00:00Z')
  return { text: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }), cls: 'text-[#6e6e73]' }
}

/** One line per task: big ✓ to mark it done, the task, its client, and how late it is. */
export default function MyTaskList({ tasks, today, empty, limit }: { tasks: WorkTask[]; today: string; empty: string; limit?: number }) {
  if (!tasks.length) return <p className="text-sm text-[#6e6e73] py-2">{empty}</p>
  const shown = limit ? tasks.slice(0, limit) : tasks
  return (
    <ul className="divide-y divide-[#f0f0f2]">
      {shown.map(t => {
        const due = dueLabel(t, today)
        return (
          <li key={t.id} className="flex items-center gap-3 py-2.5">
            <form action={updateTaskStatusGlobal} className="shrink-0">
              <input type="hidden" name="taskId" value={t.id} />
              <input type="hidden" name="projectId" value={t.projectId} />
              <input type="hidden" name="status" value="completed" />
              <button title="Mark as done" aria-label={`Mark "${t.name}" as done`}
                className="w-6 h-6 rounded-full border-2 border-[#d1d5db] hover:border-green-600 hover:bg-green-50 text-transparent hover:text-green-600 flex items-center justify-center transition-colors">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              </button>
            </form>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium truncate">
                {t.status === 'in_progress' && <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 align-middle">in progress</span>}
                {t.priority === 'high' && <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 bg-brand-50 border border-brand-100 rounded px-1.5 py-0.5 align-middle">high</span>}
                {t.name}
              </div>
              <Link href={`/projects/${t.projectId}`} className="text-[12px] text-[#6e6e73] hover:text-brand-600 truncate block">
                {t.projectLabel}
              </Link>
            </div>
            <span className={`text-[12px] shrink-0 text-right ${due.cls}`}>{due.text}</span>
          </li>
        )
      })}
      {limit && tasks.length > limit && (
        <li className="pt-2.5 text-[12px] text-[#6e6e73]">+ {tasks.length - limit} more — <Link href="/tasks" className="text-brand-600 hover:underline">see all tasks</Link></li>
      )}
    </ul>
  )
}
