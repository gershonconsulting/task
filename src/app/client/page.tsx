export const runtime = 'edge'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/currentUser'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getTemplate } from '@/lib/templates'
import ClientPortal from './ClientPortal'

export default async function ClientPage() {
  const user = await getCurrentUser()
  if (user.role !== 'client') redirect('/projects')
  if (!user.projectId) redirect('/login')
  const supa = supabaseAdmin()
  const { data: project } = await supa.from('projects').select('*').eq('id', user.projectId).maybeSingle()
  const { data: tasks } = await supa.from('tasks').select('*').eq('project_id', user.projectId).order('position', { ascending: true })
  const tpl = project ? getTemplate(project.template_slug) : undefined
  return (
    <ClientPortal
      user={{ name: user.name, email: user.email, mustChangePassword: user.mustChangePassword }}
      project={project}
      tasks={tasks ?? []}
      template={tpl ? { label: tpl.label, icon: tpl.icon, color: tpl.color } : undefined}
    />
  )
}
