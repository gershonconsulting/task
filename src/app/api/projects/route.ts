export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, SessionData } from '@/lib/session'
import { createProjectFromTemplate } from '@/lib/projectCreate'
import { getTemplate } from '@/lib/templates'

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
    const clientEmail = (body.clientEmail ?? '').trim()

  if (!templateSlug || !getTemplate(templateSlug)) {
        return NextResponse.json({ error: 'Pick a valid template.' }, { status: 400 })
  }
    if (!companyName) {
          return NextResponse.json({ error: 'Project name is required.' }, { status: 400 })
    }
    if (!clientEmail) {
          return NextResponse.json({ error: 'Client email is required.' }, { status: 400 })
    }

  try {
        const result = await createProjectFromTemplate({
                templateSlug,
                companyName,
                clientEmail,
                clientFirstName: (body.clientFirstName ?? '').trim() || undefined,
                clientLastName: (body.clientLastName ?? '').trim() || undefined,
                clientTitle: (body.clientTitle ?? '').trim() || undefined,
                clientLinkedinUrl: (body.clientLinkedinUrl ?? '').trim() || undefined,
                clientDomain: (body.clientDomain ?? '').trim() || undefined,
                startDate: (body.startDate ?? '').trim() || undefined,
                endDate: (body.endDate ?? '').trim() || undefined,
                createdByEmail,
        })
        return NextResponse.json({ ok: true, projectId: result.projectId, taskCount: result.taskCount })
  } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
