import { supabaseAdmin } from '@/lib/supabaseServer'

/**
 * The registered users of this platform = the team list in Settings
 * (app_settings.team_members). Sign-in is by LinkedIn: a LinkedIn account is
 * let in only when it matches one of these members.
 */
export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'team'
  /** LinkedIn profile URL as entered in Settings. */
  linkedin?: string
  /** E-mail of the LinkedIn account, if it differs from `email`. Optional. */
  linkedinEmail?: string
  /** LinkedIn OpenID subject — bound automatically on the first sign-in. */
  linkedinSub?: string
  /** Last successful LinkedIn sign-in (ISO). */
  lastLogin?: string
}

export const DEFAULT_TEAM: TeamMember[] = [
  { id: 'olivier', name: 'Olivier Attia', email: 'olivier@gershonconsulting.com', role: 'admin' },
]

/** The owner's own addresses — always let in as admin, so he can never be locked out. */
export const OWNER_EMAILS = ['olivier@gershonconsulting.com', 'olivier@attia.com', 'oattia@gmail.com']

export async function loadTeam(): Promise<TeamMember[]> {
  try {
    const { data } = await supabaseAdmin().from('app_settings').select('value').eq('key', 'team_members').single()
    if (data?.value) {
      const list = JSON.parse(data.value) as TeamMember[]
      if (Array.isArray(list) && list.length) return list
    }
  } catch { /* fall through */ }
  return DEFAULT_TEAM
}

export async function saveTeam(members: TeamMember[]): Promise<void> {
  const { error } = await supabaseAdmin().from('app_settings')
    .upsert({ key: 'team_members', value: JSON.stringify(members) }, { onConflict: 'key' })
  if (error) throw new Error(error.message)
}

/** Lower-case, accents stripped, single spaces. "Julianà  Ravao" → "juliana ravao". */
export function norm(s: string | null | undefined): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9@.]+/g, ' ').trim()
}

export interface LinkedInIdentity {
  sub: string
  email?: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}

/**
 * Find the Settings member a LinkedIn account belongs to, in order of strength:
 *   1. LinkedIn subject already bound to a member
 *   2. LinkedIn e-mail = member e-mail or member LinkedIn e-mail
 *   3. owner e-mail → the admin named Olivier
 *   4. full name on LinkedIn = member name, and that member has a LinkedIn profile in Settings
 *      and is not yet bound to another LinkedIn account
 */
export function matchMember(team: TeamMember[], li: LinkedInIdentity): TeamMember | null {
  const bySub = team.find(m => m.linkedinSub && m.linkedinSub === li.sub)
  if (bySub) return bySub

  const email = norm(li.email)
  if (email) {
    const byEmail = team.find(m => norm(m.email) === email || (m.linkedinEmail && norm(m.linkedinEmail) === email))
    if (byEmail) return byEmail
    if (OWNER_EMAILS.includes(email)) {
      return team.find(m => m.role === 'admin' && norm(m.name).startsWith('olivier'))
        ?? team.find(m => OWNER_EMAILS.includes(norm(m.email)))
        ?? null
    }
  }

  const liName = norm(li.name || [li.given_name, li.family_name].filter(Boolean).join(' '))
  if (liName) {
    const byName = team.filter(m => !m.linkedinSub && !!m.linkedin && norm(m.name) === liName)
    if (byName.length === 1) return byName[0]
  }
  return null
}

/** Does a task's free-text `assigned_to` belong to this member? ("Olivier" and "Olivier Attia" both count.) */
export function isAssignedTo(member: Pick<TeamMember, 'name' | 'email'>, assignedTo: string | null | undefined): boolean {
  const a = norm(assignedTo)
  if (!a) return false
  const full = norm(member.name)
  const first = full.split(' ')[0]
  const local = norm(member.email).split('@')[0]
  return a === full || a === first || a === norm(member.email) || (!!local && a === local.replace(/\./g, ' '))
}
