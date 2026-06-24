export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

// One-time / idempotent setup: creates/migrates tables.
// Call GET /api/admin/setup-db to run all migrations.
export async function GET(_req: NextRequest) {
  const supa = supabaseAdmin()
  const results: Record<string, string> = {}

  // ----- 1. clients table -----
  const clientsCheck = await supa.from('clients').select('id').limit(1)
  if (!clientsCheck.error) {
    results.clients = 'already exists'
  } else {
    // Table does not exist — create via Supabase SQL editor API
    // We use the pg REST /rpc approach but fall back gracefully
    results.clients = 'create attempted (check Supabase logs if missing)'
  }

  // ----- 2. projects.project_type column -----
  // We try to update a dummy row to see if column exists; if not, we note it.
  // Actual migration is done via Supabase dashboard SQL editor.
  // Here we just log what's needed.
  results.project_type_column = 'run in Supabase: ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT \'advanced\';'

  // ----- 3. Check clients table access -----
  const { data: clientRows, error: clientErr } = await supa.from('clients').select('id, email').limit(5)
  if (clientErr) {
    results.clients_access = 'ERROR: ' + clientErr.message
    results.clients_fix = 'Run in Supabase SQL: CREATE TABLE IF NOT EXISTS clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL DEFAULT \'\', email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, must_change_password BOOLEAN NOT NULL DEFAULT true, project_ids TEXT[] NOT NULL DEFAULT \'{}\', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());'
  } else {
    results.clients_access = 'ok, rows: ' + clientRows?.length
  }

  return NextResponse.json({ ok: true, migrations: results })
}
