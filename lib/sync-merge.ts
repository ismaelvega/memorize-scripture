"use client";

import { loadProgress, saveProgress } from './storage';
import type { AppMode, ModeCompletion, ProgressState, SavedPassage, StoredVerseProgress } from './types';
import { PERFECT_ATTEMPTS_REQUIRED, rebuildModeCompletions } from './completion';

type RemoteProgressRow = {
  verse_id: string;
  best_accuracy?: number | null;
  perfect_counts?: Record<string, { perfectCount?: number; completedAt?: number }> | null;
  last_attempt_at?: string | null;
  total_attempts?: number | null;
  source?: 'built-in' | 'custom';
  translation?: string;
  reference?: string;
  last_device_id?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  last_reset_at?: string | null;
};

type RemoteSaved = {
  verse_id: string;
  start: number;
  end: number;
  saved_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  source?: 'built-in' | 'custom';
  translation?: string;
  reference?: string;
  custom_text?: string | null;
};

const MODES: AppMode[] = ['type', 'speech', 'stealth', 'sequence'];

function buildEmptyCompletions(): Record<AppMode, ModeCompletion> {
  return {
    type: { perfectCount: 0 },
    speech: { perfectCount: 0 },
    stealth: { perfectCount: 0 },
    sequence: { perfectCount: 0 },
  };
}

function normalizeVerseId(rawId: string) {
  let id = rawId;
  if (!id) return id;
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

function normalizeTranslation(value?: string) {
  if (!value) return 'RVR1960';
  return value === 'ES' ? 'RVR1960' : value;
}

function parseTimestamp(value?: string | number | null) {
  if (value == null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

function ensureModeCompletions(entry: StoredVerseProgress) {
  if (entry.modeCompletions) {
    const next = buildEmptyCompletions();
    for (const mode of MODES) {
      const current = entry.modeCompletions[mode];
      if (current) next[mode] = { ...current };
    }
    return next;
  }
  if (entry.attempts && entry.attempts.length > 0) {
    return rebuildModeCompletions(entry.attempts);
  }
  return buildEmptyCompletions();
}

function mergeModeCompletion(params: {
  local: ModeCompletion | undefined;
  remote: { perfectCount?: number; completedAt?: number } | undefined;
  fallbackCompletedAt?: number;
}) {
  const localCount = params.local?.perfectCount ?? 0;
  const remoteCount = Number(params.remote?.perfectCount ?? 0) || 0;
  const perfectCount = Math.max(localCount, remoteCount, 0);
  const localCompletedAt = params.local?.completedAt;
  const remoteCompletedAt = parseTimestamp(params.remote?.completedAt ?? null);
  let completedAt = localCompletedAt ?? remoteCompletedAt;
  if (!completedAt && perfectCount >= PERFECT_ATTEMPTS_REQUIRED && params.fallbackCompletedAt) {
    completedAt = params.fallbackCompletedAt;
  }
  return { perfectCount, completedAt };
}

export function mergeRemoteProgress(params: {
  progressRows: RemoteProgressRow[];
  savedRows: RemoteSaved[];
}) {
  const state: ProgressState = loadProgress();

  for (const row of params.progressRows || []) {
    const verseId = row.source === 'custom' ? row.verse_id : normalizeVerseId(row.verse_id);
    if (!verseId) continue;
    const deletedAtMs = parseTimestamp(row.deleted_at ?? null);
    if (deletedAtMs) {
      const existing = state.verses[verseId];
      const localLastAttempt = existing?.attempts?.length
        ? existing.attempts[existing.attempts.length - 1].ts
        : 0;
      if (!localLastAttempt || localLastAttempt <= deletedAtMs) {
        delete state.verses[verseId];
      }
      continue;
    }
    const existing: StoredVerseProgress = state.verses[verseId] || {
      reference: row.reference || verseId,
      translation: normalizeTranslation(row.translation),
      attempts: [],
      source: row.source || 'built-in',
      modeCompletions: buildEmptyCompletions(),
    };

    // Merge reference/translation/source if missing
    existing.reference = existing.reference || row.reference || verseId;
    existing.translation = normalizeTranslation(row.translation || existing.translation);
    existing.source = existing.source || row.source || 'built-in';

    const incomingResetAt = parseTimestamp(row.last_reset_at ?? null) || 0;
    const localResetAt = existing.lastResetAt ?? 0;
    const effectiveResetAt = Math.max(localResetAt, incomingResetAt);
    if (effectiveResetAt) {
      const filteredAttempts = (existing.attempts || []).filter((attempt) => attempt.ts >= effectiveResetAt);
      existing.attempts = filteredAttempts;
      existing.lastResetAt = effectiveResetAt;
      if (!filteredAttempts.length) {
        existing.modeCompletions = buildEmptyCompletions();
      } else {
        existing.modeCompletions = rebuildModeCompletions(filteredAttempts);
      }
    }

    // Merge mode completions: take max perfectCount and keep earliest completedAt when completed
    const remoteCompletions = (row.perfect_counts || {}) as Partial<Record<AppMode, { perfectCount?: number; completedAt?: number }>>;
    const fallbackCompletedAt = parseTimestamp(row.last_attempt_at ?? null);
    const baseCompletions = ensureModeCompletions(existing);
    const mergedCompletions = buildEmptyCompletions();
    for (const mode of MODES) {
      mergedCompletions[mode] = mergeModeCompletion({
        local: baseCompletions[mode],
        remote: remoteCompletions[mode],
        fallbackCompletedAt,
      });
    }
    existing.modeCompletions = mergedCompletions;

    state.verses[verseId] = existing;
  }

  // Saved passages: upsert, prefer freshest saved_at
  if (!state.saved) state.saved = {};
  for (const row of params.savedRows || []) {
    const verseId = row.source === 'custom' ? row.verse_id : normalizeVerseId(row.verse_id);
    if (!verseId) continue;
    const deletedAtMs = parseTimestamp(row.deleted_at ?? null);
    if (deletedAtMs) {
      const existingSaved = state.saved[verseId];
      if (!existingSaved || existingSaved.savedAt <= deletedAtMs) {
        delete state.saved[verseId];
      }
      continue;
    }
    const savedAtMs = parseTimestamp(row.saved_at ?? null) || Date.now();
    const existing: SavedPassage | undefined = state.saved[verseId];
    if (existing && existing.savedAt >= savedAtMs) continue;
    const progressEntry = state.verses[verseId];
    const reference = row.reference || existing?.verse.reference || progressEntry?.reference || verseId;
    const translation = normalizeTranslation(row.translation || existing?.verse.translation || progressEntry?.translation);
    const source = row.source || existing?.verse.source || progressEntry?.source || 'built-in';
    const customText = typeof row.custom_text === 'string' && row.custom_text.trim().length > 0
      ? row.custom_text
      : undefined;
    const verseText = existing?.verse.text || progressEntry?.text || customText || '';
    state.saved[verseId] = {
      verse: {
        id: verseId,
        reference,
        translation,
        text: verseText,
        source,
      },
      start: row.start,
      end: row.end,
      savedAt: savedAtMs,
    };
    if (source === 'custom' && customText && progressEntry && !progressEntry.text) {
      progressEntry.text = customText;
    }
  }

  saveProgress(state);
  return state;
}
