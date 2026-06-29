'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TEMPLATES, type ProcessTemplate, type ProjectType } from '@/lib/templates';

const PROJECT_TYPES: { value: ProjectType; label: string; description: string; icon: string }[] = [
  {
    value: 'simple',
    label: 'Simple',
    icon: '📋',
    description: 'Single user. Add tasks manually as you go. No due dates required.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    icon: '📅',
    description: 'Multiple assignees with target dates. Best for team workflows.',
  },
  {
    value: 'complex',
    label: 'Complex',
    icon: '🗂️',
    description: 'Full configuration: custom fields, priorities, tools, and milestones.',
  },
];

const CATEGORY_META: Record<string, { hint: string }> = {
  'Setup & Lifecycle': { hint: 'Run once per client engagement.' },
  'Monthly Recurring': { hint: 'Auto-created every month.' },
  'Onboarding': { hint: 'One-time service setup for a client.' },
  'Billing': { hint: 'Finance side of the engagement.' },
  'People & Partners': { hint: 'Internal team & external partner onboarding.' },
  'Grants': { hint: 'Grant application and reporting.' },
};
const CATEGORY_ORDER = ['Setup & Lifecycle', 'Monthly Recurring', 'Onboarding', 'Billing', 'People & Partners', 'Grants'];

function groupedTemplates(): { label: string; hint: string; items: ProcessTemplate[] }[] {
  const grouped: Record<string, ProcessTemplate[]> = {};
  for (const t of TEMPLATES) {
    const cat = t.category ?? 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  }
  return CATEGORY_ORDER
    .filter(cat => grouped[cat]?.length)
    .map(cat => ({ label: cat, hint: CATEGORY_META[cat]?.hint ?? '', items: grouped[cat] }));
}

interface ExistingClient { id: string; name: string; email: string }

const ONBOARD_SERVICES = [
  { slug: 'social-content-creation-onboarding', label: 'Social Content Creation', code: 'PROMOTE' },
  { slug: 'social-selling-onboarding', label: 'Social Selling', code: 'NETWORK' },
  { slug: 'lead-generation-onboarding', label: 'Lead Generation', code: 'ENGAGE' },
]

export default function NewProjectForm() {
  const router = useRouter();
  const [projectType, setProjectType] = useState<ProjectType>('advanced');
  const [templateSlug, setTemplateSlug] = useState<string>('client-onboarding');
  const [clientMode, setClientMode] = useState<'new' | 'existing'>('new');
  const [onboardMode, setOnboardMode] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>(ONBOARD_SERVICES.map(s => s.slug));
  const [existingClients, setExistingClients] = useState<ExistingClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [showMore, setShowMore] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ projectId: string; tempPassword?: string } | null>(null);

  const groups = groupedTemplates();
  const selected = TEMPLATES.find(t => t.slug === templateSlug);

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(data => {
      if (data.clients?.length) setExistingClients(data.clients);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => { body[k] = String(v); });
    body.templateSlug = templateSlug;
    body.projectType = projectType;
    if (clientMode === 'existing') body.clientEmail = selectedClientId;
    if (onboardMode) {
      if (selectedServices.length === 0) { setError('Pick at least one service.'); setPending(false); return; }
      let tempPwd: string | undefined; let firstId: string | undefined;
      try {
        for (const slug of selectedServices) {
          const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, templateSlug: slug, projectType: undefined }) });
          const d = await r.json();
          if (!r.ok || !d.ok) { setError(d.error ?? 'Failed to create project.'); setPending(false); return; }
          if (!firstId) firstId = d.projectId;
          if (d.tempPassword) tempPwd = d.tempPassword;
        }
        if (tempPwd && firstId) setSuccessInfo({ projectId: firstId, tempPassword: tempPwd });
        else router.push('/projects');
      } catch { setError('Network error.'); } finally { setPending(false); }
      return;
    }
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.tempPassword) {
          setSuccessInfo({ projectId: data.projectId, tempPassword: data.tempPassword });
        } else {
          router.push('/projects/' + data.projectId);
        }
      } else {
        setError(data.error ?? 'Failed to create project.');
      }
    } catch { setError('Network error.'); } finally { setPending(false); }
  }

  if (successInfo) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Project created!</h2>
        {successInfo.tempPassword && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">Client login credentials</p>
            <p className="text-xs text-amber-700 mb-3">Share with client. They must change password on first login.</p>
            <div className="font-mono text-sm bg-white border border-amber-300 rounded-md p-3 space-y-1">
              <div>URL: <strong>task.gershoncrm.com/login</strong> (Client tab)</div>
              <div>Password: <strong className="text-indigo-700 text-base">{successInfo.tempPassword}</strong></div>
            </div>
            <button type="button" onClick={() => navigator.clipboard.writeText(successInfo.tempPassword!)}
              className="mt-2 text-xs text-amber-700 underline">Copy password</button>
          </div>
        )}
        <button onClick={() => router.push('/projects/' + successInfo.projectId)}
          className="w-full px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
          Go to project →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Mode toggle */}
<div className='bg-white rounded-lg border border-slate-200 p-5 shadow-sm'>
  <div className='flex gap-1 bg-slate-100 rounded-lg p-1 w-fit'>
    <button type='button' onClick={() => setOnboardMode(false)} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${!onboardMode ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>One project</button>
    <button type='button' onClick={() => setOnboardMode(true)} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${onboardMode ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Onboard new client (3 services)</button>
  </div>
</div>

{onboardMode && (
  <fieldset className='bg-white rounded-lg border border-slate-200 p-5 shadow-sm'>
    <legend className='px-2 text-xs uppercase tracking-wider font-bold text-indigo-700'>Services to set up</legend>
    <p className='text-xs text-slate-500 mt-1 mb-3'>All three are selected by default. Uncheck any you do not want — one onboarding project is created per service.</p>
    <div className='space-y-2'>
      {ONBOARD_SERVICES.map(s => {
        const checked = selectedServices.includes(s.slug)
        return (
          <label key={s.slug} className={`flex items-center gap-3 p-3 rounded-md border-2 cursor-pointer transition ${checked ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <input type='checkbox' checked={checked} onChange={() => setSelectedServices(prev => prev.includes(s.slug) ? prev.filter(x => x !== s.slug) : [...prev, s.slug])} className='w-4 h-4 accent-indigo-600' />
            <span className='font-semibold text-sm text-slate-900'>{s.label}</span>
            <span className='ml-auto text-[10px] font-bold tracking-wider text-slate-400'>{s.code}</span>
          </label>
        )
      })}
    </div>
  </fieldset>
)}

{!onboardMode && (<>
{/* Step 1: Project type */}
      <fieldset className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <legend className="px-2 text-xs uppercase tracking-wider font-bold text-indigo-700">1. Project type</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {PROJECT_TYPES.map(pt => {
            const sel = pt.value === projectType;
            return (
              <button key={pt.value} type="button" onClick={() => setProjectType(pt.value)}
                className={`text-left p-4 rounded-md border-2 transition ${sel ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{pt.icon}</span>
                  <span className="font-semibold text-sm text-slate-900">{pt.label}</span>
                </div>
                <div className="text-xs text-slate-500">{pt.description}</div>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Step 2: Pick a template */}
      <fieldset className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <legend className="px-2 text-xs uppercase tracking-wider font-bold text-indigo-700">2. Pick a template</legend>
        <div className="space-y-5 mt-2">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{g.label}</h3>
                <p className="text-[11px] text-slate-400">{g.hint}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {g.items.map((t) => {
                  const sel = t.slug === templateSlug;
                  return (
                    <button key={t.slug} type="button" onClick={() => setTemplateSlug(t.slug)}
                      className={`text-left p-3 rounded-md border-2 transition ${sel ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{t.icon}</span>
                        <span className="font-semibold text-sm text-slate-900">{t.label}</span>
                        {t.projectType && (
                          <span className="ml-auto text-[10px] text-slate-400 capitalize">{t.projectType}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{t.tasks.length} tasks</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      </>)}

{/* Step 3: Client */}
      <fieldset className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <legend className="px-2 text-xs uppercase tracking-wider font-bold text-indigo-700">3. Client</legend>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-4 mt-2 w-fit">
          <button type="button" onClick={() => setClientMode('new')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${clientMode === 'new' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
            New client
          </button>
          <button type="button" onClick={() => setClientMode('existing')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition ${clientMode === 'existing' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
            Existing client
          </button>
        </div>
        {clientMode === 'existing' ? (
          <div className="space-y-3">
            {existingClients.length === 0
              ? <p className="text-sm text-slate-400 italic">No existing clients yet.</p>
              : (
                <label className="block">
                  <span className="block text-xs font-semibold text-slate-700 mb-1">Select client</span>
                  <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} required
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="">— Pick a client —</option>
                    {existingClients.map(c => (
                      <option key={c.email} value={c.email}>{c.name || c.email} ({c.email})</option>
                    ))}
                  </select>
                </label>
              )
            }
            <Field name="companyName" label="Project name *" placeholder="e.g. TechFlow — Monthly Report" required />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field name="companyName" label="Project name *" placeholder="e.g. TechFlow Inc." required />
            <Field name="clientEmail" label="Client email *" type="email" required />
            <Field name="clientFirstName" label="First name" />
            <Field name="clientLastName" label="Last name" />
            <button type="button" onClick={() => setShowMore(v => !v)}
              className="sm:col-span-2 text-xs text-indigo-600 hover:text-indigo-800 text-left">
              {showMore ? '× Hide optional details' : '+ Add optional details'}
            </button>
            {showMore && (
              <>
                <Field name="clientTitle" label="Title" />
                <Field name="clientLinkedinUrl" label="LinkedIn URL" />
                <Field name="clientDomain" label="Domain" />
                <div />
                <Field name="startDate" label="Start date" type="date" />
                <Field name="endDate" label="End date" type="date" />
              </>
            )}
          </div>
        )}
      </fieldset>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}
      <div className="flex items-center justify-between">
        <a href="/projects" className="text-sm text-slate-500 hover:text-slate-700">← Cancel</a>
        <button type="submit"
          disabled={pending || (clientMode === 'existing' && !selectedClientId) || (onboardMode && selectedServices.length === 0)}
          className="px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold">
          {pending ? 'Creating…' : onboardMode ? `Onboard client — ${selectedServices.length} project${selectedServices.length !== 1 ? 's' : ''}` : `Create — ${selected?.tasks.length ?? 0} tasks (${projectType})`}
        </button>
      </div>
    </form>
  );
}

function Field({ name, label, type = 'text', placeholder, required }: {
  name: string; label: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required}
        className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
    </label>
  );
}
