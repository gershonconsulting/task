import Link from 'next/link'
import type { BoardClient, BoardProject, ProjStatus, ProviderShare } from '@/lib/clientBoard'

// One client, one column. Every board view shares this x-axis and only changes
// what the rows mean, so switching views never means relearning the layout.

const STATUS: Record<ProjStatus, { label: string; pill: string; bar: string; edge: string; text: string }> = {
  complete: { label: 'Complete',    pill: 'bg-green-100 text-green-700', bar: 'bg-green-500',  edge: 'border-l-green-500',  text: 'text-green-600' },
  overdue:  { label: 'Overdue',     pill: 'bg-red-100 text-red-700',     bar: 'bg-red-500',    edge: 'border-l-red-500',    text: 'text-red-600' },
  active:   { label: 'In progress', pill: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500',  edge: 'border-l-amber-500',  text: 'text-amber-600' },
  idle:     { label: 'Not started', pill: 'bg-slate-100 text-slate-600', bar: 'bg-slate-300',  edge: 'border-l-slate-300',  text: 'text-slate-500' },
}

export interface BoardCard {
  key: string
  projectId: string
  icon: string
  label: string
  meta: string
  total: number
  done: number
  overdue: number
  status: ProjStatus
  /** Rendered inside an expandable card — used by the By Client view. */
  detail?: ProviderShare[]
}

export interface BoardRow {
  id: string
  /** null renders the board without a row-label column. */
  label: string | null
  tone?: ProjStatus
  /** One entry per client, in the same order as `clients`. */
  cells: BoardCard[][]
}

const COL_W = 292
const LABEL_W = 124

function ProgressBar({ pct, tone }: { pct: number; tone: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-1 mt-2 overflow-hidden">
      <div className={`h-1 rounded-full ${tone}`} style={{ width: pct + '%' }} />
    </div>
  )
}

function ProviderList({ shares }: { shares: ProviderShare[] }) {
  return (
    <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Who is on it</div>
      {shares.map(s => (
        <div key={s.name} className="flex items-center justify-between gap-2 text-[11px] py-0.5">
          <span className="text-slate-600 truncate">{s.name}</span>
          <span className="text-slate-400 tabular-nums shrink-0">
            {s.done}/{s.total}
            {s.overdue > 0 && <span className="text-red-600 font-bold"> · {s.overdue} late</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

function CardBody({ card }: { card: BoardCard }) {
  const s = STATUS[card.status]
  const pct = card.total > 0 ? Math.round((card.done / card.total) * 100) : 0
  return (
    <>
      <div className="flex items-start gap-2">
        <span className="text-sm leading-tight shrink-0">{card.icon}</span>
        <span className="font-semibold text-[13px] leading-tight text-slate-900 min-w-0">{card.label}</span>
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-1">{card.meta}</div>
      <ProgressBar pct={pct} tone={s.bar} />
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${s.pill}`}>
          {card.status === 'overdue' ? `${card.overdue} overdue` : s.label}
        </span>
        <span className="text-[11px] text-slate-500 tabular-nums">{card.done}/{card.total}</span>
      </div>
    </>
  )
}

function Card({ card }: { card: BoardCard }) {
  const s = STATUS[card.status]
  const shell = `block w-full text-left bg-slate-50 border border-slate-200 border-l-[3px] ${s.edge} rounded-lg p-2.5 transition hover:shadow-md hover:border-slate-300`

  if (card.detail && card.detail.length > 0) {
    return (
      <details className="group">
        <summary className={`${shell} cursor-pointer list-none marker:hidden`}>
          <CardBody card={card} />
        </summary>
        <div className="px-2.5 pb-2.5 -mt-1 bg-slate-50 border border-t-0 border-slate-200 rounded-b-lg">
          <ProviderList shares={card.detail} />
          <Link href={`/projects/${card.projectId}`} className="block mt-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-800">
            Open project →
          </Link>
        </div>
      </details>
    )
  }

  return (
    <Link href={`/projects/${card.projectId}`} className={shell}>
      <CardBody card={card} />
    </Link>
  )
}

function ClientHeader({ client }: { client: BoardClient }) {
  const s = STATUS[client.status]
  return (
    <div className="sticky top-0 z-20 mt-4 bg-white border border-slate-200 border-b-0 rounded-t-xl px-3 pt-3 pb-3 shadow-[0_6px_12px_-8px_rgba(15,23,42,0.28)]">
      <div className="font-bold text-[15px] leading-tight text-slate-900 truncate">{client.name}</div>
      <div className="text-[11px] text-slate-400 truncate">{client.email ?? '—'}</div>
      <div className="flex items-end justify-between gap-2 mt-2">
        <div className="text-lg font-extrabold text-slate-900 tabular-nums leading-none">
          {client.pct}<span className="text-xs">%</span>
        </div>
        <div className="text-[11px] text-slate-500 text-right leading-tight tabular-nums">
          {client.projects.length} project{client.projects.length === 1 ? '' : 's'}<br />
          {client.done}/{client.total} tasks
        </div>
      </div>
      <ProgressBar pct={client.pct} tone={s.bar} />
      <span className={`inline-block mt-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${s.pill}`}>
        {client.overdue > 0 ? `${client.overdue} overdue` : s.label}
      </span>
    </div>
  )
}

export default function ClientBoard({ clients, rows, maxHeight = 'calc(100vh - 14rem)' }: { clients: BoardClient[]; rows: BoardRow[]; maxHeight?: string }) {
  if (clients.length === 0) {
    return <p className="text-slate-400 text-sm">No clients yet.</p>
  }

  const visible = rows.filter(r => r.label === null || r.cells.some(c => c.length > 0))
  const labelled = visible.some(r => r.label !== null)
  const gridCols = (labelled ? `${LABEL_W}px ` : '') + `repeat(${clients.length}, ${COL_W}px)`

  return (
    <div className="overflow-auto -mx-1 px-1" style={{ maxHeight }}>
      <div className="grid gap-x-3.5 w-max min-w-full" style={{ gridTemplateColumns: gridCols }}>

        {labelled && (
          <div className="sticky top-0 left-0 z-30 bg-slate-50 shadow-[8px_0_8px_-8px_rgba(15,23,42,0.16)]" />
        )}
        {clients.map(c => <ClientHeader key={c.key} client={c} />)}

        {visible.map((row, ri) => {
          const last = ri === visible.length - 1
          const count = row.cells.reduce((n, c) => n + c.length, 0)
          return (
            <div key={row.id} className="contents">
              {labelled && (
                <div className="sticky left-0 z-10 self-stretch bg-slate-50 pr-3.5 pt-4 pb-3 shadow-[8px_0_8px_-8px_rgba(15,23,42,0.16)]">
                  <div className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${row.tone ? STATUS[row.tone].text : 'text-slate-500'}`}>
                    {row.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                    {count} project{count === 1 ? '' : 's'}
                  </div>
                </div>
              )}
              {clients.map((c, ci) => {
                const cards = row.cells[ci] ?? []
                return (
                  <div
                    key={c.key}
                    className={`bg-white border-x border-slate-200 px-3 ${last ? 'border-b rounded-b-xl pb-3 shadow-sm' : ''}`}
                  >
                    <div className="flex flex-col gap-2 py-3">
                      {cards.length === 0
                        ? <div className="text-[11px] text-slate-300 italic">—</div>
                        : cards.map(card => <Card key={card.key} card={card} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Build a card from a project — the shape every view starts from. */
export function toCard(p: BoardProject, opts?: { detail?: boolean; share?: ProviderShare }): BoardCard {
  const share = opts?.share
  const total = share ? share.total : p.total
  const done = share ? share.done : p.done
  const overdue = share ? share.overdue : p.overdue
  const status: ProjStatus =
    total > 0 && done === total ? 'complete'
    : overdue > 0 ? 'overdue'
    : done > 0 ? 'active'
    : 'idle'

  const started = p.startDate ?? p.createdAt.slice(0, 10)
  const meta = overdue > 0 && p.nextDue
    ? `Started ${started} · due ${p.nextDue}`
    : `Started ${started}`

  return {
    key: share ? `${p.id}:${share.name}` : p.id,
    projectId: p.id,
    icon: p.template?.icon ?? '📁',
    label: p.template?.label ?? p.templateSlug,
    meta,
    total,
    done,
    overdue,
    status,
    detail: opts?.detail ? p.providers : undefined,
  }
}
