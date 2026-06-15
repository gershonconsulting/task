import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getSessionOptions, type SessionData } from '@/lib/session';
import { resolveTeamRole, canSeeAllProjects } from '@/lib/roles';

export const runtime = 'edge';

export default async function Home() {
    const session = await getIronSession<SessionData>(await cookies(), getSessionOptions());
  if (!session.user) redirect('/login');
  const role = resolveTeamRole(session.user.email);
  if (canSeeAllProjects(role)) redirect('/projects');
  // Clients + guests go to /projects which will handle the DB lookup and redirect
  redirect('/projects');
}
