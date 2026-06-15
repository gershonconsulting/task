export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { resolveTeamRole, canCreateProject } from '@/lib/roles'
import { createProjectFromTemplate } from '@/lib/projectCreate'
import { getTemplate } from '@/lib/templates'

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
  if (!session.user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  const role = resolveTeamRole(session.user.email)
  if (!canCreateProject(role)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  // 2. Parse body
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const templateSlug = (body.templateSlug ?? '').trim()
  const companyName = (body.companyName ?? '').trim()
  const clientEmail = (body.clientEmail ?? '').trim()
  const clientFirstName = (body.clientFirstName ?? '').trim() || undefined
  const clientLastName = (body.clientLastName ?? '').trim() || undefined
  const clientTitle = (body.clientTitle ?? '').trim() || undefined
  const clientLinkedinUrl = (body.clientLinkedinUrl ?? '').trim() || undefined
  const clientDomain = (body.clientDomain ?? '').trim() || undefined
  const startDate = (body.startDate ?? '').trim() || undefined
  const endDate = (body.endDate ?? '').trim() || undefined

  // 3. Validate
  if (!templateSlug || !getTemplate(templateSlug)) {
    return NextResponse.json({ error: 'Pick a valid template.' }, { status: 400 })
  }
  if (!companyName) {
    return NextResponse.json({ error: 'Project name is required.' }, { status: 400 })
  }
  if (!clientEmail) {
    return NextResponse.json({ error: 'Client email is required.' }, { status: 400 })
  }

  // 4. Create
  try {
    const result = await createProjectFromTemplate({
      templateSlug,
      companyName,
      clientEmail,
      clientFirstName,
      clientLastName,
      clientTitle,
      clientLinkedinUrl,
      clientDomain,
      startDate,
      endDate,
      createdByEmail: session.user.email,
    })
    return NextResponse.json({ ok: true, projectId: result.projectId, taskCount: result.taskCount })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
