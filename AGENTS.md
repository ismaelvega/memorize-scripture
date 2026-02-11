# AGENTS.md - Working Guide for AI Coding Agents

This repository hosts a Next.js 16 + React 19 TypeScript app for Spanish scripture memorization. This guide sets expectations, code style, and safe change practices for agents working in this repo.

Scope: This file governs the entire repo unless the user explicitly requests otherwise.

## Project Overview
- Mobile-first practice flow under `/practice` with four modes: Type, Speech, Stealth, Sequence.
- Read Mode and Read Aloud Mode for guided practice (`/practice/read`, `/practice/read/aloud`).
- Repaso section for memorized passages only (`/repaso` with Rally and Citas).
- Local-first persistence with `localStorage` and IndexedDB, plus optional Supabase sync when enabled.
- Speech transcription via OpenAI Whisper through `/api/transcribe`.

Framework versions (source of truth): `package.json`
- Next.js 16.0.7
- React 19.1.0

## Repo Structure (Key Paths)
- `app/layout.tsx` - Root layout (fonts, providers, analytics).
- `app/page.tsx` - Home screen, login/profile entry, and progress summary.
- `app/practice/page.tsx` - Server component that fetches remote progress rows (if logged in).
- `app/practice/practice-client.tsx` - Practice hub UI, flow header, progress list, saved passages.
- `app/practice/[mode]/page.tsx` - Mode route (server), preloads remote attempts.
- `app/practice/read/page.tsx` - Read mode.
- `app/practice/read/aloud/page.tsx` - Read aloud mode.
- `app/repaso/*` - Repaso hub + Rally + Citas.
- `app/(auth)/*` - Auth pages (signup/login/reset/confirm).
- `components/*` - Feature components for each mode and shared UI.
- `components/mobile/*` - Mobile selection flow (book/chapter/verse/mode + search).
- `components/ui/*` - Reusable UI primitives (Radix + CVA patterns).
- `lib/*` - Shared logic: grading, diffing, storage, sync, supabase clients, utilities.
- `public/bible_data/*` - Bible JSON dataset and version file.
- `tests/*` - Node tests for grading and sequence chunking.

## Core Flows and State Ownership
### Practice Selection Flow
- Store: `components/mobile/flow.tsx` (Zustand) is the single source of truth.
- Steps: ENTRY -> BOOK -> CHAPTER -> VERSE -> MODE, plus SEARCH.
- Entry points: from ProgressList, Saved, Search, or Browse.

### Practice Mode Routing
- Server route: `app/practice/[mode]/page.tsx` preloads remote attempts (if logged in).
- Client mode UI: `components/type-mode-card.tsx`, `components/speech-mode-card.tsx`, `components/stealth-mode-card.tsx`, `components/sequence-mode-card.tsx`.
- Navigation blocking:
  - Type/Stealth/Sequence use `onAttemptStateChange`.
  - Speech uses `onBlockNavigationChange` during recording/transcription.

### Read + Read Aloud
- Both read mode pages load the selected passage from `bm_progress_v1` and re-fetch built-in text from `public/bible_data` when needed.
- Query params drive selection (`id`, `start`, `end`).

### Repaso
- Only built-in passages qualify (custom verses excluded).
- A passage is memorized when all four modes have 3 perfect attempts.
- Rally shuffles modes across memorized passages; Citas drills references.

## Data and Storage
### Local Storage
- Key: `bm_progress_v1` (see `lib/types.ts` and `lib/storage.ts`).
- Shape: `ProgressState` with `verses`, `saved`, and `lastSelectedVerseId`.
- Attempts include per-mode fields (speech, stealth, sequence) and diff tokens.
- Mode completion counters are stored under `modeCompletions` and rebuilt if missing.

### IndexedDB
- `bm_progress_db` with store `kv` mirrors the progress state (`lib/idb.ts`).
- Bible search cache: `bible_search_index_v1` and `bible_search_version` (see `components/mobile/verse-search-mobile.tsx`).
- `public/bible_data/version.json` controls invalidation of the search index.

### Diff and Grading
- Diff tokens are generated in `lib/utils.ts` with statuses: `match`, `missing`, `extra`, `punct`.
- Grading uses `lib/grade.ts` (naive, offline-capable).

### IDs and Verse Text
- Verse IDs encode book/chapter/start/end/translation (e.g. `juan-3-16-16-rv1960`).
- Built-in text is sanitized in `lib/sanitize.ts` (removes `/n`, underscores, extra whitespace).

## APIs and Integrations
### API Routes
- `POST /api/transcribe` - Whisper transcription. Validates size and MIME; uses `lib/whisper-service.ts`.
- `POST /api/sync-progress` - Push attempts and saved passages to Supabase.
- `GET /api/pull-progress` - Pull progress and saved passages from Supabase.
- `GET /api/pull-attempts` - Pull attempts for a verse from Supabase.
- `GET /api/db-health` - Supabase health check.
- `GET /api/auth/verify` - Supabase email verification helper.

### OpenAI Whisper
- Implemented in `lib/whisper-service.ts` using `gpt-4o-transcribe`.
- Supported MIME types: mp3, mpeg, mp4, m4a, wav, webm.
- 25MB size limit enforced in both route and service.
- Always call Whisper from server routes, not client components.
- When creating or modifying OpenAI-backed routes, set `export const runtime = 'nodejs'`.

### Supabase
- Client: `lib/supabase/client.ts` (browser).
- Server: `lib/supabase/server-client.ts` and `lib/supabase/server.ts` (service role).
- Sync: `lib/sync-service.ts`, `lib/sync-outbox.ts`, `lib/sync-merge.ts`.
- Sync is feature-flagged via `NEXT_PUBLIC_ENABLE_SYNC`.

## Environment Variables
Required for speech:
- `OPENAI_API_KEY`

Supabase (optional, for auth/sync):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ENABLE_SYNC` ("true"/"false")

## Development and Testing
- `npm run dev` (Turbopack)
- `npm run build`
- `npm run lint`
- `node --test tests/grade.test.js`
- `node --test tests/sequence-duplicates.test.js`

Agent guidance: do not run npm commands automatically during assisted sessions; suggest them to the user instead.

## Coding Conventions
- TypeScript strict mode is on. Avoid `any` and update shared types in `lib/types.ts`.
- Use path aliases (`@/components`, `@/lib`, etc.).
- Keep client/server boundaries clean (`"use client"` in client components only).
- Use `lib/storage.ts` helpers for progress; do not touch `window.localStorage` directly.
- Reuse `components/ui` primitives and `cn`/`classNames` from `lib/utils.ts`.
- Preserve Spanish UI copy; avoid changing strings unless required.
- Clean up side effects (timers, listeners) on unmount to avoid navigation issues.

## Performance Guidance (Vercel Best Practices)
- Avoid async waterfalls; start independent work early and `await` late.
- Parallelize independent data fetching with `Promise.all`.
- Keep server-to-client props minimal to reduce serialization cost.
- Use dynamic imports (`next/dynamic`) for heavy components.
- Avoid barrel imports in performance-critical paths.
- Memoize expensive derived data; keep effect dependencies primitive.
- Deduplicate client-side requests; avoid duplicate global event listeners.

## Safe-Change Checklist
- If you add fields to stored data, update `lib/types.ts`, `lib/storage.ts`, and any mapping helpers in `lib/utils.ts`.
- If you add a new diff token status, update the grading and rendering pipeline.
- If you change Bible data, bump `public/bible_data/version.json` and consider reindex costs.
- If you modify practice modes, keep navigation-blocking and accessibility behavior intact.
- If you edit OpenAI or Supabase routes, ensure validation, defensive errors, and runtime settings are correct.
