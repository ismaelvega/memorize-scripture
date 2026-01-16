export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_seed: string | null;
  visibility: string;
  default_org_id: string | null;
  device_linked_at: string | null;
  created_at: string;
  updated_at: string;
};

type DeviceRow = {
  device_id: string;
  user_id: string | null;
  last_seen_at: string;
  created_at: string;
};

type VerseProgressRow = {
  user_id: string;
  verse_id: string;
  best_accuracy: number | null;
  perfect_counts: Json | null;
  last_attempt_at: string | null;
  total_attempts: number;
  last_device_id: string | null;
  source: string | null;
  translation: string | null;
  reference: string | null;
  updated_at: string;
};

type VerseAttemptRow = {
  id: string;
  user_id: string;
  device_id: string | null;
  verse_id: string;
  mode: string;
  accuracy: number;
  input_length: number;
  missed_count: number;
  extra_count: number;
  speech_duration: number | null;
  confidence_score: number | null;
  stealth_stats: Json | null;
  sequence_stats: Json | null;
  source: string | null;
  translation: string | null;
  reference: string | null;
  created_at: string;
  diff: Json | null;
  verse_text: string | null;
  transcription: string | null;
};

type SavedPassageRow = {
  user_id: string;
  verse_id: string;
  start: number;
  end: number;
  saved_at: string;
  source: string | null;
  translation: string | null;
  reference: string | null;
  custom_text: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      devices: Table<DeviceRow>;
      verse_progress: Table<VerseProgressRow>;
      verse_attempts: Table<VerseAttemptRow>;
      saved_passages: Table<SavedPassageRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
