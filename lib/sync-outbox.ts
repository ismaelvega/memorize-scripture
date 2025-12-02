"use client";

import { idbGet, idbSet } from './idb';
import type { AppMode, StealthAttemptStats, SequenceAttemptStats } from './types';
import type { DiffToken } from './types';

const OUTBOX_KEY = 'bm_sync_outbox_v1';

export type OutboxAttempt = {
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

async function readOutbox(): Promise<OutboxAttempt[]> {
  if (typeof window === 'undefined') return [];
  const data = await idbGet<OutboxAttempt[]>(OUTBOX_KEY);
  return Array.isArray(data) ? data : [];
}

/**
 * Append a payload to the outbox. Returns the updated queue.
 */
export async function appendToOutbox(entry: OutboxAttempt): Promise<OutboxAttempt[]> {
  const current = await readOutbox();
  const next = [...current, entry];
  await idbSet(OUTBOX_KEY, next);
  return next;
}

/**
 * Read the current queue without clearing.
 */
export async function peekOutbox(): Promise<OutboxAttempt[]> {
  return readOutbox();
}

/**
 * Consume the queue: returns items and clears the stored outbox.
 */
export async function consumeOutbox(): Promise<OutboxAttempt[]> {
  const current = await readOutbox();
  await idbSet(OUTBOX_KEY, []);
  return current;
}

export async function clearOutbox() {
  await idbSet(OUTBOX_KEY, []);
}
