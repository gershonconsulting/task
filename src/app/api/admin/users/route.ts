export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { requireOwnerApi } from '@/lib/adminAuth'
import { loadTeam, saveTeam, norm, normalizeLinkedInUrl, linkedInSlug, type TeamMember } from '@/lib/team'
import { newToken, toAdminUser } from '@/lib/adminUsers'

/**
 * Admin panel API — owner only (olivier@attia.com and Olivier's other addresses).
 *   GET                     list users (+ invite links)
 *   POST   {name,email,linkedin,role,linkedinEmail?}   create a user → returns invite link
 *   PATCH  {id, ...fields, unlink?}                   edit a user
 *   DELETE ?id=…                                       remove a user
 */
function slugId(name: string): string {
  return (norm(name).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'user') + '-' + Date.now().toString(36)
}

function bad(error: string, status = 400) { return NextResponse.json({ error }, { status }) }

export async function GET() {
  const gate = await requireOwnerApi(); if ('res' in gate) return gate.res
  const team = await loadTeam()
  return NextResponse.json({ users: team.map(toAdminUser) })
}

export async function POST(req: NextRequest) {
  const gate = await requireOwnerApi(); if ('res' in gate) return gate.res
  let b: Partial<TeamMember>
  try { b = await req.json() } catch { return bad('Invalid JSON') }

  const linkedin = normalizeLinkedInUrl(b.linkedin)
  if (!linkedin) return bad('Paste the LinkedIn profile link (https://www.linkedin.com/in/…)')
  const name = String(b.name ?? '').trim()
  if (!name) return bad('Full name is required')
  const email = String(b.email ?? '').trim().toLowerCase()
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('Work e-mail looks wrong')
  const linkedinEmail = String(b.linkedinEmail ?? '').trim().toLowerCase() || undefined
  const role: TeamMember['role'] = b.role === 'admin' ? 'admin' : 'team'

  const team = await loadTeam()
  const slug = linkedInSlug(linkedin)
  const dupe = team.find(m => (m.linkedin && linkedInSlug(m.linkedin) === slug) || (email && norm(m.email) === email))
  if (dupe) return bad(`${dupe.name} already has this ${email && norm(dupe.email) === email ? 'e-mail' : 'LinkedIn profile'}`, 409)

  const now = new Date().toISOString()
  const member: TeamMember = {
    id: slugId(name), name, email, role, linkedin, linkedinEmail,
    inviteToken: newToken(), invitedAt: now, createdAt: now, createdBy: gate.user.email,
  }
  await saveTeam([...team, member])
  return NextResponse.json({ ok: true, user: toAdminUser(member) })
}

export async function PATCH(req: NextRequest) {
  const gate = await requireOwnerApi(); if ('res' in gate) return gate.res
  let b: Partial<TeamMember> & { unlink?: boolean }
  try { b = await req.json() } catch { return bad('Invalid JSON') }
  const team = await loadTeam()
  const i = team.findIndex(m => m.id === b.id)
  if (i < 0) return bad('User not found', 404)
  const m = { ...team[i] }

  if (b.name !== undefined) { const n = String(b.name).trim(); if (!n) return bad('Name cannot be empty'); m.name = n }
  if (b.email !== undefined) m.email = String(b.email).trim().toLowerCase()
  if (b.linkedinEmail !== undefined) m.linkedinEmail = String(b.linkedinEmail).trim().toLowerCase() || undefined
  if (b.linkedin !== undefined) {
    const l = normalizeLinkedInUrl(b.linkedin)
    if (!l) return bad('Not a LinkedIn profile link')
    m.linkedin = l
  }
  if (b.role !== undefined) m.role = b.role === 'admin' ? 'admin' : 'team'
  if (b.unlink) { m.linkedinSub = undefined; m.inviteToken = newToken(); m.invitedAt = new Date().toISOString() }

  const next = [...team]; next[i] = m
  if (!next.some(x => x.role === 'admin')) return bad('Keep at least one admin')
  if (m.id === gate.user.id && m.role !== 'admin') return bad('You cannot remove your own admin role')
  await saveTeam(next)
  return NextResponse.json({ ok: true, user: toAdminUser(m) })
}

export async function DELETE(req: NextRequest) {
  const gate = await requireOwnerApi(); if ('res' in gate) return gate.res
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return bad('id is required')
  if (id === gate.user.id) return bad('You cannot remove yourself')
  const team = await loadTeam()
  const next = team.filter(m => m.id !== id)
  if (next.length === team.length) return bad('User not found', 404)
  if (!next.some(x => x.role === 'admin')) return bad('Keep at least one admin')
  await saveTeam(next)
  return NextResponse.json({ ok: true })
}
