import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
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
