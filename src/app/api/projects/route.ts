export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { createProjectFromTemplate } from '@/lib/projectCreate'
import { getTemplate } from '@/lib/templates'
import type { ProjectType } from '@/lib/templates'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { hashPassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions())
  const createdByEmail = session.user?.email ?? 'unknown'

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const templateSlug = (body.templateSlug ?? '').trim()
  const companyName = (body.companyName ?? '').trim()
  const clientEmail = (body.clientEmail ?? '').trim().toLowerCase()
  const existingClientId = (body.existingClientId ?? '').trim()
  const projectType = ((body.projectType ?? 'advanced').trim()) as ProjectType

  if (!templateSlug || !getTemplate(templateSlug)) {
    return NextResponse.json({ error: 'Pick a valid template.' }, { status: 400 })
  }
  if (!companyName) {
    return NextResponse.json({ error: 'Project name is required.' }, { status: 400 })
  }
  if (!clientEmail && !existingClientId) {
    return NextResponse.json({ error: 'Client email is required.' }, { status: 400 })
  }

  const supa = supabaseAdmin()
  let resolvedEmail = clientEmail
  let clientFirstName = (body.clientFirstName ?? '').trim() || undefined
  let clientLastName = (body.clientLastName ?? '').trim() || undefined

  if (existingClientId) {
    const { data: existingClient } = await supa
      .from('clients')
      .select('email, name')
      .eq('id', existingClientId)
      .single()
    if (existingClient) {
      resolvedEmail = existingClient.email
      const parts = (existingClient.name ?? '').split(' ')
      if (!clientFirstName) clientFirstName = parts[0]
      if (!clientLastName) clientLastName = parts.slice(1).join(' ') || undefined
    }
  }

  try {
    const result = await createProjectFromTemplate({
      templateSlug,
      companyName,
      clientEmail: resolvedEmail,
      clientFirstName,
      clientLastName,
      clientTitle: (body.clientTitle ?? '').trim() || undefined,
      clientLinkedinUrl: (body.clientLinkedinUrl ?? '').trim() || undefined,
      clientDomain: (body.clientDomain ?? '').trim() || undefined,
      startDate: (body.startDate ?? '').trim() || undefined,
      endDate: (body.endDate ?? '').trim() || undefined,
      createdByEmail,
      projectType,
    })

    const projectId = result.projectId
    let tempPassword: string | undefined
    let clientCreated = false

    if (existingClientId) {
      const { data: ec } = await supa.from('clients').select('project_ids').eq('id', existingClientId).single()
      if (ec) {
        const updated = Array.from(new Set([...(ec.project_ids ?? []), projectId]))
        await supa.from('clients').update({ project_ids: updated }).eq('id', existingClientId)
      }
    } else if (resolvedEmail) {
      const { data: ec } = await supa.from('clients').select('id, project_ids').eq('email', resolvedEmail).single()
      if (ec) {
        const updated = Array.from(new Set([...(ec.project_ids ?? []), projectId]))
        await supa.from('clients').update({ project_ids: updated }).eq('id', ec.id)
      } else {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
        const arr = new Uint8Array(10)
        crypto.getRandomValues(arr)
        tempPassword = Array.from(arr).map(b => chars[b % chars.length]).join('')
        const passwordHash = await hashPassword(tempPassword)
        const fullName = [clientFirstName, clientLastName].filter(Boolean).join(' ') || resolvedEmail
        await supa.from('clients').insert({
          name: fullName,
          email: resolvedEmail,
          password_hash: passwordHash,
          must_change_password: true,
          project_ids: [projectId],
        })
        clientCreated = true
      }
    }

    return NextResponse.json({ ok: true, projectId, taskCount: result.taskCount, tempPassword, clientCreated })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
