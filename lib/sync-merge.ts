"use client";

import { loadProgress, saveProgress } from './storage';
import type { ProgressState, SavedPassage, StoredVerseProgress } from './types';
import { computePassageCompletion } from './completion';

type RemoteProgressRow = {
  verse_id: string;
  best_accuracy: number | null;
  perfect_counts: Record<string, { perfectCount?: number; completedAt?: number }> | null;
  last_attempt_at: string | null;
  total_attempts: number | null;
  source?: 'built-in' | 'custom';
  translation?: string;
  reference?: string;
  last_device_id?: string | null;
  updated_at?: string | null;
};

type RemoteSaved = {
  verse_id: string;
  start: number;
  end: number;
  saved_at?: string;
  source?: 'built-in' | 'custom';
  translation?: string;
  reference?: string;
  custom_text?: string | null;
};

export function mergeRemoteProgress(params: {
  progressRows: RemoteProgressRow[];
  savedRows: RemoteSaved[];
}) {
  const state: ProgressState = loadProgress();

  for (const row of params.progressRows || []) {
    const verseId = row.verse_id;
    if (!verseId) continue;
    const existing: StoredVerseProgress = state.verses[verseId] || {
      reference: row.reference || verseId,
      translation: row.translation || 'ES',
      attempts: [],
      source: (row.source as any) || 'built-in',
      modeCompletions: {
        type: { perfectCount: 0 },
        speech: { perfectCount: 0 },
        stealth: { perfectCount: 0 },
        sequence: { perfectCount: 0 },
      },
    };

    // Merge reference/translation/source if missing
    existing.reference = existing.reference || row.reference || verseId;
    existing.translation = existing.translation || row.translation || 'ES';
    existing.source = existing.source || (row.source as any) || 'built-in';

    // Merge mode completions: take max perfectCount and keep earliest completedAt when completed
    const remoteCompletions = row.perfect_counts || {};
    existing.modeCompletions = existing.modeCompletions || {
      type: { perfectCount: 0 },
      speech: { perfectCount: 0 },
      stealth: { perfectCount: 0 },
      sequence: { perfectCount: 0 },
    };

    for (const mode of Object.keys(existing.modeCompletions)) {
      const local = existing.modeCompletions[mode as keyof typeof existing.modeCompletions];
      const remote = (remoteCompletions as any)[mode] || {};
      const mergedCount = Math.max(local?.perfectCount || 0, remote?.perfectCount || 0);
      const completedAtCandidates = [local?.completedAt, remote?.completedAt].filter(Boolean) as number[];
      existing.modeCompletions[mode as keyof typeof existing.modeCompletions] = {
        perfectCount: mergedCount,
        completedAt: completedAtCandidates.length ? Math.min(...completedAtCandidates) : undefined,
      };
    }

    // best accuracy: take max of local best and remote best
    const localBest = computePassageCompletion(existing).completedModes.length ? undefined : undefined; // placeholder to avoid unused
    const remoteBest = row.best_accuracy ?? 0;
    const localAttemptBest = existing.attempts?.length
      ? Math.max(...existing.attempts.map(a => a.accuracy || 0))
      : 0;
    const bestAccuracy = Math.max(remoteBest, localAttemptBest, 0);
    if (!Number.isNaN(bestAccuracy)) {
      // We don't store best_accuracy separately; attempts already hold accuracy.
      // So nothing to set, but we leave this as a hook if we add a cached field.
    }

    state.verses[verseId] = existing;
  }

  // Saved passages: upsert, prefer freshest saved_at
  if (!state.saved) state.saved = {};
  for (const row of params.savedRows || []) {
    const savedAtMs = row.saved_at ? new Date(row.saved_at).getTime() : Date.now();
    const existing: SavedPassage | undefined = state.saved[row.verse_id];
    if (existing && existing.savedAt >= savedAtMs) continue;
    state.saved[row.verse_id] = {
      verse: {
        id: row.verse_id,
        reference: row.reference || existing?.verse.reference || row.verse_id,
        translation: row.translation || existing?.verse.translation || 'ES',
        text: existing?.verse.text || '',
        source: (row.source as any) || existing?.verse.source || 'built-in',
      },
      start: row.start,
      end: row.end,
      savedAt: savedAtMs,
    };
  }

  saveProgress(state);
  return state;
}
