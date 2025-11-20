# AGENTS.md — Working Guide for AI Coding Agents

This repository hosts a Next.js 15.5 + React 19 TypeScript app for Scripture memorization in Spanish with Type, Speech, and Stealth practice flows. This guide sets expectations, code style, and safe change practices for agents working on this repo.

Scope: This file governs the entire repo. Follow these conventions for all changes unless the user explicitly requests otherwise.

## Project Overview
- Practice Scripture with typing, speech, and stealth (hidden prompt) modes through the mobile-first flow under `app/practice`.
- The home page surfaces local progress history with quick actions into práctica.
- Styling relies on Tailwind CSS v4 tokens in `app/globals.css` and ShadCN-inspired primitives under `components/ui`, plus a custom toast system.
- Speech features depend on the OpenAI Whisper API (via `/api/transcribe` and `lib/whisper-service.ts`). All progress lives in `localStorage` (`bm_progress_v1`).

## Repo Structure
- `app/`
  - `layout.tsx` — applies Geist fonts, imports `globals.css`, and wraps the tree in the toast provider.
-  `page.tsx` — immediately redirects to `/practice` so every session lands in the practice hub.
- `practice/` — FlowProvider-driven selector (book → chapter → verse → mode pick). Nested `/practice/[mode]/page.tsx` renders the Type/Speech/Stealth/Sequence practice experiences, and `/practice/read` muestra el modo lectura.
  - `api/`
    - `ai-feedback/route.ts` — concise Spanish feedback using `gpt-4o-mini`.
    - `transcribe/route.ts` — Whisper transcription with size/type validation (expected text is collected on the client but not yet forwarded to Whisper).
- `components/`
  - `ui/` — button, input, card, toast, progress, dialog, etc. (CVA variants + Radix wrappers).
  - `mobile/` — mobile practice flow: books, chapter grid, verse range picker, bottom bar, and attempt view.
  - Feature components: `progress-list`, `history`, `mode-selector`, `type-mode-card`, `speech-mode-card`, `stealth-mode-card`, `sequence-mode-card`, `audio-recorder`, `hidden-inline-input`.
- `lib/`
  - `utils.ts` — `cn` helpers plus tokenization and diff logic (`diffTokens`, `diffTokensLCS`, punctuation helpers).
  - `storage.ts` — client `localStorage` helpers for `bm_progress_v1`.
  - `types.ts` — shared contracts for verses, attempts, grading, transcription, and app modes.
  - `grade.ts` — shared naive grading helper used by Type/Speech cards (offline-capable).
  - `whisper-service.ts` — OpenAI wrapper handling MIME cleanup, context prompts, and error translation.
  - `audio-utils.ts` — dynamic speech recording limit & formatting.
- `public/bible_data/` — Spanish Bible JSON: `_index.json` + `{book}.json` (chapters → verses). Text is sanitized in the client (strip `/n`, underscores, collapse whitespace).
- `types/` — additional type declarations (e.g., `lucide-react.d.ts` shim).

## Implementation Notes & Current State
- `/practice` hosts the entire experience: the floating header reflects the Flow step, and `ProgressList` shows per-verse snippets, completion progress, and CTAs before opening the selector.
- The Flow store controls browse vs. search journeys; `BottomBar` enforces contiguous range selection and warns when the picked passage exceeds ~6 verses or ~120 words (opt-out stored in `bm_skip_large_selection_warning`).
- Verse search preloads the entire Bible dataset client-side; keep this in mind when adding features (it is memory-heavy but enables zero-latency local filtering, AND/OR/NOT syntax, and range parsing such as “Juan 3:16-19”).
- Read Mode chunks sanitized text by punctuation, allows stepwise reveal/replay, and requires users to complete citation bubbles (book/chapter/verse segments) before marking the passage as “read”.
- Practice cards:
  - Type Mode handles timed peeks (unlimited before typing, three timed after) and shows a celebration modal once the user hits three perfect attempts.
  - Speech Mode wires `AudioRecorder`, silent-audio detection, OpenAI Whisper transcription, mic-testing, and navigation blocking. Dynamic recording limits come from `lib/audio-utils.ts`.
  - Stealth Mode feeds `HiddenInlineInput` with sanitized words, tracks per-word stats (duration, mistakes, WPM), and also drives the citation bubbles.
  - Sequence Mode chunks sanitized text (`chunkVerseForSequenceMode`), guarantees the expected fragment is always available, normalizes duplicates, and animates correct placements with FLIP-style transitions.
- Diff rendering is centralized: `lib/utils.ts` tokenizes/sanitizes `<sup>` markers so History, Type, Speech, Stealth, and Sequence all display the same match/missing/extra/punct highlights.
- Persistent state lives entirely in the browser (`bm_progress_v1` via localStorage + IndexedDB). Mode completion counters track the number of 100% attempts per mode; once a mode hits three perfect runs the UI flags it as completed.

## Run, Build, Lint
- Install and run:
  - `npm install`
  - `npm run dev` (Turbopack)
  - `npm run build` / `npm start`
- Lint: `npm run lint`
- Next.js and TypeScript are strict; fix type errors at the source.
- **Never run npm commands** from the CLI during assisted sessions; surface them as suggestions for the user instead.

## Environment Variables
- Required for Speech Mode and AI endpoints: set `OPENAI_API_KEY=sk-...` in `.env.local` (never commit secrets).
- Without the key, `/api/transcribe` and `/api/ai-feedback` will return errors and Speech Mode will surface toast failures.

## Data Contracts
- Bible index: `public/bible_data/_index.json` lists books. Each `{book}.json` is `string[][]` (chapters 1-indexed in UI). Client sanitizes verse strings by removing literal `/n`, underscores, and squashing whitespace.
- Progress storage uses `localStorage` key `bm_progress_v1`. Shapes live in `lib/types.ts`:
  - `Verse` carries `id`, `reference`, `translation`, `text`, and `source` (`'built-in' | 'custom'`).
  - `Attempt` tracks timestamps, mode (`'type' | 'speech' | 'stealth' | 'sequence'`), `inputLength`, `accuracy` (0-100), missed/extra word arrays, optional `feedback`, `promptHints`, diff tokens, Speech-specific fields (`transcription`, `audioDuration`, `confidenceScore`), Stealth stats, and Sequence stats (`totalChunks`, `mistakes`, `selectedChunks`, `mistakeCountsByChunk`).
  - `StoredVerseProgress` stores `reference`, `translation`, optional `text` (for recovering custom verses), attempt history, and `source`.
  - `ProgressState` contains the `verses` map and the optional `lastSelectedVerseId`.
- `GradeResponse` and `TranscriptionResponse` definen los contratos que usa `gradeAttempt` y las rutas `/api/ai-feedback` y `/api/transcribe`.
- Diff tokens use statuses `match | missing | extra | punct`; extend `lib/utils.ts` if you add new statuses so grading and history stay in sync.
- If you must change persisted data, bump the key (e.g., `bm_progress_v2`) and migrate in `lib/storage.ts` without dropping existing attempts.

## Coding Conventions
- TypeScript
  - Strict mode is on. Avoid `any`; extend `lib/types.ts` for shared shapes.
  - Use path aliases (`@/components`, `@/lib`, etc.) and keep imports sorted (React/Next first, aliases next, relatives last).
  - Prefer pure helpers over inline casts; if you need to coerce, document why and add runtime guards (especially when reading from `localStorage`).
  - When shaping new data for storage/history, update `lib/types.ts`, `lib/storage.ts`, `lib/utils.ts`, and any tests in `tests/`.
- React / Next.js
  - Add `"use client"` to client components and keep server files server-only. Never import client-only utilities (e.g., `window`, `localStorage`) into server routes.
  - Keep route handlers in `app/api/*` small, validated, and explicitly set `export const runtime = 'nodejs'` if they talk to OpenAI.
  - Preserve accessibility (ARIA, polite live regions, keyboard shortcuts) already present in Type/Speech cards and HiddenInlineInput. Clean up effects on unmount to avoid blocking navigation.
  - Follow existing patterns for navigation locks: practice cards expose `onAttemptStateChange` to `/practice/[mode]` so unsaved work prevents accidental nav.
- UI / Styling
  - Use Tailwind utility classes with the `cn`/`classNames` helpers; avoid bespoke CSS unless Tailwind cannot express it.
  - Reuse/extend the primitives in `components/ui/*` (CVA-based variants) before adding ad-hoc buttons/cards.
  - Only touch `app/globals.css` for token tweaks that Tailwind cannot express; keep theme variables intact and color tokens aligned with Radix semantics.
  - Observe existing spacing/rounded styles; Flow/UI surfaces rely on the rounded-3xl shells for visual consistency.
- Files and naming
  - Files are `kebab-case.tsx/ts`, components are `PascalCase`.
  - Feature components live in `components/`; route-specific controllers live in `components/mobile`.
  - Co-locate helper hooks/utilities next to their feature unless they are shared (then move to `lib/`). Keep tests in `tests/` or `components/<feature>/__tests__` if they are component-specific.

## Development Guidelines & Patterns
- **Flow-driven UX**: Whenever you change the selection flow, update `components/mobile/flow.tsx` (state/actions) plus the consumers (`book-list`, `chapter-grid`, `verse-range`, `mode-selection`, `BottomBar`). Flow state is the single source of truth for which panels show.
- **Navigation locks**: All practice cards signal in-progress work via `onAttemptStateChange` (or `onBlockNavigationChange` for Speech). When adding new inputs, ensure you flip these flags so `/practice/[mode]` can warn before leaving.
- **Progress storage**: Always go through `loadProgress` / `saveProgress` / `appendAttempt` / `clearVerseHistory`. Mutate copies, update `modeCompletions`, and persist via the helper—never touch `window.localStorage` directly.
- **Diff rendering**: New grading logic should reuse `lib/utils.ts` tokenization/diff helpers so History and attempt cards stay consistent.
- **APIs & runtime**: Follow the existing `/api/transcribe` and `/api/ai-feedback` patterns—validate inputs, guard secrets, translate OpenAI errors, and add `export const runtime = 'nodejs'`.
- **Contextual prompts**: `extractBiblicalTerms` and `getRecordingLimitInfo` encapsulate domain heuristics. Extend them there when you need new names/limits instead of sprinkling constants through components.
- **Docs**: Update `CURRENT_STATUS.md` plus this guide when you introduce new flows, environment requirements, or architectural constraints—that keeps future agents aligned.

## Client Experience
- **Home (`app/page.tsx`)** ofrece acceso directo a la práctica y al historial local.
- **Practice page (`app/practice/page.tsx`)** combina el `ProgressList` (inicio rápido por modo) con el flujo móvil de selección. `ProgressList` carga intentos desde `localStorage`, ordena por recencia y permite saltar directo a `/practice/<mode>?id=...`.
- **Practice selection flow (`app/practice`)** usa estado `FlowProvider` (BOOK → CHAPTER → VERSE → MODE). `BookListMobile` obtiene `_index.json` con filtro, `ChapterGridMobile` y `VerseRangeMobile` cargan los datos sanitizados (`/bible_data/<book>.json`), y `BottomBar` confirma el rango elegido. El selector de modo (`ModeSelectionMobile`) envía al usuario a `/practice/<mode>?id=...` donde ocurre el intento real.
- **Practice mode routes (`app/practice/[mode]/page.tsx`)** cargan el versículo guardado desde `localStorage` (query param `id`) y muestran la tarjeta correspondiente (`TypeModeCard`, `SpeechModeCard`, `StealthModeCard` o `SequenceModeCard`). `ModeSelector` cambia entre modos con navegación del router; “Cambiar versículos” regresa al flujo de selección. Speech Mode avisa cuando hay un intento activo para evitar que navegación/botones rompan una grabación; Sequence Mode bloquea la navegación mientras la secuencia está en progreso.
- **Type Mode (`components/type-mode-card.tsx`)** califica localmente con `gradeAttempt` de `lib/grade.ts`, mostrando toasts ante errores y guardando los aciertos en progreso. El diff alimenta la visualización inline e historial; mantén alineada la expectativa de `History` si cambias los tokens.
- **Speech Mode (`components/speech-mode-card.tsx`)** graba audio con `AudioRecorder` (MediaRecorder con negociación MIME), aplica límites dinámicos desde `lib/audio-utils` y envía a `/api/transcribe` con timeout ~30s. Un guardado RMS evita clips silenciosos. El usuario puede previsualizar, editar la transcripción antes de calificar y reiniciar con “Record again”. Los intentos guardan transcripción, duración y diffs.
- **Stealth Mode (`components/stealth-mode-card.tsx`)** oculta el pasaje y usa `HiddenInlineInput` para validar cada palabra antes de revelarla. Los errores se muestran en rojo hasta corregirse; al completar, se revela el versículo.
- **Toasts (`components/ui/toast.tsx`)** proveen el hook global `useToast`. `ToastProvider` se monta en `app/layout.tsx`; usa `pushToast` para notificaciones y deja que el proveedor maneje el cierre.

## API Endpoints Guidelines
- `/api/ai-feedback`: Returns a compact Spanish feedback block (`gpt-4o-mini`). Validate payload (`verseText`, `attemptText`) and cap the message under ~120 words.
- `/api/transcribe`: Accepts multipart audio (`audio`, optional `expectedText`, `language`), rejects files >25MB or unsupported MIME types, calls `WhisperService`, and maps OpenAI errors to friendly messages. Expose `runtime = 'nodejs'` when adding new OpenAI-powered routes; the current handler does not yet forward `expectedText` to the Whisper prompt (consider doing so if you touch it).
- Keep API handlers defensive: validate inputs, handle aborts/timeouts, and never expose secrets to the client.

## Whisper Integration Notes
- `lib/whisper-service.ts` wraps `openai.audio.transcriptions.create`, cleans MIME types (removes codec suffixes), and rebuilds `File` instances for safer uploads.
- `extractBiblicalTerms` builds a Spanish proper-noun prompt (names, titles, abbreviations) to guide Whisper; limit new entries to relevant scripture vocabulary.
- Supported MIME types (`audio/mp3`, `audio/mpeg`, `audio/mp4`, `audio/m4a`, `audio/wav`, `audio/webm`) and the 25MB limit must stay aligned between the service and `/api/transcribe`.
- Speech Mode relies on `getRecordingLimitInfo` from `lib/audio-utils.ts`; adjust both limit and display formatting together.
- Never invoke the OpenAI SDK from client components—always go through API routes or the Whisper service.

## Accessibility
- Maintain `aria-live="polite"` regions in Type and Speech cards for grading feedback and keep keyboard shortcuts (Ctrl+Enter submit, Esc clear/reset).
- `HiddenInlineInput` gestiona el foco y la validación palabra por palabra en Stealth; conserva composición, caret y atajos cuando lo toques.
- Buttons, toasts, and dialogs come from accessible Radix wrappers—extend them consistently.

## Performance and UX
- Network calls use `AbortController` timeouts (8s for grading, 30s for transcription); respect and reuse these patterns.
- Toasts surface recoverable errors—prefer actionable retry actions where possible.
- Avoid large dependencies; reuse existing primitives and utilities for smooth mobile interactions.
- Optimistic updates should stay in sync with the local storage state to keep `ProgressList` accurate.

## Testing and Validation
- `node --test tests/grade.test.js` valida el motor de calificación local.
- Validate manualmente:
  - Recorre el flujo de práctica (libro → capítulo → versículo → intento) en modos Escritura y Voz.
  - Graba y califica un intento de voz (requiere `OPENAI_API_KEY`), incluyendo edición de transcripción.
  - Verifica las respuestas de las APIs y la forma persistida en `localStorage`.
- Run `npm run lint` and ensure TypeScript builds cleanly.

## Safe-Change Checklist (Do’s and Don’ts)
- Do
  - Work surgically; reuse existing utilities, flows, and UI primitives.
  - Keep `lib/types.ts`, `lib/utils.ts`, and `lib/storage.ts` in sync with any new fields or diff statuses.
  - Add runtime validation and clear errors in API routes; prefer toast-friendly failure states for the client.
  - Preserve Spanish copy across the UI, API responses, and prompts.
  - Update README if you alter UX flows or environment requirements.
- Don’t
  - Introduce server-rendered secrets into client code.
  - Break the `bm_progress_v1` schema without a migration strategy.
  - Alter global Tailwind tokens or reset styles without strong justification.
  - Bypass `/api/*` when calling OpenAI or Whisper (never call from client components).
  - Regress HiddenInlineInput/AudioRecorder focus management or keyboard affordances.

## Common Tasks for Agents
- Add a UI control: implement under `components/ui/` with CVA variants and import via `@/components/ui/...`.
- Extend the practice flow: adjust reducer/actions in `components/mobile/flow.tsx` (and `flow-controller`) and keep `BottomBar`, breadcrumbs, and mode toggles coherent.
- Update Type or Speech mode: touch `components/type-mode-card.tsx` / `speech-mode-card.tsx`, adjust shared helpers (`lib/utils.ts`, `lib/audio-utils.ts`, `lib/storage.ts`) as needed, and verify history rendering. When updating Speech Mode, keep the silent-audio guard, audio preview lifecycle, and `onBlockNavigationChange` wiring in sync so navigation prompts remain accurate.
- Add/modify an API route: create `app/api/<name>/route.ts`, validate inputs, set `runtime = 'nodejs'` when using OpenAI, and return shapes declared in `lib/types.ts`.

## Tooling Notes
- ESLint is permissive on a few rules (console allowed, hook deps warned). Keep hooks tidy and logs intentional.
- Tailwind v4 is imported via `@import "tailwindcss"` in `app/globals.css`; tokens drive the design system.
- Toasts are powered by Radix and `components/ui/toast.tsx`; use the provided `useToast` hook instead of re-implementing notifications.
- Path aliases live in `tsconfig.json` under `"@/*"`.

## Security & Privacy
- Never log or echo API keys. Keep client-facing errors generic and log details server-side only when safe.
- Avoid logging raw audio metadata in production—the current `/api/transcribe` logs filename/type/size, so strip or guard those if you touch the route.
- Audio uploads are handled in-memory for transcription—do not persist server-side.
- Enforce the 25MB audio limit and supported types in any new speech features; respond with 400/405 as appropriate.

## Reference Docs in Repo
- `README.md` — features, endpoints, and local usage
- `CLAUDE.md` / `CLAUDE.local.md` — extended development guidelines and patterns
- `STT-feature-plan.md`, `mobile-first-plan.md`, `feature.md` — design and implementation notes
- `CURRENT_STATUS.md` — living status doc summarizing architecture, key subsystems, known issues, and next steps.

Following this document keeps contributions consistent, safe, and easy to review. If a requested change conflicts with these rules, prefer confirming with the user, or isolate the change behind a feature flag/env.
