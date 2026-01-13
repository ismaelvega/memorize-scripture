import { NextResponse } from 'next/server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { getUserIdFromRequest } from '@/lib/auth-server';
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
  removedProgress?: Array<{
    verseId: string;
    removedAt?: number;
  }>;
  resetProgress?: Array<{
    verseId: string;
    resetAt?: number;
  }>;
  removedSaved?: Array<{
    verseId: string;
    removedAt?: number;
  }>;
};

function normalizeVerseId(rawId: string) {
  let id = rawId;
  if (id.endsWith('-es')) {
    id = `${id.slice(0, -3)}rv1960`;
  } else if (id.endsWith('rv1960') && !id.endsWith('-rv1960')) {
    const without = id.slice(0, -6);
    id = `${without}-rv1960`;
  } else if (!id.endsWith('-rv1960')) {
    id = `${id}-rv1960`;
  }
  return id;
}

export async function POST(req: Request) {
  const body = (await req.json()) as IncomingBody;
  const {
    attempts = [],
    savedPassages = [],
    removedProgress = [],
    resetProgress = [],
    removedSaved = [],
    userId: bodyUserId,
  } = body || {};
  const authedUserId = await getUserIdFromRequest();
  if (!authedUserId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (bodyUserId && bodyUserId !== authedUserId) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const userId = authedUserId;

  if (
    !Array.isArray(attempts) ||
    !Array.isArray(savedPassages) ||
    !Array.isArray(removedProgress) ||
    !Array.isArray(resetProgress) ||
    !Array.isArray(removedSaved)
  ) {
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
    const resetAtByVerse = new Map<string, number>();
    for (const entry of resetProgress) {
      if (!entry?.verseId) continue;
      const verseId = normalizeVerseId(entry.verseId);
      const resetAt = entry.resetAt ?? Date.now();
      const existing = resetAtByVerse.get(verseId) ?? 0;
      resetAtByVerse.set(verseId, Math.max(existing, resetAt));
    }

    if (resetAtByVerse.size) {
      const resetRows = Array.from(resetAtByVerse.entries()).map(([verseId, resetAt]) => ({
        user_id: userId,
        verse_id: verseId,
        best_accuracy: 0,
        perfect_counts: {
          type: { perfectCount: 0 },
          speech: { perfectCount: 0 },
          stealth: { perfectCount: 0 },
          sequence: { perfectCount: 0 },
        },
        last_attempt_at: null,
        total_attempts: 0,
        last_device_id: null,
        last_reset_at: new Date(resetAt).toISOString(),
        deleted_at: null,
        updated_at: new Date(resetAt).toISOString(),
      }));
      const { error: resetError } = await client
        .from('verse_progress')
        .upsert(resetRows, { onConflict: 'user_id,verse_id' });
      if (resetError) throw resetError;
    }

    if (removedProgress.length) {
      const removedRows = removedProgress
        .filter((entry) => entry?.verseId)
        .map((entry) => {
          const removedAt = entry.removedAt ?? Date.now();
          const removedAtIso = new Date(removedAt).toISOString();
          return {
            user_id: userId,
            verse_id: normalizeVerseId(entry.verseId),
            deleted_at: removedAtIso,
            updated_at: removedAtIso,
            last_reset_at: removedAtIso,
          };
        });
      if (removedRows.length) {
        const { error: removedError } = await client
          .from('verse_progress')
          .upsert(removedRows, { onConflict: 'user_id,verse_id' });
        if (removedError) throw removedError;
      }
    }

    if (removedSaved.length) {
      const verseIds = removedSaved
        .filter((entry) => entry?.verseId)
        .map((entry) => normalizeVerseId(entry.verseId));
      if (verseIds.length) {
        const removedAt = new Date().toISOString();
        const { error: removedSavedError } = await client
          .from('saved_passages')
          .update({ deleted_at: removedAt, updated_at: removedAt })
          .eq('user_id', userId)
          .in('verse_id', verseIds);
        if (removedSavedError) throw removedSavedError;
      }
    }

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
      const attemptRows = attempts.map(a => {
        const normalizedVerseId = normalizeVerseId(a.verseId);
        const translation = a.translation === 'ES' ? 'RVR1960' : (a.translation || 'RVR1960');
        return {
          id: toDeterministicUuid(a.attemptId || `${normalizedVerseId}-${a.ts}`),
          user_id: userId,
          device_id: a.deviceId,
          verse_id: normalizedVerseId,
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
          translation,
          reference: a.reference,
          created_at: new Date(a.ts).toISOString(),
          diff: a.diff ?? null,
          transcription: a.transcription,
          verse_text: a.verseText,
        };
      });

      const { error: attemptsError } = await client
        .from('verse_attempts')
        .upsert(attemptRows, { onConflict: 'id', ignoreDuplicates: true });

      if (attemptsError) {
        throw attemptsError;
      }

      // Rebuild verse_progress aggregates for affected verse_ids
      const verseIds = Array.from(new Set(attemptRows.map(a => a.verse_id)));
      if (verseIds.length) {
        const { data: progressMeta, error: metaError } = await client
          .from('verse_progress')
          .select('verse_id, last_reset_at, translation, reference, source')
          .eq('user_id', userId)
          .in('verse_id', verseIds);

        if (metaError) throw metaError;

        const resetAtById = new Map<string, number>();
        for (const row of progressMeta || []) {
          if (!row.verse_id) continue;
          const parsed = row.last_reset_at ? new Date(row.last_reset_at).getTime() : 0;
          if (parsed) resetAtById.set(row.verse_id, parsed);
        }
        for (const [verseId, resetAt] of resetAtByVerse.entries()) {
          const existing = resetAtById.get(verseId) ?? 0;
          resetAtById.set(verseId, Math.max(existing, resetAt));
        }

        const { data: aggSource, error: aggError } = await client
          .from('verse_attempts')
          .select('verse_id, mode, accuracy, created_at, translation, reference, source, device_id')
          .eq('user_id', userId)
          .in('verse_id', verseIds);

        if (aggError) throw aggError;

        const progressRows = verseIds.map((vid) => {
          const rows = (aggSource || []).filter(r => r.verse_id === vid);
          const resetAtMs = resetAtById.get(vid) ?? 0;
          const filteredRows = resetAtMs
            ? rows.filter((row) => {
                const createdAt = row.created_at ? new Date(row.created_at).getTime() : 0;
                return createdAt >= resetAtMs;
              })
            : rows;

          const meta = (progressMeta || []).find(r => r.verse_id === vid);
          if (!filteredRows.length) {
            return {
              user_id: userId,
              verse_id: vid,
              best_accuracy: 0,
              perfect_counts: {
                type: { perfectCount: 0 },
                speech: { perfectCount: 0 },
                stealth: { perfectCount: 0 },
                sequence: { perfectCount: 0 },
              },
              last_attempt_at: null,
              total_attempts: 0,
              last_device_id: null,
              source: meta?.source || 'built-in',
              translation:
                meta?.translation === 'ES'
                  ? 'RVR1960'
                  : meta?.translation || 'RVR1960',
              reference: meta?.reference || vid,
              last_reset_at: resetAtMs ? new Date(resetAtMs).toISOString() : meta?.last_reset_at || null,
              deleted_at: null,
              updated_at: new Date().toISOString(),
            };
          }

          let bestAccuracy = 0;
          let lastAttemptAt = '';
          const totalAttempts = filteredRows.length;
          const perfectCounts: Record<string, { perfectCount: number; completedAt?: number }> = {
            type: { perfectCount: 0 },
            speech: { perfectCount: 0 },
            stealth: { perfectCount: 0 },
            sequence: { perfectCount: 0 },
          };

          let lastDeviceId: string | null = null;

          for (const row of filteredRows) {
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
            source: filteredRows[0]?.source || 'built-in',
            translation:
              filteredRows[0]?.translation === 'ES'
                ? 'RVR1960'
                : filteredRows[0]?.translation || 'RVR1960',
            reference: filteredRows[0]?.reference || vid,
            last_reset_at: resetAtMs ? new Date(resetAtMs).toISOString() : meta?.last_reset_at || null,
            deleted_at: null,
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
        verse_id: normalizeVerseId(s.verseId),
        start: s.start,
        end: s.end,
        saved_at: s.savedAt ? new Date(s.savedAt).toISOString() : new Date().toISOString(),
        updated_at: s.savedAt ? new Date(s.savedAt).toISOString() : new Date().toISOString(),
        deleted_at: null,
        source: s.source || 'built-in',
        translation: s.translation === 'ES' ? 'RVR1960' : (s.translation || 'RVR1960'),
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
