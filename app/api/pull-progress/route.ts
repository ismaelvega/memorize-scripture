import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const since = url.searchParams.get('since');

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'missing-user' }, { status: 400 });
  }

  const sinceDate = since ? new Date(Number(since)).toISOString() : undefined;
  const client = getSupabaseServiceRoleClient();

  try {
    const progressQuery = client
      .from('verse_progress')
      .select('verse_id, best_accuracy, perfect_counts, last_attempt_at, total_attempts, source, translation, reference, last_device_id, updated_at')
      .eq('user_id', userId);

    const savedQuery = client
      .from('saved_passages')
      .select('verse_id, start, end, saved_at, source, translation, reference, custom_text')
      .eq('user_id', userId);

    if (sinceDate) {
      progressQuery.gte('updated_at', sinceDate);
      savedQuery.gte('saved_at', sinceDate);
    }

    const [{ data: progress, error: progressError }, { data: saved, error: savedError }] =
      await Promise.all([progressQuery, savedQuery]);

    if (progressError) throw progressError;
    if (savedError) throw savedError;

    return NextResponse.json({
      ok: true,
      progress: progress || [],
      savedPassages: saved || [],
      since,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'pull-failed',
      },
      { status: 500 }
    );
  }
}
