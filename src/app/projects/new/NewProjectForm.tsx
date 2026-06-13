'use client';

import { useActionState, useState } from 'react';
import { createProjectAction, type CreateActionResult } from './actions';
import { TEMPLATES, type ProcessTemplate } from '@/lib/templates';

// "Smart" grouping: 4 lifecycle buckets that map to how Olivier thinks about
// engagements. Default selection is Client Onboarding (top of the first group).
const GROUPS: { label: string; hint: string; slugs: string[] }[] = [
  {
    label: 'Setup & Lifecycle',
    hint: 'Run once per client engagement.',
    slugs: ['client-onboarding', 'end-of-project'],
  },
  {
    label: 'Monthly Deliverables',
    hint: 'Recurring service delivery — instantiate a new project each cycle.',
    slugs: ['monthly-report', 'social-content-creation', 'social-selling', 'lead-generation', 'market-research'],
  },
  {
    label: 'Billing',
    hint: 'Finance side of the engagement.',
    slugs: ['facturation'],
  },
  {
    label: 'People & Partners',
    hint: 'Internal team & external partner onboarding.',
    slugs: ['staff-onboarding', 'onboarding-partner'],
  },
];

function groupedTemplates(): { label: string; hint: string; items: ProcessTemplate[] }[] {
  const bySlug = new Map(TEMPLATES.map(t => [t.slug, t]));
  return GROUPS.map(g => ({
    label: g.label,
    hint: g.hint,
    items: g.slugs.map(s => bySlug.get(s)).filter(Boolean) as ProcessTemplate[],
  })).filter(g => g.items.length > 0);
}

export default function NewProjectForm() {
  const [state, formAction, pending] = useActionState<CreateActionResult | undefined, FormData>(
    createProjectAction,
    undefined,
  );
  const [templateSlug, setTemplateSlug] = useState<string>('client-onboarding');
  const [showMore, setShowMore] = useState(false);

  const groups = groupedTemplates();
  const selected = TEMPLATES.find(t => t.slug === templateSlug);

  return (
    <form action={formAction} className="space-y-6">
      {/* Step 1 — grouped template picker */}
      <fieldset className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <legend className="px-2 text-xs uppercase tracking-wider font-bold text-indigo-700">
          1. Pick a template
        </legend>
        <input type="hidden" name="templateSlug" value={templateSlug} />
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
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => setTemplateSlug(t.slug)}
                      className={`text-left p-3 rounded-md border-2 transition ${sel ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{t.icon}</span>
                        <span className="font-semibold text-sm text-slate-900">{t.label}</span>
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

      {/* Step 2 — minimal client info: name + email */}
      <fieldset className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <legend className="px-2 text-xs uppercase tracking-wider font-bold text-indigo-700">
          2. Name & email
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <Field name="companyName" label="Project name *" placeholder={selected?.label === 'Client Onboarding' ? 'e.g. TechFlow Inc.' : 'e.g. TechFlow — May 2026'} required />
          <Field name="clientEmail" label="Client email *" type="email" required />
        </div>

        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          className="mt-4 text-xs text-indigo-600 hover:text-indigo-800"
        >
          {showMore ? '× Hide optional details' : '+ Add optional details (contact, dates, LinkedIn URL)'}
        </button>

        {showMore && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
            <Field name="clientFirstName" label="First name" />
            <Field name="clientLastName"  label="Last name" />
            <Field name="clientTitle"     label="Title" />
            <Field name="clientLinkedinUrl" label="LinkedIn URL" placeholder="linkedin.com/in/…" />
            <Field name="clientDomain"    label="Domain" placeholder="example.com" />
            <div />
            <Field name="startDate" label="Start date (defaults to today)" type="date" />
            <Field name="endDate"   label="End date" type="date" />
          </div>
        )}
      </fieldset>

      {state?.error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <a href="/projects" className="text-sm text-slate-500 hover:text-slate-700">← Cancel</a>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold"
        >
          {pending ? 'Creating…' : `Create — ${selected?.tasks.length ?? 0} tasks`}
        </button>
      </div>
    </form>
  );
}

function Field({
  name, label, type = 'text', placeholder, required,
}: { name: string; label: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </label>
  );
}
