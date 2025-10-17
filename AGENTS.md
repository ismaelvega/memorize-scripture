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
  - `page.tsx` — landing page with quick navigation and the `ProgressList`.
  - `practice/` — FlowProvider-driven selector (book → chapter → verse → mode pick). Nested `/practice/[mode]/page.tsx` renders the actual Type/Speech/Stealth practice experiences.
  - `api/`
    - `grade/route.ts` — naive token diff grading (punctuation ignored in scoring).
    - `grade-llm/route.ts` — optional LLM-assisted grading using `gpt-5-nano` with local diff fallback.
    - `ai-feedback/route.ts` — concise Spanish feedback using `gpt-4o-mini`.
    - `transcribe/route.ts` — Whisper transcription with size/type validation and contextual prompts.
- `components/`
  - `ui/` — button, input, card, toast, progress, dialog, etc. (CVA variants + Radix wrappers).
  - `mobile/` — mobile practice flow: books, chapter grid, verse range picker, bottom bar, and attempt view.
  - Feature components: `progress-list`, `history`, `mode-selector`, `type-mode-card`, `speech-mode-card`, `stealth-mode-card`, `audio-recorder`, `hidden-inline-input`.
- `lib/`
  - `utils.ts` — `cn` helpers plus tokenization and diff logic (`diffTokens`, `diffTokensLCS`, punctuation helpers).
  - `storage.ts` — client `localStorage` helpers for `bm_progress_v1`.
  - `types.ts` — shared contracts for verses, attempts, grading, transcription, and app modes.
  - `whisper-service.ts` — OpenAI wrapper handling MIME cleanup, context prompts, and error translation.
  - `audio-utils.ts` — dynamic speech recording limit & formatting.
- `public/bible_data/` — Spanish Bible JSON: `_index.json` + `{book}.json` (chapters → verses). Text is sanitized in the client (strip `/n`, underscores, collapse whitespace).
- `types/` — additional type declarations (e.g., `lucide-react.d.ts` shim).

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
- Without the key, `/api/transcribe`, `/api/grade-llm`, and `/api/ai-feedback` will return errors and Speech Mode will surface toast failures.

## Data Contracts
- Bible index: `public/bible_data/_index.json` lists books. Each `{book}.json` is `string[][]` (chapters 1-indexed in UI). Client sanitizes verse strings by removing literal `/n`, underscores, and squashing whitespace.
- Progress storage uses `localStorage` key `bm_progress_v1`. Shapes live in `lib/types.ts`:
  - `Verse` carries `id`, `reference`, `translation`, `text`, and `source` (`'built-in' | 'custom'`).
  - `Attempt` tracks timestamps, mode (`'type' | 'speech' | 'stealth'`), `inputLength`, `accuracy` (0-100), missed/extra word arrays, optional `feedback`, `promptHints`, diff tokens, and Speech-specific fields (`transcription`, `audioDuration`, `confidenceScore`).
  - `StoredVerseProgress` stores `reference`, `translation`, optional `text` (for recovering custom verses), attempt history, and `source`.
  - `ProgressState` contains the `verses` map and the optional `lastSelectedVerseId`.
- `GradeResponse` and `TranscriptionResponse` define the API contracts returned by `/api/grade`, `/api/grade-llm`, `/api/ai-feedback`, and `/api/transcribe`.
- Diff tokens use statuses `match | missing | extra | punct`; extend `lib/utils.ts` if you add new statuses so grading and history stay in sync.
- If you must change persisted data, bump the key (e.g., `bm_progress_v2`) and migrate in `lib/storage.ts` without dropping existing attempts.

## Coding Conventions
- TypeScript
  - Strict mode is on. Avoid `any`; extend `lib/types.ts` for shared shapes.
  - Use path aliases (`@/components`, `@/lib`, etc.).
- React / Next.js
  - Add `"use client"` to client components.
  - Keep route handlers in `app/api/*` small and validated.
  - Preserve accessibility (ARIA, polite live regions, keyboard shortcuts) already present in Type/Speech cards and HiddenInlineInput.
- UI / Styling
  - Use Tailwind utility classes with the `cn`/`classNames` helpers.
  - Reuse/extend the primitives in `components/ui/*` (CVA-based variants).
  - Only touch `app/globals.css` for token tweaks that Tailwind cannot express; keep theme variables intact.
- Files and naming
  - Files are `kebab-case.tsx/ts`, components are `PascalCase`.
  - Feature components live in `components/`; route-specific controllers live in `components/mobile`.

## Client Experience
- **Home (`app/page.tsx`)** ofrece acceso directo a la práctica y al historial local.
- **Practice page (`app/practice/page.tsx`)** combina el `ProgressList` (inicio rápido por modo) con el flujo móvil de selección. `ProgressList` carga intentos desde `localStorage`, ordena por recencia y permite saltar directo a `/practice/<mode>?id=...`.
- **Practice selection flow (`app/practice`)** usa estado `FlowProvider` (BOOK → CHAPTER → VERSE → MODE). `BookListMobile` obtiene `_index.json` con filtro, `ChapterGridMobile` y `VerseRangeMobile` cargan los datos sanitizados (`/bible_data/<book>.json`), y `BottomBar` confirma el rango elegido. El selector de modo (`ModeSelectionMobile`) envía al usuario a `/practice/<mode>?id=...` donde ocurre el intento real.
- **Practice mode routes (`app/practice/[mode]/page.tsx`)** cargan el versículo guardado desde `localStorage` (query param `id`) y muestran la tarjeta correspondiente (`TypeModeCard`, `SpeechModeCard` o `StealthModeCard`). `ModeSelector` cambia entre modos con navegación del router; “Cambiar versículos” regresa al flujo de selección. Speech Mode avisa cuando hay un intento activo para evitar que navegación/botones rompan una grabación.
- **Type Mode (`components/type-mode-card.tsx`)** califica vía `/api/grade`. Las solicitudes abortan ~8s, los fallos muestran toasts Radix y los aciertos se guardan en progreso. El diff alimenta la visualización inline e historial; mantén alineada la expectativa de `History` si cambias los tokens.
- **Speech Mode (`components/speech-mode-card.tsx`)** graba audio con `AudioRecorder` (MediaRecorder con negociación MIME), aplica límites dinámicos desde `lib/audio-utils` y envía a `/api/transcribe` con timeout ~30s. Un guardado RMS evita clips silenciosos. El usuario puede previsualizar, editar la transcripción antes de calificar y reiniciar con “Record again”. Los intentos guardan transcripción, duración y diffs.
- **Stealth Mode (`components/stealth-mode-card.tsx`)** oculta el pasaje y usa `HiddenInlineInput` para validar cada palabra antes de revelarla. Los errores se muestran en rojo hasta corregirse; al completar, se revela el versículo.
- **Toasts (`components/ui/toast.tsx`)** proveen el hook global `useToast`. `ToastProvider` se monta en `app/layout.tsx`; usa `pushToast` para notificaciones y deja que el proveedor maneje el cierre.

## API Endpoints Guidelines
- `/api/grade` (naive): Tokenizes via `lib/utils.ts`, ignores punctuation for scoring, and returns `gradedBy: 'naive'`. Normalize new grading logic through `lib/utils.ts` so Type/Speech cards and history stay consistent.
- `/api/grade-llm`: Optional semantic grading using OpenAI Chat Completions (`gpt-5-nano`). Validates `OPENAI_API_KEY`, parses JSON, and falls back to the local diff when the model response is unusable.
- `/api/ai-feedback`: Returns a compact Spanish feedback block (`gpt-4o-mini`). Validate payload (`verseText`, `attemptText`) and cap the message under ~120 words.
- `/api/transcribe`: Accepts multipart audio (`audio`, optional `expectedText`, `language`), rejects files >25MB or unsupported MIME types, calls `WhisperService`, and maps OpenAI errors to friendly messages. Expose `runtime = 'nodejs'` when adding new OpenAI-powered routes.
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
- No automated tests exist. Validate manualmente:
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
- Audio uploads are handled in-memory for transcription—do not persist server-side.
- Enforce the 25MB audio limit and supported types in any new speech features; respond with 400/405 as appropriate.

## Reference Docs in Repo
- `README.md` — features, endpoints, and local usage
- `CLAUDE.md` / `CLAUDE.local.md` — extended development guidelines and patterns
- `STT-feature-plan.md`, `mobile-first-plan.md`, `feature.md` — design and implementation notes

Following this document keeps contributions consistent, safe, and easy to review. If a requested change conflicts with these rules, prefer confirming with the user, or isolate the change behind a feature flag/env.
