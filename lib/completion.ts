import type { AppMode, Attempt, ModeCompletion, ModeCompletionStatus, PassageCompletionSummary, StoredVerseProgress } from './types';

/**
 * Number of perfect (100%) attempts required to consider a mode completed
 */
export const PERFECT_ATTEMPTS_REQUIRED = 3;

/**
 * All available practice modes
 */
export const ALL_MODES: AppMode[] = ['type', 'speech', 'stealth', 'sequence'];

/**
 * Rebuild modeCompletions from existing attempts.
 * Used for cold migration when loading progress data that lacks modeCompletions.
 */
export function rebuildModeCompletions(attempts: Attempt[]): Record<AppMode, ModeCompletion> {
  const completions: Record<AppMode, ModeCompletion> = {
    type: { perfectCount: 0 },
    speech: { perfectCount: 0 },
    stealth: { perfectCount: 0 },
    sequence: { perfectCount: 0 },
  };

  // Sort attempts by timestamp to find the first completion timestamp
  const sortedAttempts = [...attempts].sort((a, b) => a.ts - b.ts);

  for (const attempt of sortedAttempts) {
    if (attempt.accuracy === 100) {
      const modeCompletion = completions[attempt.mode];
      modeCompletion.perfectCount += 1;

      // Mark completedAt when reaching the threshold for the first time
      if (modeCompletion.perfectCount === PERFECT_ATTEMPTS_REQUIRED && !modeCompletion.completedAt) {
        modeCompletion.completedAt = attempt.ts;
      }
    }
  }

  return completions;
}

/**
 * Update mode completion after a new attempt is added.
 * Returns updated ModeCompletion object for the attempt's mode.
 */
export function updateModeCompletion(
  existingCompletion: ModeCompletion | undefined,
  newAttempt: Attempt
): ModeCompletion {
  const current = existingCompletion || { perfectCount: 0 };

  // Only increment for perfect attempts
  if (newAttempt.accuracy !== 100) {
    return current;
  }

  const updated: ModeCompletion = {
    perfectCount: current.perfectCount + 1,
    completedAt: current.completedAt,
  };

  // Mark completion timestamp if reaching threshold
  if (updated.perfectCount === PERFECT_ATTEMPTS_REQUIRED && !updated.completedAt) {
    updated.completedAt = newAttempt.ts;
  }

  return updated;
}

/**
 * Get completion status for a single mode
 */
export function getModeCompletionStatus(
  mode: AppMode,
  completion: ModeCompletion | undefined
): ModeCompletionStatus {
  const perfectCount = completion?.perfectCount || 0;
  const isCompleted = perfectCount >= PERFECT_ATTEMPTS_REQUIRED;
  const progress = Math.min(100, (perfectCount / PERFECT_ATTEMPTS_REQUIRED) * 100);

  return {
    mode,
    perfectCount,
    isCompleted,
    completedAt: completion?.completedAt,
    progress,
  };
}

/**
 * Compute overall passage completion summary
 */
export function computePassageCompletion(entry: StoredVerseProgress): PassageCompletionSummary {
  const modeCompletions: Partial<Record<AppMode, ModeCompletion>> = entry.modeCompletions || {};
  const modeStatuses = ALL_MODES.map(mode => getModeCompletionStatus(mode, modeCompletions[mode]));
  
  const completedModes = modeStatuses
    .filter(status => status.isCompleted)
    .map(status => status.mode);

  const completionPercent = (completedModes.length / ALL_MODES.length) * 100;

  const totalPerfectAttempts = modeStatuses.reduce(
    (sum, status) => sum + status.perfectCount,
    0
  );

  return {
    completedModes,
    completionPercent,
    modeStatuses,
    totalPerfectAttempts,
  };
}

/**
 * Get best accuracy across all attempts (legacy behavior, still useful for display)
 */
export function getBestAccuracy(attempts: Attempt[]): number {
  if (!attempts || attempts.length === 0) return 0;
  return Math.max(...attempts.map(a => a.accuracy));
}

/**
 * Format completion date
 */
export function formatCompletionDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}
