export const runtime = 'edge'

import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { loadTemplateMap } from '@/lib/templates/runtime'

export default async function ReportPage(props: { params: Promise<{ id: string }> }) {
  const tplMap = await loadTemplateMap()
  const { id } = await props.params
  const supa = supabaseAdmin()

  const { data: project } = await supa.from('projects').select('*').eq('id', id).maybeSingle()
  if (!project) notFound()

  const { data: tasks } = await supa.from('tasks').select('*').eq('project_id', id).order('position', { ascending: true })
  const taskRows = tasks ?? []

  const tpl = tplMap.get(project.template_slug)
  const total = taskRows.length
  const done = taskRows.filter((t: { status: string }) => t.status === 'completed').length
  const pct = total === 0 ? 0 : Math.round(done / total * 100)

  const pending = taskRows.filter((t: { status: string }) => t.status === 'pending')
  const inProgress = taskRows.filter((t: { status: string }) => t.status === 'in_progress')
  const completed = taskRows.filter((t: { status: string }) => t.status === 'completed')

  return (
    <html lang="en">
      <head>
        <title>Status Report — {project.company_name}</title>
        <style>{`
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; color: #1e293b; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          .subtitle { color: #64748b; font-size: 13px; margin: 0 0 24px; }
          .stats { display: flex; gap: 16px; margin-bottom: 24px; }
          .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; min-width: 80px; }
          .stat-value { font-size: 24px; font-weight: 700; color: #6366f1; }
          .stat-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-top: 2px; }
          h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 20px 0 8px; }
          ul { margin: 0; padding: 0; list-style: none; }
          li { padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; display: flex; justify-content: space-between; }
          .tag { font-size: 11px; color: #94a3b8; }
          .no-print { margin-top: 24px; }
          @media print { .no-print { display: none; } }
        `}</style>
      </head>
      <body>
        <h1>{tpl?.icon} {project.company_name}</h1>
        <p className="subtitle">{tpl?.label} · Status: {project.status.replace('_', ' ')} · Generated {new Date().toLocaleDateString()}</p>

        <div className="stats">
          <div className="stat"><div className="stat-value">{pct}%</div><div className="stat-label">Complete</div></div>
          <div className="stat"><div className="stat-value">{done}</div><div className="stat-label">Done</div></div>
          <div className="stat"><div className="stat-value">{inProgress.length}</div><div className="stat-label">In Progress</div></div>
          <div className="stat"><div className="stat-value">{pending.length}</div><div className="stat-label">Pending</div></div>
        </div>

        {inProgress.length > 0 && (
          <>
            <h2>In Progress</h2>
            <ul>{inProgress.map((t: { id: string; name: string; assigned_to: string | null; due_date: string | null }) => <li key={t.id}><span>{t.name}</span><span className="tag">{t.assigned_to ?? 'Unassigned'}{t.due_date ? ` · ${t.due_date}` : ''}</span></li>)}</ul>
          </>
        )}

        {pending.length > 0 && (
          <>
            <h2>Pending</h2>
            <ul>{pending.map((t: { id: string; name: string; assigned_to: string | null; due_date: string | null }) => <li key={t.id}><span>{t.name}</span><span className="tag">{t.assigned_to ?? 'Unassigned'}{t.due_date ? ` · ${t.due_date}` : ''}</span></li>)}</ul>
          </>
        )}

        {completed.length > 0 && (
          <>
            <h2>Completed</h2>
            <ul>{completed.map((t: { id: string; name: string; assigned_to: string | null }) => <li key={t.id}><span>{t.name}</span><span className="tag">{t.assigned_to ?? 'Unassigned'}</span></li>)}</ul>
          </>
        )}

        <div className="no-print" style={{ marginTop: 32 }}>
          <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Print / Save PDF</button>
          <a href={`/projects/${id}`} style={{ marginLeft: 12, fontSize: 14, color: '#6366f1' }}>← Back to project</a>
        </div>
      </body>
    </html>
  )
                                                                       }
