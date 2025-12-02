import { NextResponse } from 'next/server';
import {
  getSupabaseEnvStatus,
  getSupabaseAnonClient,
  getSupabaseServiceRoleClient,
  isSchemaMissing,
} from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const envStatus = getSupabaseEnvStatus();

  if (!envStatus.hasUrl || (!envStatus.hasAnonKey && !envStatus.hasServiceRoleKey)) {
    return NextResponse.json(
      {
        ok: false,
        status: 'missing-env',
        details: envStatus,
      },
      { status: 501 }
    );
  }

  const mode = envStatus.hasServiceRoleKey ? 'service-role' : 'anon';

  try {
    const client = envStatus.hasServiceRoleKey
      ? getSupabaseServiceRoleClient()
      : getSupabaseAnonClient();

    // Lightweight connectivity check; if the table does not exist yet we surface that clearly.
    const { data, error } = await client.from('profiles').select('user_id').limit(1);

    if (error) {
      const schemaMissing = isSchemaMissing(error);
      return NextResponse.json(
        {
          ok: false,
          status: schemaMissing ? 'schema-missing' : 'query-error',
          message: error.message,
          details: envStatus,
        },
        { status: schemaMissing ? 503 : 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: 'connected',
      mode,
      rowsSeen: Array.isArray(data) ? data.length : 0,
      details: envStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: 'client-init-error',
        message: error instanceof Error ? error.message : 'Unknown Supabase error',
        details: envStatus,
      },
      { status: 500 }
    );
  }
}
