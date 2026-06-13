'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { resolveTeamRole, canCreateProject } from '@/lib/roles';
import { createProjectFromTemplate } from '@/lib/projectCreate';
import { getTemplate } from '@/lib/templates';

export interface CreateActionResult {
  ok: boolean;
  error?: string;
}

export async function createProjectAction(
  _prevState: CreateActionResult | undefined,
  formData: FormData,
): Promise<CreateActionResult> {
  // 1. Auth
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) return { ok: false, error: 'Not signed in.' };
  const role = resolveTeamRole(session.user.email);
  if (!canCreateProject(role)) return { ok: false, error: 'Not authorized to create projects.' };

  // 2. Read form fields
  const templateSlug = String(formData.get('templateSlug') ?? '').trim();
  const companyName  = String(formData.get('companyName')  ?? '').trim();
  const clientEmail  = String(formData.get('clientEmail')  ?? '').trim();
  const clientLinkedinUrl = String(formData.get('clientLinkedinUrl') ?? '').trim();
  const clientFirstName   = String(formData.get('clientFirstName')   ?? '').trim();
  const clientLastName    = String(formData.get('clientLastName')    ?? '').trim();
  const clientTitle       = String(formData.get('clientTitle')       ?? '').trim();
  const clientDomain      = String(formData.get('clientDomain')      ?? '').trim();
  const startDate         = String(formData.get('startDate')         ?? '').trim() || undefined;
  const endDate           = String(formData.get('endDate')           ?? '').trim() || undefined;

  // 3. Validate
  if (!templateSlug || !getTemplate(templateSlug)) return { ok: false, error: 'Pick a template.' };
  if (!companyName)  return { ok: false, error: 'Project name is required.' };
  if (!clientEmail)  return { ok: false, error: 'Client email is required (used to match them at login).' };
  // LinkedIn URL stays optional — clients are matched by email at /login time

  // 4. Create
  let result;
  try {
    result = await createProjectFromTemplate({
      templateSlug,
      companyName,
      clientEmail,
      clientLinkedinUrl,
      clientFirstName: clientFirstName || undefined,
      clientLastName:  clientLastName  || undefined,
      clientTitle:     clientTitle     || undefined,
      clientDomain:    clientDomain    || undefined,
      startDate,
      endDate,
      createdByEmail: session.user.email,
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  revalidatePath('/projects');
  redirect(`/projects/${result.projectId}`);
}
