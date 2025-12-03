# Memorize - Scripture Memorization App

Mobile-first Next.js 15.5 + React 19 app to practice and review Spanish Bible passages with four memorization modes, local grading, Whisper transcription, and client-side persistence.

## Current Functionality
- **Home & Hub**: Home surfaces "Práctica" and a "Repaso" shortcut (unlocked after memorizing passages). `/practice` is the core workspace with a floating header, progress list, saved passages carousel, and a mobile flow to choose book -> chapter -> range -> mode.
- **Selection & Saved**: Browse by book/chapter or search the full Bible (accentless matching, range parsing like "Juan 3:16-18"). The search index is cached in IndexedDB (`bible_search_index_v1`) and versioned via `public/bible_data/version.json`. Ranges trigger a large-selection warning (~6 verses/~120 words) unless `bm_skip_large_selection_warning` is set. Passages can be saved for later and reopened from the Guardados carousel.
- **Practice modes** (all track 3 perfect attempts per mode via `modeCompletions`):
  - **Sequence**: Chunks verses with `chunkVerseForSequenceMode`, guarantees the expected fragment is always shown, deduplicates duplicates, provides hints and citation bubbles, and shows a perfect-score modal.
  - **Stealth**: Word-by-word recall with `HiddenInlineInput`, per-word stats (WPM, streaks, mistakes), supports multi-verse ranges, and blocks navigation while active.
  - **Type**: Offline grading with `gradeAttempt`, up to three timed peeks, Ctrl+Enter submit / Esc clear, diff + history, and perfect-score modal.
  - **Speech**: Records with `AudioRecorder` + silence detection and mic tester, dynamic recording limit from verse length, preview + editable transcription before grading, and navigation blocking while recording. Grading is local/naive; transcription goes through `/api/transcribe`.
- **Read mode**: Splits sanitized text by punctuation, reveals fragments stepwise, and requires reassembling the citation bubbles before marking "read." CTA routes back to practice with the same range.
- **Progress & Memorization**: History lives in ProgressList (snippets, last attempt time, completion badges). Clearing history resets mode completions. `lastSelectedVerseId` reopens the last passage. Memorized passages require all four modes at 3x100%.
- **Repaso**: Unlocked for memorized (built-in) passages only. `/repaso` lists memorized items; **Rally** shuffles rounds across Sequence/Stealth/Type/Speech/Citas and requires 100% to advance (with an option to skip Speech). **Citas** drills "where is this passage?" using the book index; both sessions track completion and allow restarting.

## Data & Storage
- **Bible data**: `public/bible_data/_index.json` lists books; `<book>.json` is `string[][]` (chapters -> verses). Text is sanitized client-side (strip `/n`, underscores, collapse whitespace). `version.json` drives search cache invalidation.
- **Progress** (`bm_progress_v1`): Stored in `localStorage` and mirrored to IndexedDB (`bm_progress_db` -> `kv`). Shape matches `ProgressState`:
  - `verses[verseId]`: `reference`, `translation`, optional `text`, `source` (`built-in|custom`), `attempts` (with diff tokens plus speech/stealth/sequence stats), and `modeCompletions`.
  - `saved[verseId]`: snapshot of the verse plus `start`/`end` and `savedAt`.
  - `lastSelectedVerseId`: used to reopen the last selection in practice/mode routes.
- **Caches & flags**: Verse search cache lives at `bible_search_index_v1` with version key `bible_search_version`. Large-range warning opt-out is `bm_skip_large_selection_warning`. All access goes through `lib/storage.ts` (mirrors to IndexedDB and rebuilds `modeCompletions` on load).

## API & Integrations
- **POST `/api/transcribe`**: Multipart form with `audio` and optional `language` (`es` default). Rejects files >25MB or unsupported MIME (`mp3/mp4/m4a/wav/webm`). Calls `WhisperService` (`gpt-4o-transcribe`) and returns `{ success, transcription, language, duration, segments }`. Currently ignores any `expectedText` and logs filename/type/size to the server console; runtime is not forced to `nodejs`.
- No AI feedback endpoint is present; all grading is client-side and naive.
- Requires `OPENAI_API_KEY` in `.env.local` for Speech Mode and the API route.

## Development

```powershell
npm install
npm run dev
```

Run the local grading tests:

```bash
node --test tests/grade.test.js
```

**Required for Speech Mode**: Create a `.env.local` with:

```bash
OPENAI_API_KEY=sk-...
```

**OpenAI API usage:**
- **Speech transcription**: `/api/transcribe` (automatic in Speech Mode)
- Falls back gracefully if key missing (Speech Mode will show error)

**Supabase (sync/orgs - future work)**: Add Supabase credentials to `.env.local` when enabling sync or org features:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
# Server-only, never exposed to the client:
SUPABASE_SERVICE_ROLE_KEY=...
# Client flag to allow queuing sync payloads:
NEXT_PUBLIC_ENABLE_SYNC=true
```

Health check route (server-only): `GET /api/db-health` reports connectivity and whether the schema exists.
Sync scaffolding (early): `POST /api/sync-progress` (push attempts/saved passages), `GET /api/pull-progress` (pull aggregates). Feature-flagged by `NEXT_PUBLIC_ENABLE_SYNC`.

Sync client helpers:
- `enqueueAttemptForSync({ verse, attempt, userId })` queues attempts (feature-flagged).
- `flushOutboxToServer(userId)` pushes queued attempts to `/api/sync-progress`.
- On login, a one-time snapshot push sends all local attempts/saved passages to Supabase; ongoing pull is currently disabled to keep onboarding simple.
- Logged-in users still persist attempts locally (`bm_progress_v1` + IndexedDB) for fast UI/offline; server sync uses deterministic attempt ids, so local storage does not conflict with Supabase inserts.

Server data note: `/api/sync-progress` now stores attempt payloads (including diff tokens and verse text/transcription) in `verse_attempts` for history backup. Built-in verses remain shipped in the client bundle; text is stored only as user-specific snapshots for sync/recovery.

Visit <http://localhost:3000>

## API Endpoints

### Speech Transcription API
`POST /api/transcribe`

Multipart form data:
- `audio`: Audio file (WebM, WAV, MP3, etc.)
- `expectedText`: Target verse text (optional, improves accuracy)
- `language`: Language code (default: 'en')

```json
{
  "success": true,
  "transcription": "For God so loved the world...",
  "language": "es",
  "duration": 12.5
}
```

**Features:**
- Supports multiple audio formats (WebM, WAV, MP3, MP4, etc.)
- Biblical context enhancement for improved accuracy
- 25MB file size limit
- Automatic format cleanup for OpenAI compatibility

## Persistence

LocalStorage key `bm_progress_v1`:

```jsonc
{
  "verses": {
    "<verseId>": {
      "reference": "Jn 3:16",
      "translation": "ES", 
      "text": "Porque de tal manera amó Dios al mundo...",
      "attempts": [
        {
          "ts": 1732300000000,
          "mode": "type", // or "speech" / "stealth"
          "inputLength": 45,
          "accuracy": 92.3,
          "missedWords": ["mundo"],
          "extraWords": [],
          "feedback": "Great job!",
          "diff": [/* token diff array */],
          // Speech mode specific fields
          "transcription": "Porque de tal manera amo Dios al mundo...", 
          "audioDuration": 12.5,
          "confidenceScore": null
        }
      ],
      "source": "built-in"
    }
  },
  "lastSelectedVerseId": "juan-3-16-es"
}
```

## Speech Mode Workflow

1. **Select Speech Mode**: Toggle from Type Mode to Speech Mode
2. **Choose Verse**: Select any verse - recording limit automatically adjusts
3. **See Recording Info**: 
   - Dynamic limit based on verse length (75s - 4m)
   - Word count and estimated speaking time
4. **Record Audio**: 
   - Press Record button to start
   - Visual feedback with progress bar
   - Auto-stop at time limit or manual stop
5. **Review & Edit**: 
   - Whisper transcribes your speech
   - Review "What we heard" section
   - Edit transcription if needed (fix errors)
6. **Submit & Grade**: 
   - Click "Submit & Grade" 
   - Same accuracy scoring as Type Mode
   - Progress tracked in history

## Implementation Notes

- `/practice` is the real “home” view—the root route simply redirects there so the floating header, ProgressList, and Flow-based selector remain consistent across desktop and mobile.
- The Flow store (`components/mobile/flow.tsx`) drives book → chapter → verse → mode navigation; `BottomBar` enforces contiguous ranges and warns when a selection exceeds ~6 verses / ~120 estimated words (opt-out stored under `bm_skip_large_selection_warning`).
- Verse search preloads the entire Bible JSON dataset for instant local filtering, AND/OR/NOT syntax, and “Juan 3:16-19” parsing. Keep its memory cost in mind if you expand it.
- Read Mode (`/practice/read`) reveals sanitized fragments sequentially and requires users to rebuild the citation (book/chapter/verses) via interactive bubbles before calling the passage “read”.
- Each practice card writes attempts into `bm_progress_v1` along with diff tokens and per-mode completion counters (3 perfect runs per mode). Sequence Mode chunks text via `chunkVerseForSequenceMode`, Stealth relies on `HiddenInlineInput`, Speech integrates `AudioRecorder` + Whisper, and Type includes time-limited peeks.
- Diff rendering/History is centralized (`components/history.tsx` + `components/diff-renderer.tsx`), so reuse those helpers whenever you add new attempt visuals.

## Current Caveats & Next Steps

1. Verse search eagerly loads every book JSON on the client. If you extend it, consider async strategies (Web Worker, API endpoint, or per-book lazy loading) to reduce memory pressure.
2. Speech Mode submits `expectedText` with the transcription request, but `/api/transcribe` currently ignores it. Thread the text into `WhisperService`’s prompt if you touch that route.
3. The transcription route logs filename/type/size for every upload. Strip or guard those logs before shipping production builds to avoid leaking metadata.
4. Neither `/api/transcribe` nor `/api/ai-feedback` declares `export const runtime = 'nodejs'`; add it when editing those files so Next.js never deploys them to the Edge runtime.
5. `/api/ai-feedback` exists but nothing calls it yet. If you want richer coaching, wire it into Type/Speech results (with opt-in) instead of relying solely on the naive grader.

## Browser Requirements

- **Microphone access** required for Speech Mode
- **Modern browser** with MediaRecorder API support:
  - Chrome 47+ ✅
  - Firefox 29+ ✅  
  - Safari 14.1+ ✅
  - Edge 79+ ✅
