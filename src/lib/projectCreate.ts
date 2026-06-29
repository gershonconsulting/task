// Instantiate a template into a projects row + N tasks rows.
// Called server-side (edge runtime) from the new-project Server Action.

import { supabaseAdmin } from './supabaseServer';
import { getTemplate } from './templates';
import type { ProjectType } from './templates';

export interface NewProjectInput {
  templateSlug: string;
  companyName: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientTitle?: string;
  clientEmail: string;
  clientLinkedinUrl?: string;
  clientDomain?: string;
  startDate?: string; // YYYY-MM-DD, defaults to today
  endDate?: string;
  periodMonth?: string; // YYYY-MM-01, optional
  createdByEmail: string;
  projectType?: ProjectType; // simple | advanced | complex
}

export interface NewProjectResult {
  projectId: string;
  taskCount: number;
}

export async function createProjectFromTemplate(input: NewProjectInput): Promise<NewProjectResult> {
  const tpl = getTemplate(input.templateSlug);
  if (!tpl) throw new Error('Unknown template: ' + input.templateSlug);

  const start = input.startDate ?? new Date().toISOString().slice(0, 10);
  const supa = supabaseAdmin();

  // 1. Insert project row
  const { data: proj, error: projErr } = await supa
    .from('projects')
    .insert({
      template_slug: tpl.slug,
      company_name: input.companyName,
      client_first_name: input.clientFirstName ?? null,
      client_last_name: input.clientLastName ?? null,
      client_title: input.clientTitle ?? null,
      client_email: input.clientEmail,
      client_linkedin_url: input.clientLinkedinUrl ?? null,
      client_domain: input.clientDomain ?? null,
      status: 'planning',
      start_date: start,
      end_date: input.endDate ?? null,
        period_month: input.periodMonth ?? null,
      created_by_email: input.createdByEmail,
      project_type: input.projectType ?? tpl.projectType ?? 'advanced',
    })
    .select('id')
    .single();

  if (projErr || !proj) {
    throw new Error('Project insert failed: ' + (projErr?.message ?? 'unknown'));
  }

  // 2. Build task rows from the template (include tool field)
  const startMs = new Date(start).getTime();
  const dayMs = 86_400_000;

  const taskRows = tpl.tasks.map((t, i) => {
    const due =
      t.dueOffsetDays !== undefined
        ? new Date(startMs + t.dueOffsetDays * dayMs).toISOString().slice(0, 10)
        : null;
    return {
      project_id: proj.id,
      position: i,
      name: t.name,
      description: t.description ?? null,
      assigned_to: t.assignedTo,
      status: 'pending' as const,
      priority: t.priority ?? 'medium',
      due_date: due,
      notes: null,
      template_item_id: t.id,
      tool: t.tool ?? null,
    };
  });

  const { error: taskErr } = await supa.from('tasks').insert(taskRows);
  if (taskErr) {
    // Roll back project row to avoid orphaned project with no tasks
    await supa.from('projects').delete().eq('id', proj.id);
    throw new Error('Task batch insert failed (project rolled back): ' + taskErr.message);
  }

  return { projectId: proj.id, taskCount: taskRows.length };
}
