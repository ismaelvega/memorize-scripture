# CURRENT STATUS

## Product & Tech Overview
- Memorize is a Next.js 15 + React 19 mobile-first practice app with Tailwind CSS v4, OpenAI Whisper, and Zustand state, as described in the root README (README.md:1-69) and dependency list (package.json:1-34).
- The root route immediately redirects to the practice hub so the flow always starts at `/practice` (app/page.tsx:1-5), and the global layout wires in the Geist fonts plus Tooltip and Toast providers for consistent UI feedback (app/layout.tsx:1-32).
- Spanish scripture JSON lives in `public/bible_data`, following `_index.json` metadata and `{book}.json` chapter arrays (README.md:72-105). Text sanitation utilities remove `/n`, underscores, and stray tags before use (lib/sanitize.ts:1-42).
- Local practice metrics support Type, Speech, Stealth, Sequence, and Read modes. Three perfect attempts flag a mode as “completed,” and that target is surfaced throughout the UI (lib/completion.ts:1-120).

## Data & Persistence
- Bible content is bundled in static JSON under `public/bible_data`, loaded client-side via fetch from selectors and practice routes (components/mobile/book-list-mobile.tsx:24-70, components/mobile/verse-range-mobile.tsx:52-116, app/practice/[mode]/page.tsx:89-138).
- Verse search uses IndexedDB (`bm_progress_db`) to cache the processed Bible index, enabling offline search and instant load times. A `version.json` file controls cache invalidation (components/mobile/verse-search-mobile.tsx).
- User progress is stored in `bm_progress_v1`, mirrored in both localStorage and IndexedDB with background hydration so synchronous calls stay fast (lib/storage.ts:6-104). The store tracks attempts per verse plus per-mode completion counters and `lastSelectedVerseId` (lib/storage.ts:106-170).
- Debug helpers expose dump/clear/seed methods on `window.__bmStorageTools` during development for manual migration testing (lib/storage-debug.ts:1-86).

## Navigation & Selection Flow
- `/practice` renders a floating header with breadcrumb-aware titles and home/back controls that adapt to the current Flow step (app/practice/page.tsx:45-118).
- When no flow is open, the card list shows verse history, completion badges, CTA buttons for “Leer” and “Practicar,” and a delete confirmation (components/progress-list.tsx:39-438). Selecting a verse persists updated metadata into progress before opening the selector (app/practice/page.tsx:176-275).
- The Flow store orchestrates the BOOK → CHAPTER → VERSE → MODE pipeline with `selectionMode` toggles for browse vs. search (components/mobile/flow.tsx:1-118). Selection entry offers the two modes up front (components/mobile/selection-entry-mobile.tsx:1-78).
- Book list, chapter grid, and verse range panels focus on keyboard-friendly selection and sanitized verse previews. `VerseRangeMobile` caches book JSON per session and enforces contiguous selection logic before enabling the bottom CTA (components/mobile/verse-range-mobile.tsx:24-200).
- Long selections trigger a modal warning (>6 verses or ~120+ words) backed by `bm_skip_large_selection_warning` so users can opt out of future prompts (components/mobile/bottom-bar.tsx:1-78).
- Verse search eagerly loads the entire dataset, normalizes terms with accent-preserving variants, supports AND/OR/NOT syntax, reference parsing (`Genesis 1:1-5`, “Juan 3”) and paginates results with intersection observers for infinite scroll (components/mobile/verse-search-mobile.tsx:45-320).
- Mode selection runs inside a dialog that can nudge first-time users to Read Mode, surfaces per-mode completion counts, and lets users clear verse-specific history (components/mobile/mode-selection-mobile.tsx:1-210).
- `/practice/read` slices the selected chapter, sanitizes, and feeds `ReadModeCard`, which reveals fragments one at a time, honors reduced-motion, and unlocks citation bubble exercises at the end (app/practice/read/page.tsx:1-167, components/read-mode-card.tsx:16-210).

## Practice Modes
- **Type Mode** renders the verse reference, textarea, inline diff, and peek controls. Attempts are graded offline via `gradeAttempt`, appended to storage, and celebrated via a modal once the user hits 3 perfect tries. Peek windows grant unlimited previews before typing and up to three timed looks after typing begins (components/type-mode-card.tsx:31-420, lib/grade.ts:1-60).
- **Speech Mode** combines the custom `AudioRecorder`, silence detection, Whisper transcription, inline editing, audio playback, mic tester, abort handling, and completion tracking. Dynamic recording limits are calculated by verse length via `getRecordingLimitInfo`, and a runway ring plus cancel dialog protect long recordings (components/speech-mode-card.tsx:18-915, components/audio-recorder.tsx:1-220, components/microphone-tester.tsx:1-200, lib/audio-utils.ts:1-80).
- **Stealth Mode** hides the verse, feeding `HiddenInlineInput` with the sanitized word list. Each word tracks mistakes, durations, and typed variants so the final stats include WPM, attempts per word, streaks, and per-verse markers if `verseParts` is available. Peek behavior mirrors Type Mode and finishing unlocks citation bubbles (components/stealth-mode-card.tsx:1-720, components/hidden-inline-input.tsx:1-210, components/citation-bubbles.tsx:1-80).
- **Sequence Mode** chunks sanitized text into short fragments, randomizes a visible pool, accepts duplicates by normalizing punctuation, vibrates on errors, and animates correct placements with a FLIP transition. The final attempt stores diff data, per-chunk mistake counts, and also gates citation bubbles before showing the perfect-score modal (components/sequence-mode-card.tsx:1-520, lib/utils.ts:240-330).
- **Read Mode** (non-graded) uses `splitVerseByPunctuation` to build fragments, provides reveal/restart hotkeys, a “reveal all” fast-forward, and the same citation bubble step to cement references (components/read-mode-card.tsx:16-210, lib/utils.ts:202-230).
- All practice cards share the history panel (components/history.tsx:1-120) and diff renderer (components/diff-renderer.tsx:1-60), which scrub `<sup>` markers and highlight extra/missing tokens.

## Supporting Components & Utilities
- `ProgressList` shows recent verses with snippet previews, completion percentages, CTA buttons, and a destructive removal dialog (components/progress-list.tsx:39-438).
- `PeekModal` sanitizes verse HTML and enforces per-peek timers to prevent screenshotting full passages during an attempt (components/peek-modal.tsx:1-200).
- `HiddenInlineInput` repositions a hidden `<input>` over the active word, handles composition events, scroll locking, markers, and aria-live cues for Stealth Mode (components/hidden-inline-input.tsx:1-220).
- `AudioRecorder` wraps `MediaRecorder`, tracks RMS levels for visualizers, enforces max duration, and exposes imperative handles to Speech Mode (components/audio-recorder.tsx:1-220).
- `MicrophoneTester` grants a manual mic-check UI with RMS analysis, permission prompts, and warnings for silent inputs (components/microphone-tester.tsx:1-200).
- `DiffRenderer` removes `<sup>` tags, normalizes whitespace, and color-codes result tokens for History and attempt cards (components/diff-renderer.tsx:1-70).
- `lib/utils` houses canonical helpers: `tokenize`, `diffTokens`, punctuation-aware chunking for Sequence Mode, passage/verse formatting, and citation segment extraction (lib/utils.ts:31-430).
- `Footer` reiterates that all data is local-only via tooltip (components/footer.tsx:1-18).

## APIs & External Integrations
- `/api/transcribe` validates multipart uploads, enforces supported MIME types and the 25 MB limit, then calls the `WhisperService` wrapper. Errors are mapped to friendly client messages, but the route currently runs with the default runtime (app/api/transcribe/route.ts:1-103, lib/whisper-service.ts:1-140).
- Whisper calls use `gpt-4o-transcribe` with cleaned MIME types and optional prompt/temperature params, plus helpers to validate file size/type (lib/whisper-service.ts:32-140).
- Speech Mode submits `expectedText` alongside audio for future context-aware prompting, though the server route ignores that field at the moment (components/speech-mode-card.tsx:185-205, app/api/transcribe/route.ts:15-66).
- `/api/ai-feedback` is available for GPT-4o-mini critique blocks but is not yet wired into any UI surface, so all grading remains local (app/api/ai-feedback/route.ts:1-50).
- Environment requirements (OPENAI_API_KEY in `.env.local`) are spelled out in the README, along with test instructions (`node --test tests/grade.test.js`) (README.md:108-129, README.md:113-118).

## Testing & Tooling
- Node’s built-in test runner ensures the naive grading engine behaves across common punctuation/missing/extra cases (`node --test tests/grade.test.js`) (tests/grade.test.js:1-52).
- A focused script validates Sequence Mode’s duplicate fragment normalization using Ecclesiastes 3 patterns (tests/sequence-duplicates.test.js:1-75).
- TypeScript is in strict mode with the Next.js plugin and project references for `@/*` aliases (tsconfig.json:1-27). ESLint extends `next/core-web-vitals` but relaxes some strictness (eslint.config.mjs:1-35).
- npm scripts are minimal: `dev`, `build`, `start`, `lint` (package.json:4-16). Agents should run them manually outside this session per AGENTS.md guidance.

## Known Issues & Opportunities
1. **Speech Mode sends `expectedText`, but the API ignores it.** The client appends context text (components/speech-mode-card.tsx:185-205), yet `/api/transcribe` never forwards it to Whisper (app/api/transcribe/route.ts:15-66). Hooking it into the prompt could boost accuracy for tricky names.
2. **Transcribe API logs raw file metadata.** `console.log` in the route includes filename, type, and size for every upload (app/api/transcribe/route.ts:19-23). Remove or gate these logs to avoid leaking user data in server logs.

## Suggested Next Steps
1. Thread `expectedText` (or a curated prompt from `extractBiblicalTerms`) into `WhisperService.transcribe` and add an explicit `runtime = 'nodejs'` constant for both OpenAI routes.
2. Audit logging in API routes and gate verbose output behind `NODE_ENV !== 'production'` to protect user privacy.