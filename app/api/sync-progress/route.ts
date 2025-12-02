import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type IncomingAttempt = {
  attemptId: string;
  deviceId: string;
  verseId: string;
  mode: 'type' | 'speech' | 'stealth' | 'sequence';
  ts: number;
  accuracy: number;
  inputLength: number;
  missedCount: number;
  extraCount: number;
  speechDuration?: number;
  confidenceScore?: number;
  stealthStats?: unknown;
  sequenceStats?: unknown;
  translation?: string;
  reference?: string;
  source?: 'built-in' | 'custom';
};

type IncomingBody = {
  userId?: string;
  attempts?: IncomingAttempt[];
  savedPassages?: Array<{
    verseId: string;
    start: number;
    end: number;
    savedAt?: number;
    source?: 'built-in' | 'custom';
    translation?: string;
    reference?: string;
    customText?: string;
  }>;
};

export async function POST(req: Request) {
  const body = (await req.json()) as IncomingBody;
  const { attempts = [], savedPassages = [], userId } = body || {};

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'missing-user' }, { status: 400 });
  }

  if (!Array.isArray(attempts) && !Array.isArray(savedPassages)) {
    return NextResponse.json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }

  const client = getSupabaseServiceRoleClient();

  try {
    // Insert attempts idempotently via upsert on attemptId
    if (attempts.length) {
      const attemptRows = attempts.map(a => ({
        id: a.attemptId,
        user_id: userId,
        device_id: a.deviceId,
        verse_id: a.verseId,
        mode: a.mode,
        accuracy: a.accuracy,
        input_length: a.inputLength,
        missed_count: a.missedCount,
        extra_count: a.extraCount,
        speech_duration: a.speechDuration,
        confidence_score: a.confidenceScore,
        stealth_stats: a.stealthStats,
        sequence_stats: a.sequenceStats,
        source: a.source || 'built-in',
        translation: a.translation,
        reference: a.reference,
        created_at: new Date(a.ts).toISOString(),
      }));

      const { error: attemptsError } = await client
        .from('verse_attempts')
        .upsert(attemptRows, { onConflict: 'id' });

      if (attemptsError) {
        throw attemptsError;
      }
    }

    // Upsert saved passages
    if (savedPassages.length) {
      const savedRows = savedPassages.map(s => ({
        user_id: userId,
        verse_id: s.verseId,
        start: s.start,
        end: s.end,
        saved_at: s.savedAt ? new Date(s.savedAt).toISOString() : new Date().toISOString(),
        source: s.source || 'built-in',
        translation: s.translation,
        reference: s.reference,
        custom_text: s.customText,
      }));

      const { error: savedError } = await client
        .from('saved_passages')
        .upsert(savedRows, { onConflict: 'user_id,verse_id' });

      if (savedError) {
        throw savedError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'sync-failed',
      },
      { status: 500 }
    );
  }
}
