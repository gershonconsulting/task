import Link from 'next/link';
import pkg from '../../../package.json';

export const runtime = 'edge';

const ERROR_MESSAGES: Record<string, string> = {
  not_allowlisted: 'Your LinkedIn account is not on the allowlist for this app.',
  bad_state: 'Sign-in session expired. Please try again.',
  no_session: 'Sign-in completed but no session was created.',
};

function errorText(code: string | undefined): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? 'Sign-in failed. Please try again.';
}

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; as?: string }>;
}) {
  const sp = await props.searchParams;
  const message = errorText(sp.error);
  const teamHref = '/api/auth/linkedin/login?as=team';
  const clientHref = '/api/auth/linkedin/login?as=client';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-600 font-bold">Gershon Consulting</p>
            <h1 className="text-3xl font-light text-slate-900 mt-2">Task Manager</h1>
            <p className="text-sm text-slate-500 mt-2">Pick how you would like to sign in.</p>
          </div>
          {message && (
            <div className="mb-5 p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-800">
              {message}
            </div>
          )}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-3">
            <a href={teamHref} className="block w-full text-center px-4 py-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">Login as Team</a>
            <a href={clientHref} className="block w-full text-center px-4 py-3 rounded-md bg-white border-2 border-indigo-600 hover:bg-indigo-50 text-indigo-700 text-sm font-semibold transition-colors">Login as Client</a>
            <p className="text-xs text-slate-500 text-center pt-2">Both use LinkedIn to verify your identity.</p>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600">Back home</Link>
            <span className="mx-2">·</span>
            <span>v{pkg.version}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
