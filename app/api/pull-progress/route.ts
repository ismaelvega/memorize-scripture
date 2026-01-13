import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { getUserIdFromRequest } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const since = url.searchParams.get('since');

  const authedUserId = await getUserIdFromRequest();
  if (!authedUserId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const userId = authedUserId;

  const sinceDate = since ? new Date(Number(since)).toISOString() : undefined;
  const client = getSupabaseServiceRoleClient();

  try {
    const progressQuery = client
      .from('verse_progress')
      .select('verse_id, best_accuracy, perfect_counts, last_attempt_at, total_attempts, source, translation, reference, last_device_id, updated_at, deleted_at, last_reset_at')
      .eq('user_id', userId);

    const savedQuery = client
      .from('saved_passages')
      .select('verse_id, start, end, saved_at, updated_at, deleted_at, source, translation, reference, custom_text')
      .eq('user_id', userId);

    if (sinceDate) {
      progressQuery.gte('updated_at', sinceDate);
      savedQuery.gte('updated_at', sinceDate);
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
