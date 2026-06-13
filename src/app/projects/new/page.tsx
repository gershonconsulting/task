// "New Project" page — template picker + client info form.
// Team/admin only. Calls the Server Action in ./actions.ts.

import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { resolveTeamRole, canCreateProject } from '@/lib/roles';
import AppHeader from '@/components/AppHeader';
import NewProjectForm from './NewProjectForm';

export const runtime = 'edge';

export default async function NewProjectPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) redirect('/login');
  const role = resolveTeamRole(session.user.email);
  if (!canCreateProject(role)) redirect('/login?error=not_allowlisted');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <AppHeader
          title="New Project"
          subtitle="Pick a template and fill in client info — tasks auto-populate"
          back={{ href: '/projects', label: 'Projects' }}
          user={{ name: session.user.name, role: role.kind }}
        />
        <NewProjectForm />
      </div>
    </div>
  );
}
