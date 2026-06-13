'use server';

import { revalidatePath } from 'next/cache';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import {
  resolveTeamRole,
  canSeeAllProjects,
  canUpdateTaskStatus,
  canReassignTask,
  canDeleteTask,
  canDeleteProject,
} from '@/lib/roles';
import { supabaseAdmin } from '@/lib/supabaseServer';

async function requireSessionAndAccess(projectId: string) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) throw new Error('Not signed in');
  const role = resolveTeamRole(session.user.email);
  if (role.kind === 'guest') {
    // Could still be a client — verify they own this project
    const { data } = await supabaseAdmin()
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('client_email', session.user.email)
      .maybeSingle();
    if (!data) throw new Error('Not authorized');
  } else if (!canSeeAllProjects(role)) {
    throw new Error('Not authorized');
  }
  return { session, role };
}

export async function updateTaskStatus(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '');
  const status = String(formData.get('status') ?? '');
  const projectId = String(formData.get('projectId') ?? '');
  if (!['pending', 'in_progress', 'completed'].includes(status)) return;
  const { role } = await requireSessionAndAccess(projectId);
  if (!canUpdateTaskStatus(role)) return;
  await supabaseAdmin().from('tasks').update({ status }).eq('id', taskId);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskNotes(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '');
  const notes = String(formData.get('notes') ?? '');
  const projectId = String(formData.get('projectId') ?? '');
  await requireSessionAndAccess(projectId);
  await supabaseAdmin().from('tasks').update({ notes: notes || null }).eq('id', taskId);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskAssignee(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '');
  const assignedTo = String(formData.get('assignedTo') ?? '').trim();
  const projectId = String(formData.get('projectId') ?? '');
  const { role } = await requireSessionAndAccess(projectId);
  if (!canReassignTask(role)) return;
  await supabaseAdmin().from('tasks').update({ assigned_to: assignedTo || null }).eq('id', taskId);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskPriority(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '');
  const priority = String(formData.get('priority') ?? '');
  const projectId = String(formData.get('projectId') ?? '');
  if (!['low', 'medium', 'high'].includes(priority)) return;
  const { role } = await requireSessionAndAccess(projectId);
  if (!canReassignTask(role)) return;
  await supabaseAdmin().from('tasks').update({ priority }).eq('id', taskId);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskDueDate(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '');
  const dueDate = String(formData.get('dueDate') ?? '').trim() || null;
  const projectId = String(formData.get('projectId') ?? '');
  const { role } = await requireSessionAndAccess(projectId);
  if (!canReassignTask(role)) return;
  await supabaseAdmin().from('tasks').update({ due_date: dueDate }).eq('id', taskId);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTask(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '');
  const projectId = String(formData.get('projectId') ?? '');
  const { role } = await requireSessionAndAccess(projectId);
  if (!canDeleteTask(role)) return;
  await supabaseAdmin().from('tasks').delete().eq('id', taskId);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(formData: FormData): Promise<void> {
  const projectId = String(formData.get('projectId') ?? '');
  const { role } = await requireSessionAndAccess(projectId);
  if (!canDeleteProject(role)) return;
  await supabaseAdmin().from('projects').delete().eq('id', projectId);
  revalidatePath('/projects');
}
