// Team dashboard: list of all projects, sorted by most-recently-updated.
// Per spec: only team/admin can see this. Clients get bounced to their project.

import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSessionOptions, type SessionData } from '@/lib/session';
import { resolveTeamRole, canSeeAllProjects } from '@/lib/roles';
import { type ProjectProgressRow } from '@/lib/supabaseServer';
import { getTemplate } from '@/lib/templates';
import AppHeader from '@/components/AppHeader';

export const runtime = 'edge';

export default async function ProjectsPage() {
    const session = await getIronSession<SessionData>(await cookies(), getSessionOptions());
  if (!session.user) redirect('/login');

  const role = resolveTeamRole(session.user.email);
  if (role.kind === 'guest') redirect('/login?error=not_allowlisted');

  // Lazy-import supabaseAdmin so a missing env var gives a clear error message
  // rather than a cryptic server crash.
  let rows: ProjectProgressRow[] | null = null;
  let dbError: string | null = null;

  try {
    const { supabaseAdmin } = await import('@/lib/supabaseServer');

    if (!canSeeAllProjects(role)) {
      // Client — find their project and redirect to it
      const supa = supabaseAdmin();
      const { data } = await supa
        .from('projects')
        .select('id')
        .eq('client_email', session.user.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) redirect(`/projects/${data.id}`);
      redirect('/login?error=not_allowlisted');
    }

    // Team/admin: list everything
    const { data, error } = await supabaseAdmin()
      .from('project_progress')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) dbError = error.message;
    else rows = data as ProjectProgressRow[];
  } catch (e: unknown) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <AppHeader
          title="Projects"
          subtitle="All client engagements across the team"
          actions={[{ href: '/projects/new', label: '+ New Project', tone: 'primary' }]}
          user={{ name: session.user.name, role: role.kind }}
        />

        {dbError && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
            <strong>Database error:</strong> {dbError}
            <p className="mt-1 text-xs text-red-600">Check that SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your Cloudflare Pages environment variables.</p>
          </div>
        )}

        {!dbError && rows && rows.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-300">
            <p className="text-slate-500 mb-4">No projects yet.</p>
            <Link
              href="/projects/new"
              className="inline-block px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
            >
              Create the first one
            </Link>
          </div>
        )}

        {!dbError && rows && rows.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r) => (
              <ProjectCard key={r.project_id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ row }: { row: ProjectProgressRow }) {
  const tpl = getTemplate(row.template_slug);
  const accent = tpl?.color ?? '#6366f1';
  return (
    <li className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <Link href={`/projects/${row.project_id}`} className="block">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: accent }}>
              {tpl?.icon} {tpl?.label ?? row.template_slug}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-1 truncate">{row.company_name}</h2>
          </div>
          <span
            className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor:
                row.status === 'completed' ? '#d1fae5' :
                row.status === 'in_progress' ? '#dbeafe' :
                row.status === 'archived' ? '#e5e7eb' : '#fef3c7',
              color:
                row.status === 'completed' ? '#065f46' :
                row.status === 'in_progress' ? '#1e40af' :
                row.status === 'archived' ? '#374151' : '#92400e',
            }}
          >
            {row.status.replace('_', ' ')}
          </span>
        </div>

        <div className="text-xs text-slate-500 mb-1.5">
          {row.completed_tasks} / {row.total_tasks} tasks done
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${row.percent_complete}%`, backgroundColor: accent }}
          />
        </div>
        <div className="flex items-center justify-between mt-3 text-xs">
          <span className="font-semibold" style={{ color: accent }}>
            {row.percent_complete}%
          </span>
          <span className="text-slate-400">
            Updated {new Date(row.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </Link>
    </li>
  );
}
