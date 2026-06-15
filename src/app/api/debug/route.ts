import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET() {
  let url: string | undefined;
  let key: string | undefined;
  try {
    const ctx = getRequestContext();
    url = (ctx.env as Record<string, string>).SUPABASE_URL;
    key = (ctx.env as Record<string, string>).SUPABASE_SERVICE_ROLE_KEY;
  } catch {
    url = process.env.SUPABASE_URL;
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  return NextResponse.json({
    supabase_url_length: url?.length ?? 0,
    supabase_url_prefix: url?.substring(0, 30) ?? 'MISSING',
    supabase_url_valid: url?.startsWith('https://') ?? false,
    key_length: key?.length ?? 0,
    key_prefix: key?.substring(0, 8) ?? 'MISSING',
  });
}
