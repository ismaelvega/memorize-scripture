"use client";

import type { Attempt, Verse } from './types';
import { getDeviceId } from './device';
import { appendToOutbox, consumeOutbox, peekOutbox, type OutboxAttempt } from './sync-outbox';

const SYNC_FLAG = process.env.NEXT_PUBLIC_ENABLE_SYNC;
export const isSyncEnabled = () => SYNC_FLAG === 'true';

function buildDeterministicAttemptId(deviceId: string, verseId: string, mode: Attempt['mode'], ts: number) {
  return `attempt:${deviceId}:${verseId}:${mode}:${ts}`;
}

/**
 * Queue an attempt for server sync. This does not change existing UI flows.
 */
export async function enqueueAttemptForSync(params: {
  verse: Verse;
  attempt: Attempt;
  userId?: string;
}) {
  if (!isSyncEnabled()) return null;

  const { verse, attempt, userId } = params;
  const deviceId = getDeviceId();
  const attemptId = buildDeterministicAttemptId(deviceId, verse.id, attempt.mode, attempt.ts);

  const entry: OutboxAttempt = {
    attemptId,
    deviceId,
    userId,
    verseId: verse.id,
    mode: attempt.mode,
    ts: attempt.ts,
    accuracy: attempt.accuracy,
    inputLength: attempt.inputLength,
    missedCount: attempt.missedWords?.length ?? 0,
    extraCount: attempt.extraWords?.length ?? 0,
    speechDuration: attempt.audioDuration,
    confidenceScore: attempt.confidenceScore,
    stealthStats: attempt.stealthStats,
    sequenceStats: attempt.sequenceStats,
    translation: verse.translation,
    reference: verse.reference,
    source: verse.source,
  };

  await appendToOutbox(entry);
  return attemptId;
}

type FlushResult =
  | { ok: true; sent: number }
  | { ok: false; reason: 'sync-disabled' | 'missing-user' | 'server-error'; status?: number; message?: string };

/**
 * Push the outbox to `/api/sync-progress`. Keeps the queue if the call fails.
 */
export async function flushOutboxToServer(userId?: string): Promise<FlushResult> {
  if (!isSyncEnabled()) return { ok: false, reason: 'sync-disabled' };

  const queue = await peekOutbox();
  if (!queue.length) return { ok: true, sent: 0 };

  const resolvedUserId = userId || queue[0]?.userId;
  if (!resolvedUserId) return { ok: false, reason: 'missing-user' };

  const attempts = queue.map(a => ({
    ...a,
    userId: resolvedUserId,
  }));

  const res = await fetch('/api/sync-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: resolvedUserId, attempts }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, reason: 'server-error', status: res.status, message: text };
  }

  await consumeOutbox();
  return { ok: true, sent: attempts.length };
}
