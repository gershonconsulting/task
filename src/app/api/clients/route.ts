export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { hashPassword } from '@/lib/password'

export async function GET() {
  try {
    const supa = supabaseAdmin()
    const [clientsRes, projectsRes] = await Promise.all([
      supa.from('clients').select('id, name, email, project_ids, must_change_password, created_at').order('created_at', { ascending: false }),
      supa.from('projects').select('company_name, client_email, created_at').order('created_at', { ascending: false }),
    ])
    const byEmail = new Map()
    for (const c of (clientsRes.data ?? [])) {
      if (!c.email) continue
      byEmail.set(String(c.email).toLowerCase(), { id: c.id, name: c.name || c.email, email: c.email, project_ids: c.project_ids ?? [], must_change_password: c.must_change_password ?? false, created_at: c.created_at })
    }
    for (const p of (projectsRes.data ?? [])) {
      const email = (p.client_email ?? '').trim()
      if (!email) continue
      const key = email.toLowerCase()
      if (!byEmail.has(key)) byEmail.set(key, { id: email, name: p.company_name || email, email, project_ids: [], must_change_password: false, created_at: p.created_at })
    }
    return NextResponse.json({ clients: Array.from(byEmail.values()) })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const projectId = (body.projectId ?? '').trim()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
    const supa = supabaseAdmin()
    const { data: ex } = await supa.from('clients').select('id, project_ids').eq('email', email).single()
    if (ex) {
      const ids = Array.from(new Set([...(ex.project_ids ?? []), projectId].filter(Boolean)))
      await supa.from('clients').update({ project_ids: ids }).eq('id', ex.id)
      return NextResponse.json({ ok: true, clientId: ex.id, existing: true })
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    const arr = new Uint8Array(10)
    crypto.getRandomValues(arr)
    const tempPassword = Array.from(arr).map(b => chars[b % chars.length]).join('')
    const hash = await hashPassword(tempPassword)
    const { data: cl, error } = await supa.from('clients').insert({ name, email, password_hash: hash, must_change_password: true, project_ids: projectId ? [projectId] : [] }).select('id').single()
    if (error || !cl) return NextResponse.json({ error: error?.message ?? 'fail' }, { status: 500 })
    return NextResponse.json({ ok: true, clientId: cl.id, tempPassword, existing: false })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
