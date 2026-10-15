import { norm, OWNER_EMAILS, type TeamMember } from '@/lib/team'
import { siteUrl } from '@/lib/site'

export interface AdminUser extends Omit<TeamMember, 'linkedinSub' | 'inviteToken'> {
  linkedinLinked: boolean
  inviteUrl?: string
  owner: boolean
}

export function toAdminUser(m: TeamMember): AdminUser {
  const { linkedinSub, inviteToken, ...rest } = m
  return {
    ...rest,
    linkedinLinked: !!linkedinSub,
    inviteUrl: inviteToken && !linkedinSub ? `${siteUrl()}/login?invite=${inviteToken}` : undefined,
    owner: OWNER_EMAILS.includes(norm(m.email)) || OWNER_EMAILS.includes(norm(m.linkedinEmail)),
  }
}

export function newToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

