# UI Implementation Plan – Type Mode MVP

## 1. Objective
Deliver a minimal, production-ready (frontend only) Next.js (App Router) + Tailwind + shadcn/ui interface for Bible verse memorization with a single practice modality: **Type Mode**. Focus on clean UX, accessibility, offline-friendly persistence (localStorage), and graceful error handling. No real grading logic—call a placeholder `/api/grade` route.

## 2. Scope Summary
In-scope:
- Verse selection (built‑in seed + custom entry) and display with peek/hide.
- Type Mode practice workflow with hints, submission, grading display, diff visualization, retry/reset.
- Local persistence of attempts per verse (`bm_progress_v1`).
- History viewer with attempt details + clear history per verse.
- Accessible, responsive layout (2-column md+, stacked mobile).
- Keyboard shortcuts & a11y semantics.
- Placeholder API route returning deterministic mock.

Out-of-scope:
- Real AI/OpenAI integration.
- Authentication / multi-user sync.
- Advanced verse search / remote Bible API.

## 3. Requirements Mapping (Acceptance Criteria)
| # | Requirement | Plan Element |
|---|-------------|--------------|
|1|Select or paste verse on `/`|`VersePicker` with Command list + custom form; state lifted to `page.tsx`|
|2|Submit attempt -> render accuracy, missed/extra, diff, feedback|`TypeModeCard` handles form + fetch + result panels|
|3|Persist each successful submission|`saveAttempt()` in `lib/storage.ts` invoked on success|
|4|Reload restores selected verse + history|Hydration effect loads state + last selected verse (store verse id key) |
|5|Accessible labels, tooltips, keyboard shortcuts, empty/loading/error states|ARIA labels, `aria-live` region, tooltips via shadcn, keyboard handlers, skeletons & toasts|
|6|Responsive layout via shadcn + Tailwind|Layout container with grid/flex + order adjustments for mobile|

## 4. Data Models (lib/types.ts)
```ts
export interface Verse {
  id: string;              // slug: book-chapter-verse-translation
  reference: string;       // e.g., "John 3:16"
  translation: string;     // "KJV"
  text: string;
  source: 'built-in' | 'custom';
}

export interface Attempt {
  ts: number;
  mode: 'type';
  inputLength: number;
  accuracy: number;        // 0–100
  missedWords: string[];
  extraWords: string[];
  feedback?: string;
  promptHints?: { firstNWords: number };
  diff?: DiffToken[];      // optional store
}

export interface DiffToken { token: string; status: 'match' | 'missing' | 'extra'; }

export interface StoredVerseProgress {
  reference: string;
  translation: string;
  attempts: Attempt[];
}

export interface ProgressState {
  verses: Record<string, StoredVerseProgress>;
  lastSelectedVerseId?: string;
}

export interface GradeResponse {
  accuracy: number; // 0–100 or 0–1? -> We'll normalize to 0–100 at ingestion.
  missedWords: string[];
  extraWords: string[];
  paraphraseOk?: boolean;
  feedback?: string;
  diff?: DiffToken[]; // if absent, degrade gracefully
}
```

## 5. Local Storage Helpers (lib/storage.ts)
Functions:
- `loadProgress(): ProgressState` – parse or return default.
- `saveProgress(state: ProgressState)` – stringify.
- `appendAttempt(verse: Verse, attempt: Attempt)` – merges & persists.
- `clearVerseHistory(verseId: string)` – delete attempts array.
- Key constant: `BM_KEY = 'bm_progress_v1'`.
Error safe: try/catch wrap; no-throw; fallback to memory object.

## 6. Component Architecture
```
app/page.tsx (Client)
  ├─ <TopBar /> (inline inside page for simplicity)
  ├─ Layout wrapper (responsive)
  ├─ <TypeModeCard ... />   (practice + results + history trigger) [mobile order 1]
  └─ <VersePicker ... />    (selection + verse display)            [mobile order 2]
      └─ Command list (seed verses)
      └─ Custom verse form
      └─ Display card with peek/hide + actions

<TypeModeCard>
  ├─ Attempt textarea + controls (hint slider, reset)
  ├─ Submit button / loading
  ├─ Result panel (conditionally rendered)
  ├─ Inline aria-live region
  ├─ History section (collapsible) embedding <History attempts=...>

<History>
  ├─ List of attempts (reverse chronological)
  ├─ Each row -> open Dialog with diff + details
  ├─ Clear history button + confirm Dialog
```

## 7. Shared State Strategy
- `page.tsx` holds: `selectedVerse` (Verse | null), `progress` (ProgressState), `attempts` derived from progress for selected verse.
- Pass callbacks to children: `onVerseSelected(verse)`, `onClearSelection()`, `onNewAttempt(attempt)`.
- Avoid context for MVP; props suffice.

## 8. Built-in Seed Verses
Hardcode small array in `verse-picker.tsx` (or dedicated `seed-verses.ts` if cleaner):
```ts
[{ id:'john-3-16-kjv', reference:'John 3:16', translation:'KJV', text:'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', source:'built-in'},
 { id:'psalm-23-1-kjv', reference:'Psalm 23:1', translation:'KJV', text:'The LORD is my shepherd; I shall not want.', source:'built-in'}]
```

## 9. API Interaction (`/api/grade`)
- Client `fetch('/api/grade', { method:'POST', body: JSON.stringify({ targetText: verse.text, attemptText }), headers:{'Content-Type':'application/json'} })`.
- Normalize response: if `accuracy <= 1`, multiply by 100.
- Timeout fallback (AbortController 8s) -> surface toast on abort.
- Graceful degrade if missing `diff` (hide diff panel, show note "Diff unavailable").

### Placeholder Route Logic
Return deterministic pseudo-grading:
- Split both texts by whitespace, compute matches by position.
- Accuracy = (# matched tokens / target tokens) * 100.
- Missed = tokens in target where mismatch.
- Extra = tokens in attempt beyond length or mismatches where attempt token unused.
- Provide naive diff structure.

## 10. Result Rendering Logic
- Accuracy bar color: <60 warn (amber), 60–85 moderate (blue), >85 success (green). Map via utility.
- Missed words: Badge variant destructive/subtle variant? Use `variant="destructive"` or custom tinted; keep low-intensity red.
- Extra words: Secondary/outline small badges.
- Diff: Inline `<span>` tokens with classes: match (text-foreground/opacity-90), missing (bg-destructive/10 text-destructive line-through maybe placeholder token?), extra (bg-muted/50 text-muted-foreground). Keep scrollable if too long (max-h / overflow-x-auto?). Preserve punctuation.

## 11. History UI
- Collapsible (Accordion) or nested Card section labelled "History"; default closed if no attempts.
- Attempt row layout: timestamp (format: `HH:MM` + relative tooltip), accuracy mini progress (width 64px), details button.
- Details Dialog: show full diff, feedback, missed/extra lists, metadata (hint used, attempt length).
- Clear history: destructive button -> Dialog confirm -> call `clearVerseHistory`.

## 12. Persistence & Hydration
- `useEffect` on mount: load progress; if `lastSelectedVerseId` present and matches seed or custom stored verse text, restore selected verse using stored progress metadata + (for custom verse) embed verse text inside a `versesMeta` map or simply re-derive from attempts? Simpler: store verse info inside progress (already do) so we can reconstruct verse object (adding `id`, `reference`, `translation`, `text`, `source`).
- On verse selection: update `lastSelectedVerseId` + ensure verse present in `progress.verses` (create entry if new) -> save.
- On attempt save: append attempt array; save.

## 13. Hint Logic
- Control: segmented buttons 0 / 3 / 6 words.
- Derived hint snippet: first N tokens of verse text displayed above textarea (muted) or prefilled? We'll **display read-only hint** (not prefill) in a small muted line.
- Persist hint count per attempt in `promptHints.firstNWords`.

## 14. Keyboard Shortcuts
- `/` focus search input (Command component). Add keydown listener at `page.tsx` root.
- `Ctrl+Enter` (or Cmd+Enter) -> submit if enabled.
- `Esc` clear textarea if non-empty else blur.
- `Alt+P` toggle peek/hide verse text.
- Announce actions via subtle `aria-live` polite region.

## 15. Accessibility
- Each interactive control labeled (`aria-label` on icon buttons).
- Textarea labeled with `<label htmlFor>`.
- `aria-live="polite"` region for result summary ("Accuracy 87%. 2 missed words.").
- Dialogs: use shadcn primitives (already accessible). Ensure focus trap.
- Color contrast: rely on shadcn tokens; adjust classes if needed.
- Avoid color as sole indicator: include text (Accuracy 87%).

## 16. Loading & Error States
- Submitting: disable form controls; show spinner inside button; show skeleton placeholder for result block area if previous result absent.
- Error: Toast (title: "Grading failed", description + Retry button). Inline message in result area with small outline box.
- Network timeout: same as generic error, different description.

## 17. State Machines (Implicit)
TypeMode internal phases:
- idle (no attempt yet)
- typing (user entering)
- submitting (fetch in-flight)
- result (latest successful GradeResponse)
- error (last submission failed, allow retry while keeping draft)
Will manage with plain state variables: `status`, `result`, `error`.

## 18. Styling & Layout
- Root container: `px-4 md:px-8 py-6 max-w-6xl mx-auto grid gap-6 md:grid-cols-2`.
- Mobile order: practice card first using `md:order-none order-1` & verse picker `order-2`.
- Verse text: `text-base md:text-lg leading-relaxed`.
- Blurred/hidden: apply `blur-sm select-none` + gradient overlay or line clamp.

## 19. Utility Functions
- `tokenize(text: string): string[]` – split on whitespace preserving punctuation as separate tokens (regex like `/\w+|[^\s\w]+/g`).
- `formatTimestamp(ts)` -> localized short time + date tooltip.
- `accuracyColor(accuracy)` -> returns tailwind classes.
- Debounce optional? Not required; all immediate actions.

## 20. Error Mitigation
- Storage parse errors -> reset to empty default once; log to console.
- API mismatch (missing keys) -> compute fallback accuracy by naive compare attempt vs target; show fallback warning in toast.

## 21. Implementation Order
1. Types + storage helpers.
2. Placeholder API route.
3. Page scaffold & layout with empty components.
4. VersePicker (selection + custom form + peek/hide UI) with keyboard shortcuts integration.
5. TypeModeCard basic form (submit logs to console).
6. Hook up API call + display results.
7. Diff rendering + badges.
8. Persistence integration (append attempts, hydration).
9. History component with dialog.
10. Error + loading states, toasts.
11. Accessibility audit (labels, aria-live, tab order).
12. Polish (responsive, hint toggle, keyboard shortcuts, skeletons).
13. Final QA vs acceptance criteria.

## 22. Minimal Placeholder /api/grade Logic Outline
```ts
// Pseudocode
const targetTokens = tokenize(targetText)
const attemptTokens = tokenize(attemptText)
let diff: DiffToken[] = []
let matches = 0
for i in 0..maxLen:
  if target[i] === attempt[i]: diff.push({token: target[i], status:'match'}), matches++
  else if attempt[i] && !target[i]: diff.push({token: attempt[i], status:'extra'})
  else if !attempt[i] && target[i]: diff.push({token: target[i], status:'missing'})
  else { diff.push({token: target[i], status:'missing'}); if (attempt[i]) diff.push({token: attempt[i], status:'extra'}) }
accuracy = Math.round((matches / targetTokens.length) * 100)
missedWords = diff.filter(d=>d.status==='missing').map(d=>d.token)
extraWords = diff.filter(d=>d.status==='extra').map(d=>d.token)
```

## 23. Testing / Verification Plan
- Manual: Select built-in verse, type partial, submit -> accuracy < 100, missed listed.
- Retry with full correct text -> accuracy 100, no missed/extra.
- History shows 2 attempts with correct ordering.
- Reload page -> selected verse restored, history visible.
- Custom verse input -> use + practice -> persists distinct verse id.
- Clear history -> confirm -> list empties, localStorage updated.
- Keyboard shortcuts: `/`, `Ctrl+Enter`, `Esc`, `Alt+P` all verified.
- Mobile simulation: stacked order and spacing.
- Accessibility: Tab sequence logical; screen reader announces result via aria-live.

## 24. Future Enhancements (Not Implemented Now)
- Additional practice modes (Hide Words, Listening, Spaced Repetition scheduling).
- Cloud sync with user auth.
- Better diff algorithm (Levenshtein, word-level alignment, paraphrase detection).
- Import full Bible translations.
- Progressive Web App / offline caching.

## 25. Risk & Mitigation
| Risk | Mitigation |
|------|------------|
|Diff naive -> misleading tokens|Label as approximate; acceptable for placeholder|
|LocalStorage quota or corruption|Small data footprint; guard parse errors|
|Keyboard conflicts|Scope listeners carefully; ignore when dialogs open|
|Accessibility regressions|Use shadcn primitives; semantic tagging; test with SR|

## 26. Definition of Done
- All acceptance criteria satisfied.
- No TypeScript errors in new code (strict-ready patterns even if project not strict).
- UI visually consistent in light/dark (if theme present; otherwise neutral).
- No unhandled promise rejections in console.
- localStorage writes only on meaningful state changes.

---
This plan provides the blueprint for implementing the MVP. Next step: scaffold types, storage, API, then iterative UI assembly per Implementation Order.
