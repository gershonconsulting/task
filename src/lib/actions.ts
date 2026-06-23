'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseServer'

// Global task status update — revalidates all views that show tasks
export async function updateTaskStatusGlobal(formData: FormData): Promise<void> {
  const taskId    = String(formData.get('taskId')    ?? '')
  const status    = String(formData.get('status')    ?? '')
  const projectId = String(formData.get('projectId') ?? '')

  if (!['pending', 'in_progress', 'completed'].includes(status)) return
  await supabaseAdmin().from('tasks').update({ status }).eq('id', taskId)

  // Revalidate all views that list tasks
  revalidatePath('/users')
  revalidatePath('/tasks')
  revalidatePath('/clients')
  revalidatePath('/tools')
  revalidatePath('/stages')
  revalidatePath('/dashboard')
  if (projectId) revalidatePath('/projects/' + projectId)
}
