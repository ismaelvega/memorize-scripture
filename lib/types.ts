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
}

export interface Attempt {
  ts: number;
  mode: 'type' | 'speech';
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
}

export interface StoredVerseProgress {
  reference: string;
  translation: string;
  text?: string; // store for custom verse recovery
  attempts: Attempt[];
  source?: 'built-in' | 'custom';
}

export interface ProgressState {
  verses: Record<string, StoredVerseProgress>;
  lastSelectedVerseId?: string;
}

export interface GradeResponse {
  accuracy: number; // may arrive 0-1 or 0-100
  missedWords: string[];
  extraWords: string[];
  paraphraseOk?: boolean;
  feedback?: string;
  diff?: DiffToken[];
  gradedBy?: 'naive' | 'llm';
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

export type AppMode = 'type' | 'speech';
