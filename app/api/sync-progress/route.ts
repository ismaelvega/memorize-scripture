import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

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
  diff?: unknown;
  transcription?: string;
  verseText?: string;
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

  const toDeterministicUuid = (input: string) => {
    const hash = createHash('sha256').update(input).digest('hex');
    // format as UUID v4-ish to satisfy the uuid column; deterministic per input
    return [
      hash.slice(0, 8),
      hash.slice(8, 12),
      '4' + hash.slice(13, 16), // force version 4 nibble
      ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // variant
      hash.slice(20, 32),
    ].join('-');
  };

  try {
    const uniqueDeviceIds = Array.from(
      new Set(
        attempts
          .map(a => a.deviceId)
          .filter((d): d is string => Boolean(d))
      )
    );

    if (uniqueDeviceIds.length) {
      const deviceRows = uniqueDeviceIds.map(id => ({
        device_id: id,
        user_id: userId,
        last_seen_at: new Date().toISOString(),
      }));
      const { error: deviceError } = await client
        .from('devices')
        .upsert(deviceRows, { onConflict: 'device_id' });
      if (deviceError) throw deviceError;
    }

    // Insert attempts idempotently via upsert on attemptId
    if (attempts.length) {
      const attemptRows = attempts.map(a => ({
        id: toDeterministicUuid(a.attemptId || `${a.verseId}-${a.ts}`),
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
        diff: a.diff ?? null,
        transcription: a.transcription,
        verse_text: a.verseText,
      }));

      const { error: attemptsError } = await client
        .from('verse_attempts')
        .upsert(attemptRows, { onConflict: 'id' });

      if (attemptsError) {
        throw attemptsError;
      }

      // Rebuild verse_progress aggregates for affected verse_ids
      const verseIds = Array.from(new Set(attempts.map(a => a.verseId)));
      if (verseIds.length) {
        const { data: aggSource, error: aggError } = await client
          .from('verse_attempts')
          .select('verse_id, mode, accuracy, created_at, translation, reference, source, device_id')
          .eq('user_id', userId)
          .in('verse_id', verseIds);

        if (aggError) throw aggError;

        const progressRows = verseIds.map((vid) => {
          const rows = (aggSource || []).filter(r => r.verse_id === vid);
          if (!rows.length) return null;

          let bestAccuracy = 0;
          let lastAttemptAt = '';
          let totalAttempts = rows.length;
          const perfectCounts: Record<string, { perfectCount: number; completedAt?: number }> = {
            type: { perfectCount: 0 },
            speech: { perfectCount: 0 },
            stealth: { perfectCount: 0 },
            sequence: { perfectCount: 0 },
          };

          let lastDeviceId: string | null = null;

          for (const row of rows) {
            const acc = Number(row.accuracy) || 0;
            if (acc > bestAccuracy) bestAccuracy = acc;
            if (!lastAttemptAt || new Date(row.created_at || 0).getTime() > new Date(lastAttemptAt).getTime()) {
              lastAttemptAt = row.created_at || '';
              lastDeviceId = row.device_id || null;
            }
            if (acc === 100 && perfectCounts[row.mode]) {
              perfectCounts[row.mode].perfectCount += 1;
            }
          }

          return {
            user_id: userId,
            verse_id: vid,
            best_accuracy: bestAccuracy,
            perfect_counts: perfectCounts,
            last_attempt_at: lastAttemptAt || null,
            total_attempts: totalAttempts,
            last_device_id: lastDeviceId,
            source: rows[0]?.source || 'built-in',
            translation: rows[0]?.translation || 'RVR1960',
            reference: rows[0]?.reference || vid,
            updated_at: new Date().toISOString(),
          };
        }).filter(Boolean);

        if (progressRows.length) {
          const { error: progressError } = await client
            .from('verse_progress')
            .upsert(progressRows, { onConflict: 'user_id,verse_id' });
          if (progressError) throw progressError;
        }
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
    console.error('sync-progress error', error);
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as any).message
        : 'sync-failed';
    return NextResponse.json(
      {
        ok: false,
        error: message,
        details: error,
      },
      { status: 500 }
    );
  }
}
