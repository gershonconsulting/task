// Role assignment. Per FEATURE-SPECIFICATION.
export type UserRole =
  | { kind: 'admin' }
  | { kind: 'team' }
  | { kind: 'client'; projectId: string; slug?: string }
  | { kind: 'guest' };

const TEAM_EMAILS = new Set<string>([
  'olivier@gershonconsulting.com',
  'olivier@attia.com',
  'winnie.lauren@gershonconsulting.com',
  'aina.rama@gershonconsulting.com',
].map(e => e.toLowerCase()));

const ADMIN_EMAILS = new Set<string>([
  'olivier@gershonconsulting.com',
  'olivier@attia.com',
].map(e => e.toLowerCase()));

export function isTeamEmail(email?: string | null): boolean {
  return !!email && TEAM_EMAILS.has(email.trim().toLowerCase());
}
export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function resolveTeamRole(email?: string | null): UserRole {
  if (isAdminEmail(email)) return { kind: 'admin' };
  if (isTeamEmail(email)) return { kind: 'team' };
  return { kind: 'guest' };
}

export function canSeeAllProjects(r: UserRole): boolean { return r.kind === 'admin' || r.kind === 'team'; }
export function canCreateProject(r: UserRole): boolean { return r.kind === 'admin' || r.kind === 'team'; }
export function canDeleteProject(r: UserRole): boolean { return r.kind === 'admin'; }
export function canDeleteTask(r: UserRole): boolean { return r.kind === 'admin' || r.kind === 'team'; }
export function canReassignTask(r: UserRole): boolean { return r.kind === 'admin' || r.kind === 'team'; }
export function canUpdateTaskStatus(r: UserRole): boolean { return r.kind !== 'guest'; }
export function canSeeProject(r: UserRole, projectId: string): boolean {
  if (r.kind === 'admin' || r.kind === 'team') return true;
  if (r.kind === 'client' && r.projectId === projectId) return true;
  return false;
}
