"use client";

import type { Attempt, Verse } from './types';
import { getDeviceId } from './device';
import {
  appendToOutbox,
  consumeOutbox,
  peekOutbox,
  type OutboxAttempt,
  type OutboxProgressRemoval,
  type OutboxProgressReset,
  type OutboxSavedPassage,
  type OutboxSavedRemoval,
} from './sync-outbox';
import { loadProgress } from './storage';

export const isSyncEnabled = () => {
  const flag = process.env.NEXT_PUBLIC_ENABLE_SYNC;
  // default to true when unset to avoid silent no-ops in client builds
  return flag === undefined ? true : flag === 'true';
};

function normalizeVerseId(rawId: string) {
  let id = rawId;
  if (id.endsWith('-es')) {
    id = `${id.slice(0, -3)}rv1960`;
  } else if (id.endsWith('rv1960') && !id.endsWith('-rv1960')) {
    // if missing dash before rv1960, add it
    const without = id.slice(0, -6);
    id = `${without}-rv1960`;
  } else if (!id.endsWith('-rv1960')) {
    id = `${id}-rv1960`;
  }
  return id;
}

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
  const normalizedVerseId = normalizeVerseId(verse.id);
  const attemptId = buildDeterministicAttemptId(deviceId, normalizedVerseId, attempt.mode, attempt.ts);

  const entry: OutboxAttempt = {
    kind: 'attempt',
    attemptId,
    deviceId,
    userId,
    verseId: normalizedVerseId,
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
    diff: attempt.diff,
    transcription: attempt.transcription,
    verseText: verse.text,
  };

  await appendToOutbox(entry);
  return attemptId;
}

export async function enqueueSavedPassageForSync(params: {
  verse: Verse;
  start: number;
  end: number;
  savedAt?: number;
}) {
  if (!isSyncEnabled()) return null;
  const { verse, start, end, savedAt } = params;
  const entry: OutboxSavedPassage = {
    kind: 'save_passage',
    verseId: normalizeVerseId(verse.id),
    start,
    end,
    savedAt,
    source: verse.source,
    translation: verse.translation,
    reference: verse.reference,
    customText: verse.text,
  };
  await appendToOutbox(entry);
  return entry.verseId;
}

export async function enqueueProgressRemovalForSync(params: { verseId: string; ts?: number }) {
  if (!isSyncEnabled()) return null;
  const entry: OutboxProgressRemoval = {
    kind: 'remove_progress',
    verseId: normalizeVerseId(params.verseId),
    ts: params.ts ?? Date.now(),
  };
  await appendToOutbox(entry);
  return entry.verseId;
}

export async function enqueueProgressResetForSync(params: { verseId: string; ts?: number }) {
  if (!isSyncEnabled()) return null;
  const entry: OutboxProgressReset = {
    kind: 'reset_progress',
    verseId: normalizeVerseId(params.verseId),
    ts: params.ts ?? Date.now(),
  };
  await appendToOutbox(entry);
  return entry.verseId;
}

export async function enqueueSavedRemovalForSync(params: { verseId: string; ts?: number }) {
  if (!isSyncEnabled()) return null;
  const entry: OutboxSavedRemoval = {
    kind: 'remove_saved',
    verseId: normalizeVerseId(params.verseId),
    ts: params.ts ?? Date.now(),
  };
  await appendToOutbox(entry);
  return entry.verseId;
}

type FlushResult =
  | { ok: true; sent: number }
  | { ok: false; reason: 'sync-disabled' | 'server-error'; status?: number; message?: string };

/**
 * Push the outbox to `/api/sync-progress`. Keeps the queue if the call fails.
 */
export async function flushOutboxToServer(_userId?: string): Promise<FlushResult> {
  if (!isSyncEnabled()) return { ok: false, reason: 'sync-disabled' };

  const queue = await peekOutbox();
  if (!queue.length) return { ok: true, sent: 0 };

  const attempts = queue
    .filter((entry): entry is OutboxAttempt => entry.kind === 'attempt')
    .map(({ kind, ...a }) => ({
      ...a,
      verseId: normalizeVerseId(a.verseId),
      translation: a.translation === 'ES' ? 'RVR1960' : (a.translation || 'RVR1960'),
    }));

  const savedPassages = queue
    .filter((entry): entry is OutboxSavedPassage => entry.kind === 'save_passage')
    .map(s => ({
      verseId: normalizeVerseId(s.verseId),
      start: s.start,
      end: s.end,
      savedAt: s.savedAt,
      source: s.source,
      translation: s.translation,
      reference: s.reference,
      customText: s.customText,
    }));

  const removedProgress = queue
    .filter((entry): entry is OutboxProgressRemoval => entry.kind === 'remove_progress')
    .map(r => ({
      verseId: normalizeVerseId(r.verseId),
      removedAt: r.ts,
    }));

  const resetProgress = queue
    .filter((entry): entry is OutboxProgressReset => entry.kind === 'reset_progress')
    .map(r => ({
      verseId: normalizeVerseId(r.verseId),
      resetAt: r.ts,
    }));

  const removedSaved = queue
    .filter((entry): entry is OutboxSavedRemoval => entry.kind === 'remove_saved')
    .map(r => ({
      verseId: normalizeVerseId(r.verseId),
      removedAt: r.ts,
    }));

  const res = await fetch('/api/sync-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attempts, savedPassages, removedProgress, resetProgress, removedSaved }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, reason: 'server-error', status: res.status, message: text };
  }

  await consumeOutbox();
  return { ok: true, sent: queue.length };
}

/**
 * Build a bulk snapshot from local progress for initial push after login.
 * This is idempotent because attemptIds are deterministic.
 */
export async function buildSnapshotForUser(userId: string) {
  const deviceId = getDeviceId();
  const snapshot = loadProgress();
  const attempts: OutboxAttempt[] = [];
  for (const [verseId, entry] of Object.entries(snapshot.verses)) {
    const normalizedVerseId = normalizeVerseId(verseId);
    for (const attempt of entry.attempts || []) {
      const attemptId = `attempt:${deviceId}:${normalizedVerseId}:${attempt.mode}:${attempt.ts}`;
      attempts.push({
        kind: 'attempt',
        attemptId,
        deviceId,
        userId,
        verseId: normalizedVerseId,
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
        translation: entry.translation === 'ES' ? 'RVR1960' : (entry.translation || 'RVR1960'),
        reference: entry.reference,
        source: entry.source,
        diff: attempt.diff,
        transcription: attempt.transcription,
        verseText: entry.text,
      });
    }
  }

  const savedPassages = Object.values(snapshot.saved ?? {}).map((s) => ({
    verseId: s.verse.id,
    start: s.start,
    end: s.end,
    savedAt: s.savedAt,
    source: s.verse.source,
    translation: s.verse.translation,
    reference: s.verse.reference,
    customText: s.verse.text,
  }));

  return { attempts, savedPassages };
}
