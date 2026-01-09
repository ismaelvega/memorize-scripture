import type { AppMode } from './types';

export type RemoteProgressRow = {
  verse_id: string;
  best_accuracy?: number | null;
  total_attempts?: number | null;
  last_attempt_at?: string | null;
  translation?: string | null;
  reference?: string | null;
  source?: 'built-in' | 'custom' | null;
  perfect_counts?: Record<string, { perfectCount?: number; completedAt?: number }> | null;
};

export type ProgressListRow = {
  id: string;
  reference: string;
  translation: string;
  attempts: number;
  best: number;
  lastTs: number;
  snippet: string;
  truncated: boolean;
  source?: 'built-in' | 'custom';
  completionPercent: number;
  completedModes: number;
  totalModes: number;
};

const MODES: AppMode[] = ['type', 'speech', 'stealth', 'sequence'];

export function mapProgressRows(rows: RemoteProgressRow[]): ProgressListRow[] {
  return (rows || []).map((row) => {
    const id = row.verse_id;
    const completionCounts = row.perfect_counts || {};
    const completedModes = MODES.filter((mode) => {
      const perfectCount = completionCounts[mode]?.perfectCount ?? 0;
      return perfectCount >= 3;
    }).length;
    const completionPercent = (completedModes / MODES.length) * 100;
    const translation = row.translation === 'ES' ? 'RVR1960' : (row.translation || 'RVR1960');
    return {
      id,
      reference: row.reference || id,
      translation,
      attempts: row.total_attempts || 0,
      best: Number(row.best_accuracy) || 0,
      lastTs: row.last_attempt_at ? new Date(row.last_attempt_at).getTime() : 0,
      snippet: '',
      truncated: false,
      source: row.source || undefined,
      completionPercent,
      completedModes,
      totalModes: MODES.length,
    };
  });
}
