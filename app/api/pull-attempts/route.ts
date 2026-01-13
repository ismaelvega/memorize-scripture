import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { getUserIdFromRequest } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const verseId = url.searchParams.get('verseId');
  const limitParam = url.searchParams.get('limit');

  if (!verseId) {
    return NextResponse.json({ ok: false, error: 'missing-params' }, { status: 400 });
  }

  const authedUserId = await getUserIdFromRequest();
  if (!authedUserId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const userId = authedUserId;

  let limit = 50;
  if (limitParam) {
    const parsed = Number(limitParam);
    if (Number.isFinite(parsed)) {
      limit = Math.max(1, Math.min(200, Math.floor(parsed)));
    }
  }

  const client = getSupabaseServiceRoleClient();

  try {
    const { data: progressMeta, error: metaError } = await client
      .from('verse_progress')
      .select('last_reset_at')
      .eq('user_id', userId)
      .eq('verse_id', verseId)
      .maybeSingle();

    if (metaError) throw metaError;

    const attemptsQuery = client
      .from('verse_attempts')
      .select('id, mode, accuracy, missed_count, extra_count, created_at, diff, transcription, speech_duration, confidence_score, stealth_stats, sequence_stats, reference, translation, source, verse_text')
      .eq('user_id', userId)
      .eq('verse_id', verseId);

    if (progressMeta?.last_reset_at) {
      attemptsQuery.gte('created_at', progressMeta.last_reset_at);
    }

    const { data, error } = await attemptsQuery
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ ok: true, attempts: data || [] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'pull-failed' },
      { status: 500 }
    );
  }
}
