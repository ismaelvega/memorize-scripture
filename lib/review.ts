import type { AppMode, PassageCompletionSummary, ProgressState, StoredVerseProgress } from './types';
import { ALL_MODES, PERFECT_ATTEMPTS_REQUIRED, computePassageCompletion } from './completion';

export const RALLY_ORDER: AppMode[] = ['sequence', 'stealth', 'type', 'speech'];

export interface MemorizedPassage {
  id: string;
  entry: StoredVerseProgress;
  summary: PassageCompletionSummary;
}

/**
 * Returns true when a passage has all modes completed (>= PERFECT_ATTEMPTS_REQUIRED)
 * and is not a custom verse (repaso excluye personalizados).
 */
export function isMemorizedPassage(entry: StoredVerseProgress | undefined): boolean {
  if (!entry || entry.source === 'custom') return false;
  const completions = entry.modeCompletions;
  if (!completions) return false;
  return ALL_MODES.every((mode) => (completions[mode]?.perfectCount || 0) >= PERFECT_ATTEMPTS_REQUIRED);
}

/**
 * Collect all memorized passages from a ProgressState (built-in only) with completion summaries.
 */
export function getMemorizedPassages(state: ProgressState): MemorizedPassage[] {
  return Object.entries(state.verses)
    .map(([id, entry]) => ({ id, entry }))
    .filter(({ entry }) => isMemorizedPassage(entry))
    .map(({ id, entry }) => ({
      id,
      entry,
      summary: computePassageCompletion(entry),
    }))
    .sort((a, b) => {
      const aCompletedAt = entryCompletedAt(a.entry) || 0;
      const bCompletedAt = entryCompletedAt(b.entry) || 0;
      return bCompletedAt - aCompletedAt;
    });
}

function entryCompletedAt(entry: StoredVerseProgress): number | undefined {
  const completions = entry.modeCompletions;
  if (!completions) return undefined;
  const timestamps = ALL_MODES
    .map((mode) => completions[mode]?.completedAt)
    .filter(Boolean) as number[];
  if (timestamps.length === 0) return undefined;
  return Math.max(...timestamps);
}
