import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getRequestContext } from '@cloudflare/next-on-pages';

// Do NOT cache the client at module level — Cloudflare Workers/Pages edge runtime
// reads env vars lazily per request, and a module-level singleton would capture
// empty values from the initial cold-start before secrets are injected.
export function supabaseAdmin(): SupabaseClient {
    let url: string | undefined;
    let key: string | undefined;
    try {
          // In CF Pages edge runtime, secrets are on the request context env binding,
      // NOT on process.env. This is the correct way to read them.
      const ctx = getRequestContext();
          url = (ctx.env as Record<string, string>).SUPABASE_URL;
          key = (ctx.env as Record<string, string>).SUPABASE_SERVICE_ROLE_KEY;
    } catch {
          // Fallback for local Next.js dev server (process.env works fine there)
      url = process.env.SUPABASE_URL;
          key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    return createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
    });
}

export interface ProjectRow {
    id: string;
    template_slug: string;
    company_name: string;
    client_first_name: string | null;
    client_last_name: string | null;
    client_title: string | null;
    client_email: string;
    client_linkedin_url: string | null;
    client_domain: string | null;
    status: 'planning' | 'in_progress' | 'completed' | 'archived';
    start_date: string | null;
    end_date: string | null;
    created_by_email: string;
    created_at: string;
    updated_at: string;
}

export interface TaskRow {
    id: string;
    project_id: string;
    position: number;
    name: string;
    description: string | null;
    assigned_to: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    due_date: string | null;
    notes: string | null;
    template_item_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectProgressRow {
    project_id: string;
    company_name: string;
    template_slug: string;
    status: string;
    total_tasks: number;
    completed_tasks: number;
    percent_complete: number;
    updated_at: string;
}
