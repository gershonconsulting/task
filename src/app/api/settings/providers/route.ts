export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export interface Provider { id: string; name: string; url?: string; color?: string }

const DEFAULT_PROVIDERS: Provider[] = [
  { id: 'kular', name: 'Kular', url: 'kular.ai', color: '#6366f1' },
  { id: 'straight-in', name: 'Straight-in', url: 'straight-in.com', color: '#0ea5e9' },
  { id: 'textranch', name: 'TextRanch', url: 'textranch.com', color: '#059669' },
]

export async function GET() {
  try {
    const supa = supabaseAdmin()
    const { data } = await supa.from('app_settings').select('value').eq('key', 'providers').single()
    if (data?.value) return NextResponse.json({ providers: JSON.parse(data.value) as Provider[] })
  } catch { /* use defaults */ }
  return NextResponse.json({ providers: DEFAULT_PROVIDERS })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const providers: Provider[] = body.providers ?? []
  const supa = supabaseAdmin()
  await supa.from('app_settings').upsert({ key: 'providers', value: JSON.stringify(providers) }, { onConflict: 'key' })
  return NextResponse.json({ ok: true })
}
