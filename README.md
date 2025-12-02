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
- Prereqs: Node 20+, npm/pnpm. Tailwind CSS v4 tokens live in `app/globals.css`; UI primitives are under `components/ui`.
- Install & run: `npm install`, `npm run dev` (Turbopack). Build: `npm run build`; start: `npm start`.
- Lint: `npm run lint`.
- Tests: `node --test tests/grade.test.js` (grading) and `node --test tests/sequence-duplicates.test.js` (Sequence duplicate handling); extra debug scripts live under `tests/`.
- All state is local to the browser; clearing storage wipes attempts and saved passages. No server-side profiles or sync exist.

## Known Gaps / Notes
- `/api/transcribe` should add `export const runtime = 'nodejs'` before deploying; consider passing `expectedText` into the Whisper prompt and trimming request logging for privacy.
- Speech Mode depends on client-side silence detection; the server does no content validation beyond size/type.
- Repaso and Rally exclude custom passages by design (only built-in verses count toward memorization).
