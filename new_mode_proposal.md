# Bubble Sequence Mode — Proposal

## Concept
- Introduce a Duolingo-style practice option where a verse is segmented into short chunks (“bubbles”), and the learner must tap the bubbles in the correct order to reconstruct the passage.
- Target users who benefit from visual recognition and ordering exercises; complements Type, Speech, Stealth, and Read modes.
- Reuse existing grading/storage flows so attempts stay consistent across history and analytics.

## User Flow
- Entry: selectable from the practice mode list (`ModeSelector`, `ModeSelectionMobile`) after choosing a verse.
- On load, verse text is tokenized into ordered chunks (configurable length, e.g., 2–4 words). Bubbles are shuffled and displayed.
- Learner taps a bubble:
  - If the bubble matches the next required chunk, it animates into the growing reconstruction area.
  - If incorrect, surface a toast (“Ese fragmento no va aquí”) and optionally mark the bubble with a brief shake.
  - After a correct selection, remaining bubbles reshuffle to avoid positional bias.
- No hints surface, even after repeated mistakes, to maintain challenge consistency with other modes.
- Completion: final chunk triggers success state, reveals the completed verse, pushes attempt to local history, and offers retry/change verse buttons.
- Reset: “Reiniciar” clears progress and regenerates bubbles; “Cambiar versículos” returns to the selector.

## UI & Interaction Notes
- Layout: grid/flex of pill buttons (reuse `components/ui/button` variants with a new `bubble` style).
- Selected trail: show ordered chips or a responsive bar displaying the assembled verse; maintain `aria-live="polite"` to announce progress.
- Feedback: use toast system plus inline visual cues (success color for correct sequence, subtle shake for errors).
- Mobile-first: ensure bubble grid wraps nicely, minimum touch target 44 px, and keep controls accessible within thumb reach.

## Data & Types
- Extend `PracticeMode` union in `lib/types.ts` with a new identifier, e.g., `'sequence'`.
- Shared attempt data (`Attempt`):
  - Store `selectedChunks: string[]` and `totalChunks`.
  - Track `mistakes` count for incorrect taps before completion.
  - Accuracy could derive from `(totalChunks - mistakes) / totalChunks * 100`, saved as integer 0–100.
- Add mode-specific metadata in attempts history rendering if needed (e.g., display “Secuencia” label).

-## Logic & Helpers
- Chunking helper (new util in `lib/utils.ts`):
  - Split verse into 3-word chunks, but break on punctuation boundaries so phrases stay natural.
  - Preserve punctuation with tokens; ensure compatibility with existing diff tokenizer.
  - Automatically adjust final chunk sizes to avoid single-word overflow on long verses.
- Shuffle helper can reuse existing `shuffleArray` if available, otherwise add a small Fisher-Yates utility.
- State machine within the new card:
  - `availableChunks: Chunk[]`
  - `currentIndex: number`
  - `selectionTrail: Chunk[]`
  - `mistakeCount: number`
- On correct pick: append chunk, remove from available, reshuffle remainder, increment index. On incorrect: increment mistakes, reduce accuracy (`(totalChunks - mistakes) / totalChunks`), and give feedback without mutating the sequence.

## Component Structure
- New client component `components/sequence-mode-card.tsx` (name TBD):
  - `"use client"` header.
  - Props consistent with other mode cards (`verse`, `onAttemptSaved`, etc.).
  - Uses `useEffect` to initialize chunks when verse changes, persists attempt upon completion via existing storage helpers (`upsertAttempt`).
  - Integrate `useToast` for feedback.
- Reuse `components/mobile/bottom-bar` patterns for controls; ensure keyboard accessibility (Enter/Space selects focus bubble).

## Integration Touchpoints
- `components/mode-selector.tsx` and `components/mobile/mode-selection-mobile.tsx`: include new card button.
- `components/mobile/flow.tsx`: add mode variant to reducer and navigation.
- `app/practice/[mode]/page.tsx`: support new dynamic route (Next 15 can reuse same page with switch on mode).
- `components/progress-list.tsx` and `components/history.tsx`: update labels/icons to recognize the new mode.

-## Persistence & History
- `lib/storage.ts`: ensure serialization handles new fields; default `mistakes` to 0 to avoid breaking older attempts.
- `History` view: display accuracy percentage and mistakes count. Convert selection trail back into a verse string, run through existing diff token logic, and mark only incorrect chunks in red to keep diff styling consistent with other modes.

## Accessibility
- Provide screen reader-friendly announcements on each correct/incorrect selection.
- Maintain focus order: allow navigation through bubbles via Tab, and trigger selection with Enter or Space.
- Consider high-contrast option and color-blind friendly cues (outline vs color).

## Testing Strategy
- Unit test chunking helper (`node --test tests/...` new suite).
- Verify localStorage integration by simulating attempt save and retrieval.
- Manual QA: practice flow navigation, resizing viewport, incorrect/correct sequences, retry, history display.
- Lint/TypeScript checks to ensure mode wiring is valid (`npm run lint`, `npm run build` suggested to user).

## Rollout Plan
1. Scaffold utilities and types (chunker, shuffle, type extensions).
2. Implement `SequenceModeCard` with local state and attempt saving.
3. Wire navigation and mode selection UI; add icons/copy.
4. Update history/progress components to surface attempts correctly.
5. QA & polish animations, toasts, copy, and accessibility.

-## Open Questions
- Should history display the selection order verbatim or collapse it into full sentences?
