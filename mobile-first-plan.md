# Mobile-First Revamp Plan

## 1. Mission Statement
Rebuild the current single-page desktop‑leaning workflow into a focused, mobile‑first step flow that feels like a lightweight app:
Libro → Capítulo → Versículo(s) → Intento (Type Mode). Retain existing visual style (Tailwind tokens, cards, badges), improve clarity, reduce initial cognitive load, and optimize for one‑hand thumb use.

## 2. Core Goals
1. Progressive disclosure: only one major decision per screen.
2. Fast thumb navigation (bottom actions, large tap targets ≥44px).
3. Preserve current data + grading logic (no breaking storage schema).
4. Smooth transitions (no full page flashes)—client state machine.
5. Easy range selection on mobile (tap to start, tap to end; optional “Extender” button instead of Shift).
6. Offline-friendly (localStorage still).

## 3. Non-Goals (For Now)
- Adding user auth / cloud sync.
- Translation switching (Spanish only maintained).
- Redesigning visual theme (just re-layout & interaction).

## 4. Information Architecture & Navigation
Single top-level Next.js route (`/`) hosts a mobile step controller.
Optional deep-linkable hash/state query: `?step=chapter&book=GEN&c=1` for future direct entry.

State Machine Steps (enum UIFlowStep):
1. BOOK_SELECT
2. CHAPTER_SELECT
3. VERSE_SELECT (single or range building)
4. ATTEMPT (Type Mode)

Global persistent toolbar (mobile bottom bar) shows progress breadcrumbs + back.
Desktop breakpoint (md+) can still show dual-pane (left list, right attempt) for power users.

## 5. Screens (Mobile Focus)
### 5.1 Book Select
- Search input at top (auto-focus on mount). 
- Scrollable list of books (same dataset) with abbreviation + chapters count.
- Tap → transition to chapter select.

### 5.2 Chapter Select
- Header pill: Selected Book (with back arrow to books).
- Grid of chapter numbers (auto-fit columns min 48px square).
- Sticky bottom bar: “Continuar” disabled until chapter tapped (OR immediate advance on tap if preference simple).
- Swipe right/back or system back returns to book list.

### 5.3 Verse / Range Select
- Header: Book + Chapter + back arrow.
- Instructions concise ("Toca el primer versículo y luego el último para un rango.")
- List of verses (virtualized if needed; likely not necessary—most chapters < 176 verses but okay). Each line wrapped, number badge.
- Range model:
  - First tap: start & end = index.
  - Second distinct tap (higher or lower): set end; highlight inclusive range.
  - Third tap outside current range resets to new start.
  - Optional small inline action buttons appearing after first selection: [Extender ↑] [Extender ↓] for single-hand incremental range extension.
- Confirm button appears (sticky bottom) when at least one verse chosen.

### 5.4 Attempt (Type Mode)
- Header: Reference chips + back arrow (returns to verses maintaining range state).
- Toggle to peek text (Eye icon) remains.
- Textarea full-width, large font, autosize (cap at ~40% viewport height). Keyboard safe area consideration (iOS Safari).
- Submit button full-width primary below textarea.
- Result panel collapsible below after grading.
- Shortcut hints hidden by default on mobile (expandable “Atajos” disclosure for desktop).

## 6. Desktop Enhancement (≥ md)
- Keep existing two-column layout: left column hosts condensed multi-step vertical panel using an accordion for steps; right side attempt card.
- Reuse new components; step machine still canonical.

## 7. Component Breakdown
| Component | Purpose |
|-----------|---------|
| FlowController | Orchestrates step state, holds selection context. |
| BookListMobile | Search + list of books. |
| ChapterGridMobile | Grid for chapter selection. |
| VerseRangeMobile | Range selection logic & list rendering. |
| AttemptView | Existing TypeModeCard refactored for mobile wrappers. |
| BottomBar | Adaptive actions (cancel/back/continue/confirm/submit). |
| BreadcrumbChips | Shows current path: Libro > Capítulo > Versos. |
| RangeDisplay | Summarizes selected start-end + count. |
| TransitionWrapper | Handles fade/slide animations between steps. |

## 8. Data / State Model
```ts
interface FlowState {
  step: 'BOOK' | 'CHAPTER' | 'VERSE' | 'ATTEMPT';
  book?: BookIndexEntry;
  chapter?: number; // 1-based
  verseStart?: number; // 1-based
  verseEnd?: number;  // 1-based
  passage?: Verse; // built once confirmed (holds aggregated text)
}
```
Derived reference builder: `${book.shortTitle} ${chapter}:${verseStart}${verseEnd&&verseEnd>verseStart? '-' + verseEnd: ''}`

State transitions guard invariants (can't enter CHAPTER without book, etc.). Replace imperative prop drilling with a reducer or Zustand store (lightweight) to reduce prop chains. Keep localStorage sync when passage created / attempts performed.

## 9. Interactions & Gestures
- Back swipe (optional future; fallback is explicit arrow/back button).
- Tap on verse numbers: select / extend range.
- Long press on selected range: show context sheet (Reset range, Expand up/down).
- Animations: Use `framer-motion` (optional) for slide left/right (book→chapter→verse→attempt). If not adding dep, simple Tailwind transitions + conditional rendering.

## 10. Accessibility
- Each step has an `<h1>` or aria-level heading for screen readers.
- Maintain focus trap on mounted step; auto-focus first interactive element (search, chapter grid container, verse list, textarea).
- Back buttons are real `<button>` with `aria-label`.
- Range selection announces live region: "Verso X seleccionado" / "Rango X-Y".
- Color contrast: follow existing palette (verify yellow punctuation highlight). Add outline on focus visible.

## 11. Styling Guidelines
- Maintain spacing scale. Increase mobile tap targets: `min-h-[44px]` for list items / grid cells.
- BottomBar fixed: `fixed bottom-0 inset-x-0 z-40 backdrop-blur bg-white/85 dark:bg-neutral-950/85 border-t`.
- Provide safe-area padding: `pb-[env(safe-area-inset-bottom)]`.

## 12. Performance Considerations
- Lazy load book JSON only when entering CHAPTER of a book (already done similar).
- Verse list: simple list is fine; optionally `react-virtual` (only if perf issues appear).
- Avoid remounting attempt component when navigating back from attempt to verses (keep in memory or rehydrate from localStorage).

## 13. Migration Strategy
1. Extract current data/util logic unaffected (already stable).
2. Introduce FlowController + new mobile components side-by-side WITHOUT removing old VersePicker yet (feature flag `MOBILE_FLOW=true`).
3. Port book selection into BookListMobile.
4. Add ChapterGridMobile referencing existing dataset loader.
5. Implement VerseRangeMobile with current cleanText logic.
6. Build passage aggregator & confirm to produce Verse object (same shape as before) -> open AttemptView (wrap existing TypeModeCard logic; possibly refactor for prop differences).
7. Add BottomBar adaptive actions.
8. Add breadcrumb chips.
9. QA on small viewport (iPhone SE width 375 → Pixel 390). Test keyboard overlay & scroll.
10. Remove legacy VersePicker after parity confirmed.
11. Update README with new UX description + screenshots.

## 14. Incremental Deliverables
- D1: Flow skeleton + book list.
- D2: Chapter grid + navigation.
- D3: Verse range selection + confirm.
- D4: Attempt integration (reuse grading).
- D5: Bottom bar, breadcrumbs, animations.
- D6: Accessibility polish & cleanup, remove old components.

## 15. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Range selection confusion w/out Shift | Mis-selection | Clear inline instructions + dynamic hints + long press menu. |
| Keyboard overlaps submit button | Incomplete submissions | Use `scroll-margin-bottom` + bottom padding to ensure textarea visible; maybe sticky submit. |
| State loss on refresh mid-flow | User annoyance | Persist partial selection (book/chapter/verses) in localStorage each step. |
| Animation jank | Perceived slowness | Minimal transitions (150–200ms) & avoid heavy libs unless needed. |
| Increased bundle size | Performance | Avoid new heavy dependencies unless justified (framer-motion optional). |

## 16. Analytics / Success Metrics (Future optional)
Local ephemeral counters (no tracking backend):
- Time from book select to attempt start.
- Abandoned steps (book chosen but no chapter, etc.).
- Distribution of range sizes.

## 17. Open Questions
- Need desktop toggle to show multi-step vs legacy? (Probably not; replace fully.)
- Should we allow multi-chapter passage ranges later? (Out of scope now.)
- Dark mode onboarding hint? (Maybe small tooltip the first time.)

## 18. Task Checklist (Engineering)
- [x] Create FlowController & route integration (flagged via `NEXT_PUBLIC_MOBILE_FLOW`).
- [x] Add reducer for flow state (decided lightweight reducer; Zustand deferred unless complexity grows).
- [x] Implement BookListMobile (book index load + filter + select → chapter step).
- [x] Implement ChapterGridMobile (grid with navigation & back).
- [ ] Implement VerseRangeMobile (range logic, a11y live updates) — placeholder stub present.
- [ ] Passage builder & selection persistence.
- [x] AttemptView wrapper (basic reuse of TypeModeCard; needs header/back polish & range context chips).
- [ ] BottomBar dynamic actions: Back / Confirm / Empezar / Enviar / Reintentar.
- [ ] Breadcrumb chips component.
- [ ] Animations pass (enter/exit slide).
- [ ] Accessibility audit.
- [ ] LocalStorage partial state persistence for in-progress selection.
- [ ] Remove old VersePicker & unused props once parity reached.
- [ ] README update (screenshots & flow description).

### Progress Notes (Update 1)
Initial skeleton shipped. Core navigation for Book → Chapter works; Verse and Passage creation not yet functional (stub). Attempt view wired but only accessible after manual passage injection (not yet automated). Next priority: implement VerseRangeMobile with range tap logic and passage aggregation, then BottomBar + breadcrumbs for clearer navigation.

## 19. Pseudocode Sketch
```tsx
function FlowController() {
  const [state, dispatch] = useFlow();
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-20"> {/* space for bottom bar */}
        <TransitionWrapper step={state.step}>
          {state.step==='BOOK' && <BookListMobile onSelect={book=>dispatch({type:'SET_BOOK', book})} />}
          {state.step==='CHAPTER' && <ChapterGridMobile book={state.book!} onSelect={c=>dispatch({type:'SET_CHAPTER', chapter:c})} />}
          {state.step==='VERSE' && <VerseRangeMobile book={state.book!} chapter={state.chapter!} onConfirm={(s,e,verseObj)=>dispatch({type:'SET_PASSAGE', start:s, end:e, passage:verseObj})} />}
          {state.step==='ATTEMPT' && <AttemptView passage={state.passage!} onExit={()=>dispatch({type:'BACK_TO_VERSES'})} />}
        </TransitionWrapper>
      </main>
      <BottomBar state={state} dispatch={dispatch} />
    </div>
  );
}
```

## 20. Styling Tokens to Reuse
- Cards, Badges, Progress unchanged.
- Introduce utility classes: `.slide-in-left`, `.slide-in-right` (Tailwind + keyframes) or motion component.

## 21. Testing Scenarios
- Book → Chapter → Verse (single) → Attempt; back from attempt retains typed text (optional?) or clears? (Decide: clear on revisit.)
- Range selection large (50 verses) scroll performance.
- Rapid navigation back (double tap back) state consistency.
- Punctuation diff display still works post-refactor.

## 22. Dep Changes (Tentative)
- Optional: `zustand` (2KB gz) or keep in-context reducer.
- Optional: `framer-motion` (bigger; only if animations truly needed).

## 23. Rollout Strategy
1. Implement behind an environment flag.
2. Manual QA (mobile device & dev tools).
3. Swap default after parity.
4. Remove flag + cleanup.

## 24. Next Immediate Steps
- Confirm acceptance of plan / adjust open questions.
- Start with FlowController skeleton + BookListMobile.

---
End of Plan.
