// Shared data layer for the client-column board.
//
// Every board view uses the same x-axis — one column per client — and differs
// only in what the rows mean. This module loads the data once and derives the
// per-project and per-client rollups the board renders.

import { supabaseAdmin } from './supabaseServer';
import { loadTemplateMap } from './templates/runtime';
import { isPersonalTemplate, type ProcessTemplate } from './templates/index';

export type ProjStatus = 'overdue' | 'active' | 'idle' | 'complete';

export interface ProviderShare {
  name: string;
  total: number;
  done: number;
  overdue: number;
}

export interface BoardProject {
  id: string;
  companyName: string;
  templateSlug: string;
  template?: ProcessTemplate;
  group: ProjectGroup;
  startDate: string | null;
  createdAt: string;
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  nextDue: string | null;
  pct: number;
  status: ProjStatus;
  providers: ProviderShare[];
}

export interface BoardClient {
  key: string;
  name: string;
  email: string | null;
  projects: BoardProject[];
  total: number;
  done: number;
  overdue: number;
  pct: number;
  status: ProjStatus;
}

export interface BoardData {
  clients: BoardClient[];
  projectCount: number;
  taskTotal: number;
  taskDone: number;
  taskOverdue: number;
  overallPct: number;
  clientsAtRisk: number;
}

const NO_CLIENT = '__no_client__';

export const INTERNAL_EMAIL = 'internal@gershonconsulting.com';

/** The four project groups. Everything lands in exactly one of them. */
export const PROJECT_GROUPS = ['OnBoarding', 'OnGoing', 'Closing', 'Internal'] as const;
export type ProjectGroup = (typeof PROJECT_GROUPS)[number];

/**
 * Internal wins over everything — a project for the reserved Internal client, or
 * on a personal template, is ours regardless of which template it runs. After
 * that it is onboarding, closing, or (the default) ongoing.
 */
export function groupOf(tpl: ProcessTemplate | undefined, slug: string, clientEmail: string | null): ProjectGroup {
  if (clientEmail === INTERNAL_EMAIL || isPersonalTemplate(slug)) return 'Internal';
  const cat = tpl?.category ?? '';
  const s = (slug || '').toLowerCase();
  if (cat === 'Onboarding' || s.includes('onboarding')) return 'OnBoarding';
  if (s.includes('end-of-project') || s.includes('closing') || s.includes('offboarding')) return 'Closing';
  return 'OnGoing';
}

export function projectStatus(p: { total: number; done: number; overdue: number; inProgress: number }): ProjStatus {
  if (p.total > 0 && p.done === p.total) return 'complete';
  if (p.overdue > 0) return 'overdue';
  if (p.done > 0 || p.inProgress > 0) return 'active';
  return 'idle';
}

/**
 * Clients carry polluted company_name values ("Flying Secoya - Social Content
 * Creation onboarding"), so the display name is the shortest company_name in
 * the group — the one without a service suffix tacked on.
 */
function cleanClientName(names: string[]): string {
  const usable = names.filter(Boolean);
  if (usable.length === 0) return 'Unknown client';
  return usable.reduce((best, n) => (n.length < best.length ? n : best), usable[0]);
}

export async function loadBoardData(): Promise<BoardData> {
  const supa = supabaseAdmin();

  const [{ data: projects }, { data: tasks }, tplMap] = await Promise.all([
    supa.from('projects')
      .select('id, company_name, client_email, template_slug, start_date, created_at')
      .order('created_at', { ascending: false }),
    supa.from('tasks')
      .select('id, project_id, status, assigned_to, due_date'),
    loadTemplateMap(),
  ]);

  const allProjects = projects ?? [];
  const allTasks = tasks ?? [];
  const today = new Date().toISOString().slice(0, 10);

  interface Acc {
    total: number; done: number; inProgress: number; overdue: number;
    nextDue: string | null; providers: Map<string, ProviderShare>;
  }
  const acc = new Map<string, Acc>();
  const blank = (): Acc => ({ total: 0, done: 0, inProgress: 0, overdue: 0, nextDue: null, providers: new Map() });

  for (const t of allTasks) {
    const pid = t.project_id as string | null;
    if (!pid) continue;
    if (!acc.has(pid)) acc.set(pid, blank());
    const a = acc.get(pid)!;
    const done = t.status === 'completed';
    const late = !done && !!t.due_date && (t.due_date as string) < today;

    a.total++;
    if (done) a.done++;
    if (t.status === 'in_progress') a.inProgress++;
    if (late) a.overdue++;
    if (!done && t.due_date && (a.nextDue === null || (t.due_date as string) < a.nextDue)) {
      a.nextDue = t.due_date as string;
    }

    const who = (t.assigned_to as string | null) || 'Unassigned';
    if (!a.providers.has(who)) a.providers.set(who, { name: who, total: 0, done: 0, overdue: 0 });
    const pr = a.providers.get(who)!;
    pr.total++;
    if (done) pr.done++;
    if (late) pr.overdue++;
  }

  const byClient = new Map<string, BoardProject[]>();
  const namesByClient = new Map<string, string[]>();

  for (const p of allProjects) {
    const a = acc.get(p.id as string) ?? blank();
    const tpl = tplMap.get(p.template_slug as string);
    const base = { total: a.total, done: a.done, overdue: a.overdue, inProgress: a.inProgress };

    const proj: BoardProject = {
      id: p.id as string,
      companyName: (p.company_name as string) ?? '',
      templateSlug: p.template_slug as string,
      template: tpl,
      group: groupOf(tpl, p.template_slug as string, (p.client_email as string | null) ?? null),
      startDate: (p.start_date as string | null) ?? null,
      createdAt: p.created_at as string,
      total: a.total,
      done: a.done,
      inProgress: a.inProgress,
      overdue: a.overdue,
      nextDue: a.nextDue,
      pct: a.total > 0 ? Math.round((a.done / a.total) * 100) : 0,
      status: projectStatus(base),
      providers: [...a.providers.values()].sort((x, y) => y.total - x.total),
    };

    const key = (p.client_email as string | null) || NO_CLIENT;
    if (!byClient.has(key)) { byClient.set(key, []); namesByClient.set(key, []); }
    byClient.get(key)!.push(proj);
    namesByClient.get(key)!.push(proj.companyName);
  }

  const clients: BoardClient[] = [...byClient.entries()].map(([key, projs]) => {
    const total = projs.reduce((n, p) => n + p.total, 0);
    const done = projs.reduce((n, p) => n + p.done, 0);
    const overdue = projs.reduce((n, p) => n + p.overdue, 0);
    const inProgress = projs.reduce((n, p) => n + p.inProgress, 0);
    return {
      key,
      name: key === NO_CLIENT ? 'Internal / no client' : cleanClientName(namesByClient.get(key) ?? []),
      email: key === NO_CLIENT ? null : key,
      projects: projs,
      total,
      done,
      overdue,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      status: projectStatus({ total, done, overdue, inProgress }),
    };
  });

  // Anything overdue first, then the busiest, so the columns you need are the
  // ones you reach without scrolling.
  clients.sort((a, b) => {
    if ((b.overdue > 0 ? 1 : 0) !== (a.overdue > 0 ? 1 : 0)) return (b.overdue > 0 ? 1 : 0) - (a.overdue > 0 ? 1 : 0);
    if (b.projects.length !== a.projects.length) return b.projects.length - a.projects.length;
    return a.name.localeCompare(b.name);
  });

  const taskTotal = clients.reduce((n, c) => n + c.total, 0);
  const taskDone = clients.reduce((n, c) => n + c.done, 0);

  return {
    clients,
    projectCount: allProjects.length,
    taskTotal,
    taskDone,
    taskOverdue: clients.reduce((n, c) => n + c.overdue, 0),
    overallPct: taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0,
    clientsAtRisk: clients.filter(c => c.overdue > 0).length,
  };
}
