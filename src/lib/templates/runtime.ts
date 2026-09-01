// Runtime template resolution: code-defined templates + admin-created custom
// templates + task overrides + manual display order, all stored in app_settings.
//
// Keys used in app_settings:
//   template_overrides -> { [slug]: { tasks: TemplateTask[] } }   (edits to CODE templates)
//   custom_templates   -> ProcessTemplate[]                        (templates created in the UI)
//   template_order     -> string[] of slugs                        (manual drag order)

import { supabaseAdmin } from '../supabaseServer';
import { TEMPLATES, ALL_TEMPLATES, type ProcessTemplate, type TemplateTask } from './index';

export interface TemplateOverrides {
  [slug: string]: { tasks?: TemplateTask[] };
}

export interface TemplateSettings {
  custom: ProcessTemplate[];
  overrides: TemplateOverrides;
  order: string[];
}

async function loadSetting(key: string): Promise<string | null> {
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from('app_settings').select('value').eq('key', key).single();
    if (error || !data) return null;
    return data.value as string;
  } catch { return null; }
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export async function loadTemplateSettings(): Promise<TemplateSettings> {
  const [ovRaw, customRaw, orderRaw] = await Promise.all([
    loadSetting('template_overrides'),
    loadSetting('custom_templates'),
    loadSetting('template_order'),
  ]);
  const custom = parseJson<ProcessTemplate[]>(customRaw, []);
  return {
    custom: Array.isArray(custom) ? custom : [],
    overrides: parseJson<TemplateOverrides>(ovRaw, {}),
    order: parseJson<string[]>(orderRaw, []),
  };
}

/** Apply task overrides to a code template. Custom templates carry their own tasks. */
export function applyOverride(tpl: ProcessTemplate, overrides: TemplateOverrides): ProcessTemplate {
  const ov = overrides[tpl.slug];
  if (!ov || !Array.isArray(ov.tasks)) return tpl;
  return { ...tpl, tasks: ov.tasks };
}

/** Sort by the saved manual order; anything not listed keeps its natural order at the end. */
export function applyOrder<T extends { slug: string }>(items: T[], order: string[]): T[] {
  if (!order.length) return items;
  const rank = new Map(order.map((slug, i) => [slug, i]));
  return [...items].sort((a, b) => {
    const ra = rank.has(a.slug) ? rank.get(a.slug)! : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.slug) ? rank.get(b.slug)! : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return 0;
  });
}

/**
 * The business templates shown in Settings and in the new-project picker:
 * code templates (with overrides applied) + custom templates, in manual order.
 */
export function buildTemplateList(settings: TemplateSettings): ProcessTemplate[] {
  const codeOnes = TEMPLATES.map(t => applyOverride(t, settings.overrides));
  const customOnes = settings.custom.map(t => applyOverride(t, settings.overrides));
  const bySlug = new Map<string, ProcessTemplate>();
  for (const t of [...codeOnes, ...customOnes]) bySlug.set(t.slug, t);
  return applyOrder([...bySlug.values()], settings.order);
}

export async function loadTemplateList(): Promise<ProcessTemplate[]> {
  return buildTemplateList(await loadTemplateSettings());
}

/**
 * Lookup map for display (labels, icons, colours) covering every template a
 * project row could point at: code + personal + custom.
 */
export async function loadTemplateMap(): Promise<Map<string, ProcessTemplate>> {
  const settings = await loadTemplateSettings();
  const map = new Map<string, ProcessTemplate>();
  for (const t of ALL_TEMPLATES) map.set(t.slug, applyOverride(t, settings.overrides));
  for (const t of settings.custom) map.set(t.slug, applyOverride(t, settings.overrides));
  return map;
}

/** Resolve a single template by slug (code, personal or custom). */
export async function resolveTemplate(slug: string): Promise<ProcessTemplate | undefined> {
  const map = await loadTemplateMap();
  return map.get(slug);
}
