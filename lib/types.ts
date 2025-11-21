export interface Verse {
  id: string;
  reference: string;
  translation: string;
  text: string;
  source: 'built-in' | 'custom';
}

export interface DiffToken {
  token: string;
  status: 'match' | 'missing' | 'extra' | 'punct';
  verse?: number;
}

export interface StealthAttemptStats {
  totalWords: number;
  flawlessWords: number;
  correctedWords: number;
  totalMistakes: number;
  totalCharacters: number;
  durationMs: number;
  wordsPerMinute: number;
  averageAttemptsPerWord: number;
  longestFlawlessStreak: number;
}

export interface SequenceAttemptStats {
  totalChunks: number;
  mistakes: number;
  selectedChunks: string[];
  mistakeCountsByChunk: Array<{ index: number; text: string; count: number }>;
}

export interface Attempt {
  ts: number;
  mode: 'type' | 'speech' | 'stealth' | 'sequence';
  inputLength: number;
  accuracy: number; // 0-100
  missedWords: string[];
  extraWords: string[];
  feedback?: string;
  promptHints?: { firstNWords: number };
  diff?: DiffToken[];
  // Speech-specific fields
  transcription?: string; // The transcribed text from speech
  audioDuration?: number; // Duration in seconds
  confidenceScore?: number; // Whisper confidence if available
  stealthStats?: StealthAttemptStats;
  sequenceStats?: SequenceAttemptStats;
}

export interface StoredVerseProgress {
  reference: string;
  translation: string;
  text?: string; // store for custom verse recovery
  attempts: Attempt[];
  source?: 'built-in' | 'custom';
  modeCompletions?: Record<AppMode, ModeCompletion>;
}

export interface SavedPassage {
  verse: Verse;
  start: number;
  end: number;
  savedAt: number;
}

export interface ProgressState {
  verses: Record<string, StoredVerseProgress>;
  lastSelectedVerseId?: string;
  saved?: Record<string, SavedPassage>;
}

export interface GradeResponse {
  accuracy: number; // may arrive 0-1 or 0-100
  missedWords: string[];
  extraWords: string[];
  paraphraseOk?: boolean;
  feedback?: string;
  diff?: DiffToken[];
  gradedBy?: 'naive';
}

export interface TranscriptionResponse {
  success: boolean;
  transcription?: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  error?: string;
}

export type AppMode = 'type' | 'speech' | 'stealth' | 'sequence';

export interface ModeCompletion {
  perfectCount: number; // Number of 100% accuracy attempts
  completedAt?: number; // Timestamp when 3rd perfect attempt was reached
}

export interface ModeCompletionStatus {
  mode: AppMode;
  perfectCount: number;
  isCompleted: boolean;
  completedAt?: number;
  progress: number; // 0-100 percentage towards completion
}

export interface PassageCompletionSummary {
  completedModes: AppMode[];
  completionPercent: number; // 0-100
  modeStatuses: ModeCompletionStatus[];
  totalPerfectAttempts: number;
}

export type CitationSegmentId = string;

export type CitationSegment = {
  id: CitationSegmentId;
  label: string;
  order: number;
  appended: boolean;
};

export type TrackingMode = 'progress' | 'review' | 'rally';
