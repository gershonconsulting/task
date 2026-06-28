'use client'
import { updateTaskStatusGlobal } from '@/lib/actions'

const STYLE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
}

export default function StatusSelect({ taskId, projectId, status }: { taskId: string; projectId: string; status: string }) {
  const st = ['pending', 'in_progress', 'completed'].includes(status) ? status : 'pending'
  return (
    <form action={updateTaskStatusGlobal} className='shrink-0'>
      <input type='hidden' name='taskId' value={taskId} />
      <input type='hidden' name='projectId' value={projectId} />
      <select
        name='status'
        defaultValue={st}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`text-xs px-2 py-1 rounded-full border font-medium cursor-pointer transition ${STYLE[st] ?? STYLE.pending}`}
      >
        <option value='pending'>Pending</option>
        <option value='in_progress'>In progress</option>
        <option value='completed'>Done</option>
      </select>
    </form>
  )
}
