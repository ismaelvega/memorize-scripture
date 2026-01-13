"use client";

import { idbGet, idbSet } from './idb';
import type { AppMode, StealthAttemptStats, SequenceAttemptStats } from './types';
import type { DiffToken } from './types';

const OUTBOX_KEY = 'bm_sync_outbox_v1';

export type OutboxAttempt = {
  kind: 'attempt';
  attemptId: string;
  deviceId: string;
  userId?: string;
  verseId: string;
  mode: AppMode;
  ts: number;
  accuracy: number;
  inputLength: number;
  missedCount: number;
  extraCount: number;
  speechDuration?: number;
  confidenceScore?: number;
  stealthStats?: StealthAttemptStats;
  sequenceStats?: SequenceAttemptStats;
  translation?: string;
  reference?: string;
  source?: 'built-in' | 'custom';
  diff?: DiffToken[];
  transcription?: string;
  verseText?: string;
};

export type OutboxSavedPassage = {
  kind: 'save_passage';
  verseId: string;
  start: number;
  end: number;
  savedAt?: number;
  source?: 'built-in' | 'custom';
  translation?: string;
  reference?: string;
  customText?: string;
};

export type OutboxProgressRemoval = {
  kind: 'remove_progress';
  verseId: string;
  ts: number;
};

export type OutboxProgressReset = {
  kind: 'reset_progress';
  verseId: string;
  ts: number;
};

export type OutboxSavedRemoval = {
  kind: 'remove_saved';
  verseId: string;
  ts: number;
};

export type OutboxEntry =
  | OutboxAttempt
  | OutboxSavedPassage
  | OutboxProgressRemoval
  | OutboxProgressReset
  | OutboxSavedRemoval;

function normalizeLegacyEntry(entry: unknown): OutboxEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const record = entry as Record<string, unknown>;
  if (typeof record.kind === 'string') {
    return entry as OutboxEntry;
  }
  if (typeof record.attemptId === 'string' && typeof record.verseId === 'string') {
    return { kind: 'attempt', ...(entry as Omit<OutboxAttempt, 'kind'>) };
  }
  return null;
}

async function readOutbox(): Promise<OutboxEntry[]> {
  if (typeof window === 'undefined') return [];
  const data = await idbGet<OutboxEntry[] | unknown[]>(OUTBOX_KEY);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeLegacyEntry).filter((entry): entry is OutboxEntry => Boolean(entry));
}

/**
 * Append a payload to the outbox. Returns the updated queue.
 */
export async function appendToOutbox(entry: OutboxEntry): Promise<OutboxEntry[]> {
  const current = await readOutbox();
  const next = [...current, entry];
  await idbSet(OUTBOX_KEY, next);
  return next;
}

/**
 * Read the current queue without clearing.
 */
export async function peekOutbox(): Promise<OutboxEntry[]> {
  return readOutbox();
}

/**
 * Consume the queue: returns items and clears the stored outbox.
 */
export async function consumeOutbox(): Promise<OutboxEntry[]> {
  const current = await readOutbox();
  await idbSet(OUTBOX_KEY, []);
  return current;
}

export async function clearOutbox() {
  await idbSet(OUTBOX_KEY, []);
}
