import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { resolveTeamRole, canSeeAllProjects } from '@/lib/roles';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const runtime = 'edge';

export default async function Home() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) redirect('/login');
  const role = resolveTeamRole(session.user.email);
  if (canSeeAllProjects(role)) redirect('/projects');
  const { data } = await supabaseAdmin()
    .from('projects')
    .select('id')
    .eq('client_email', session.user.email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.id) redirect(`/projects/${data.id}`);
  redirect('/login?error=not_allowlisted');
}
