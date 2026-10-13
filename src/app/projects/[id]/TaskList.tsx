'use client';

import { useState } from 'react';
import type { TaskRow } from '@/lib/supabaseServer';
import {
  updateTaskStatus, updateTaskNotes, updateTaskAssignee,
  updateTaskPriority, updateTaskDueDate, updateTaskTool, deleteTask,
} from './actions';

interface ToolDef {
  slug: string
  label: string
  icon: string
  color: string
  url?: string
}

interface Props {
  projectId: string;
  tasks: TaskRow[];
  canEditMeta: boolean;
  canDelete: boolean;
  tools?: ToolDef[];
  team?: string[];
}

function faviconUrl(url: string | undefined): string | null {
  if (!url || url.trim() === '') return null
  const domain = url.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=32'
}

function ToolBadge({ tool }: { tool: ToolDef }) {
  const favicon = faviconUrl(tool.url)
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: tool.color }}>
      {favicon ? (
        <img src={favicon} alt="" width={12} height={12} className="rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      ) : (
        <span>{tool.icon}</span>
      )}
      {tool.label}
    </span>
  )
}

const STATUS_STYLES: Record<TaskRow['status'], string> = {
  pending: 'bg-white border-[#e5e7eb] border-l-slate-300',
  in_progress: 'bg-white border-[#e5e7eb] border-l-amber-500',
  completed: 'bg-[#fafafa] border-[#eef0f2] border-l-green-500 opacity-80',
};

function etToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function dueText(due: string | null, done: boolean, today: string): { text: string; cls: string } | null {
  if (!due) return null;
  const nice = new Date(due + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (done) return { text: nice, cls: 'text-slate-400' };
  const days = Math.round((new Date(today + 'T12:00:00Z').getTime() - new Date(due + 'T12:00:00Z').getTime()) / 86400000);
  if (days > 0) return { text: `${days} day${days === 1 ? '' : 's'} late · ${nice}`, cls: 'text-brand-600 font-semibold' };
  if (days === 0) return { text: 'Due today', cls: 'text-amber-700 font-semibold' };
  return { text: 'Due ' + nice, cls: 'text-slate-500' };
}
const PRIORITY_DOT: Record<TaskRow['priority'], string> = {
  low: 'bg-slate-400',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
};

export default function TaskList({ projectId, tasks, canEditMeta, canDelete, tools = [], team = [] }: Props) {
  if (tasks.length === 0) {
    return <p className="text-sm text-slate-500 italic">No tasks in this project.</p>;
  }
  const today = etToday();
  const open = tasks.filter(t => t.status !== 'completed')
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || a.position - b.position);
  const done = tasks.filter(t => t.status === 'completed');
  const late = open.filter(t => t.due_date && t.due_date < today).length;
  const item = (t: TaskRow) => (
    <TaskItem key={t.id} t={t} projectId={projectId} canEditMeta={canEditMeta} canDelete={canDelete} tools={tools} team={team} today={today} />
  );
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[15px] font-bold">To do <span className="text-[#6e6e73] font-medium">({open.length})</span></h2>
        <span className="text-[12px] text-[#6e6e73]">{late > 0 ? <span className="text-brand-600 font-semibold">{late} late · </span> : null}most urgent first · change the status on the left</span>
      </div>
      {open.length === 0
        ? <p className="text-sm text-[#057642] bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">Everything in this project is done. ✓</p>
        : <ul className="space-y-2">{open.map(item)}</ul>}
      {done.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[13px] font-semibold text-[#6e6e73] hover:text-brand-600">Done ({done.length})</summary>
          <ul className="space-y-2 mt-3">{done.map(item)}</ul>
        </details>
      )}
    </section>
  );
}

function TaskItem({
  t, projectId, canEditMeta, canDelete, tools, team, today,
}: { t: TaskRow; projectId: string; canEditMeta: boolean; canDelete: boolean; tools: ToolDef[]; team: string[]; today: string }) {
  const due = dueText(t.due_date, t.status === 'completed', today);
  const isLate = t.status !== 'completed' && !!t.due_date && t.due_date < today;
  const [expanded, setExpanded] = useState(false);
  const toolMap = Object.fromEntries(tools.map(t => [t.slug, t]));
  const taskTool = (t as any).tool ? toolMap[(t as any).tool] : null;

  return (
    <li className={'rounded-xl border border-l-4 ' + (isLate ? 'bg-white border-[#e5e7eb] border-l-brand-600' : STATUS_STYLES[t.status]) + ' p-3'}>
      <div className="flex items-start gap-3">
        <form action={updateTaskStatus} className="flex-shrink-0">
          <input type="hidden" name="taskId" value={t.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <select
            name="status"
            defaultValue={t.status}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="text-xs font-semibold rounded-lg border border-[#e5e7eb] px-2 py-1.5 bg-white"
          >
            <option value="pending">To do</option>
            <option value="in_progress">In progress</option>
            <option value="completed">✓ Done</option>
          </select>
        </form>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={'inline-block w-2 h-2 rounded-full ' + PRIORITY_DOT[t.priority]} />
            <span className={'font-medium text-sm ' + (t.status === 'completed' ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900')}>{t.name}</span>
            {taskTool && <ToolBadge tool={taskTool} />}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
            <span>👤 {t.assigned_to ?? <em className="italic text-brand-600 not-italic font-semibold">nobody assigned</em>}</span>
            {due && <span className={due.cls}>📅 {due.text}</span>}
            {t.priority === 'high' && <span className="uppercase tracking-wider font-bold text-[10px] text-brand-700 bg-brand-50 border border-brand-100 rounded px-1.5 py-0.5">high priority</span>}
            <button type="button" onClick={() => setExpanded(v => !v)} className="ml-auto text-indigo-600 hover:text-indigo-800 text-xs">
              {expanded ? '× collapse' : 'edit ▾'}
            </button>
          </div>
          {t.notes && !expanded && (
            <div className="mt-1.5 text-xs text-slate-700 italic border-l-2 border-slate-300 pl-2">{t.notes}</div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-300/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {canEditMeta && (
            <>
              <form action={updateTaskAssignee}>
                <input type="hidden" name="taskId" value={t.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <label className="block">
                  <span className="block text-slate-500 mb-0.5">Assigned to</span>
                  <select name="assignedTo" defaultValue={t.assigned_to ?? ''} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-full text-xs rounded border border-slate-300 px-1.5 py-1 bg-white">
                    <option value="">— unassigned —</option>
                    {team.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </form>
              <form action={updateTaskPriority}>
                <input type="hidden" name="taskId" value={t.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <label className="block">
                  <span className="block text-slate-500 mb-0.5">Priority</span>
                  <select name="priority" defaultValue={t.priority} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-full text-xs rounded border border-slate-300 px-1.5 py-1 bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </form>
              <form action={updateTaskDueDate}>
                <input type="hidden" name="taskId" value={t.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <label className="block">
                  <span className="block text-slate-500 mb-0.5">Due date</span>
                  <input name="dueDate" type="date" defaultValue={t.due_date ?? ''} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-full text-xs rounded border border-slate-300 px-1.5 py-1 bg-white" />
                </label>
              </form>
              {tools.length > 0 && (
                <form action={updateTaskTool}>
                  <input type="hidden" name="taskId" value={t.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <label className="block">
                    <span className="block text-slate-500 mb-0.5">Tool</span>
                    <select name="tool" defaultValue={(t as any).tool ?? ''} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-full text-xs rounded border border-slate-300 px-1.5 py-1 bg-white">
                      <option value="">— no tool —</option>
                      {tools.map(tl => (<option key={tl.slug} value={tl.slug}>{tl.icon} {tl.label}</option>))}
                    </select>
                  </label>
                </form>
              )}
            </>
          )}
          <form action={updateTaskNotes} className={canEditMeta ? 'sm:col-span-2' : ''}>
            <input type="hidden" name="taskId" value={t.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <label className="block">
              <span className="block text-slate-500 mb-0.5">Notes</span>
              <textarea name="notes" defaultValue={t.notes ?? ''} rows={2} className="w-full text-xs rounded border border-slate-300 px-1.5 py-1 bg-white" placeholder="Add a note…" />
              <button type="submit" className="mt-1 text-xs text-indigo-600 hover:text-indigo-800">Save notes</button>
            </label>
          </form>
          {canDelete && (
            <form action={deleteTask} className="sm:col-span-2 text-right">
              <input type="hidden" name="taskId" value={t.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <button type="submit" className="text-xs text-red-600 hover:text-red-800" onClick={(e) => { if (!confirm('Delete this task? Cannot be undone.')) e.preventDefault(); }}>Delete task</button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
