export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

// One-time setup: creates clients table. Call GET /api/admin/setup-db once then remove.
export async function GET(req: NextRequest) {
  const supa = supabaseAdmin()

  // Create clients table using Supabase's raw RPC (postgres function)
  // Since we can't run raw SQL via the JS client directly, we use the REST API
  const supaUrl = (supa as any).supabaseUrl ?? ''
  const supaKey = (supa as any).supabaseKey ?? ''

  // Use fetch to run SQL via Supabase's postgres REST endpoint
  const sql = `
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN NOT NULL DEFAULT true,
      project_ids TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS clients_email_idx ON clients(email);
  `

  try {
    const res = await fetch(supaUrl + '/rest/v1/rpc/exec_sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + supaKey,
        'apikey': supaKey,
      },
      body: JSON.stringify({ sql }),
    })
    const body = await res.text()
    if (!res.ok) {
      // Try alternative: select from clients to see if it exists
      const check = await supa.from('clients').select('id').limit(1)
      if (!check.error) return NextResponse.json({ ok: true, msg: 'clients table already exists', rows: check.data })
      return NextResponse.json({ error: 'RPC failed', status: res.status, body, checkErr: check.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true, msg: 'clients table created', body })
  } catch (e) {
    // Try to check if table exists already
    const check = await supa.from('clients').select('id').limit(1)
    if (!check.error) return NextResponse.json({ ok: true, msg: 'clients table exists', rows: check.data })
    return NextResponse.json({ error: String(e), checkErr: check.error?.message }, { status: 500 })
  }
}
