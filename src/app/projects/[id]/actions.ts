'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function updateTaskStatus(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '')
  const status = String(formData.get('status') ?? '')
  const projectId = String(formData.get('projectId') ?? '')
  if (!['pending', 'in_progress', 'completed'].includes(status)) return
  await supabaseAdmin().from('tasks').update({ status }).eq('id', taskId)
  revalidatePath('/projects/' + projectId)
}

export async function updateTaskNotes(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '')
  const notes = String(formData.get('notes') ?? '')
  const projectId = String(formData.get('projectId') ?? '')
  await supabaseAdmin().from('tasks').update({ notes: notes || null }).eq('id', taskId)
  revalidatePath('/projects/' + projectId)
}

export async function updateTaskAssignee(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '')
  const assignedTo = String(formData.get('assignedTo') ?? '').trim()
  const projectId = String(formData.get('projectId') ?? '')
  await supabaseAdmin().from('tasks').update({ assigned_to: assignedTo || null }).eq('id', taskId)
  revalidatePath('/projects/' + projectId)
}

export async function updateTaskPriority(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '')
  const priority = String(formData.get('priority') ?? '')
  const projectId = String(formData.get('projectId') ?? '')
  if (!['low', 'medium', 'high'].includes(priority)) return
  await supabaseAdmin().from('tasks').update({ priority }).eq('id', taskId)
  revalidatePath('/projects/' + projectId)
}

export async function updateTaskDueDate(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '')
  const dueDate = String(formData.get('dueDate') ?? '').trim() || null
  const projectId = String(formData.get('projectId') ?? '')
  await supabaseAdmin().from('tasks').update({ due_date: dueDate }).eq('id', taskId)
  revalidatePath('/projects/' + projectId)
}

export async function updateTaskTool(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '')
  const tool = String(formData.get('tool') ?? '').trim() || null
  const projectId = String(formData.get('projectId') ?? '')
  await supabaseAdmin().from('tasks').update({ tool }).eq('id', taskId)
  revalidatePath('/projects/' + projectId)
}

export async function deleteTask(formData: FormData): Promise<void> {
  const taskId = String(formData.get('taskId') ?? '')
  const projectId = String(formData.get('projectId') ?? '')
  await supabaseAdmin().from('tasks').delete().eq('id', taskId)
  revalidatePath('/projects/' + projectId)
}

export async function deleteProject(formData: FormData): Promise<void> {
  const projectId = String(formData.get('projectId') ?? '')
  await supabaseAdmin().from('projects').delete().eq('id', projectId)
  revalidatePath('/projects')
}
