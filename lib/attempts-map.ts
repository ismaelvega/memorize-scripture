import type { Attempt, DiffToken, SequenceAttemptStats, StealthAttemptStats } from './types';

export type RemoteAttemptRow = {
  id?: string;
  mode: Attempt['mode'];
  accuracy?: number | null;
  missed_count?: number | null;
  extra_count?: number | null;
  created_at?: string | null;
  diff?: DiffToken[] | null;
  transcription?: string | null;
  speech_duration?: number | null;
  confidence_score?: number | null;
  stealth_stats?: StealthAttemptStats | null;
  sequence_stats?: SequenceAttemptStats | null;
  reference?: string | null;
  translation?: string | null;
  source?: 'built-in' | 'custom' | null;
  verse_text?: string | null;
};

export function mapAttemptRows(rows: RemoteAttemptRow[]): Attempt[] {
  return (rows || []).map((row) => ({
    ts: new Date(row.created_at || Date.now()).getTime(),
    mode: row.mode,
    inputLength: (row.transcription || row.verse_text || '').length,
    accuracy: Number(row.accuracy) || 0,
    missedWords: [],
    extraWords: [],
    feedback: undefined,
    promptHints: undefined,
    diff: row.diff || undefined,
    transcription: row.transcription || undefined,
    audioDuration: row.speech_duration || undefined,
    confidenceScore: row.confidence_score || undefined,
    stealthStats: row.stealth_stats || undefined,
    sequenceStats: row.sequence_stats || undefined,
  }));
}
