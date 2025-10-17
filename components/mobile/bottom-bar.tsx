"use client";
import * as React from 'react';
import { shallow } from 'zustand/shallow';
import { useFlowStore } from './flow';
import { Button } from '@/components/ui/button';
import { LargeSelectionDialog } from '@/components/large-selection-dialog';

interface Props { buildPassage: () => void; canConfirmRange: boolean; }

export const BottomBar: React.FC<Props> = ({ buildPassage, canConfirmRange }) => {
  const { step, book, chapter, verseStart, verseEnd } = useFlowStore(
    (state) => ({
      step: state.step,
      book: state.book,
      chapter: state.chapter,
      verseStart: state.verseStart,
      verseEnd: state.verseEnd,
    }),
    shallow,
  );
  const goBack = useFlowStore((state) => state.back);
  const [showLargeDialog, setShowLargeDialog] = React.useState(false);
  const DONT_SHOW_KEY = 'bm_skip_large_selection_warning';
  if (step === 'MODE' || step === 'ENTRY' || step === 'SEARCH') return null;
  function back(){ goBack(); }
  function primary(){
    if (step === 'VERSE' && canConfirmRange) {
      try {
        const verseCount = (verseEnd != null && verseStart != null) ? (verseEnd - verseStart + 1) : 0;
        // estimate words conservatively: average ~12 words per verse
        const avgWordsPerVerse = 12;
        const estimatedWords = verseCount * avgWordsPerVerse;
        const skip = typeof window !== 'undefined' && window.localStorage.getItem(DONT_SHOW_KEY) === 'true';
        const isLarge = (verseCount > 6) || (estimatedWords > 120);
        if (isLarge && !skip) {
          setShowLargeDialog(true);
          return;
        }
      } catch {
        // ignore and proceed
      }
      buildPassage();
    }
  }
  const refLabel = (book && chapter && verseStart!=null && verseEnd!=null)
    ? `${book.shortTitle} ${chapter}:${verseStart}${verseEnd>verseStart? '-' + verseEnd: ''}`
    : '';
  const primaryLabel = step==='VERSE'
    ? (canConfirmRange ? (refLabel ? `Practicar ${refLabel}` : 'Practicar') : 'Selecciona')
    : 'Continuar';
  const showPrimary = step==='VERSE';
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur px-3 py-2 flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={back} disabled={step==='BOOK'} className="min-w-[90px]">Atrás</Button>
      {showPrimary && <Button size="sm" onClick={primary} disabled={!canConfirmRange} className="flex-1">{primaryLabel}</Button>}
      <LargeSelectionDialog
        open={showLargeDialog}
        onClose={() => setShowLargeDialog(false)}
        onReduce={() => { setShowLargeDialog(false); goBack(); }}
        onContinue={() => { setShowLargeDialog(false); if (typeof window !== 'undefined') window.localStorage.setItem(DONT_SHOW_KEY, 'true'); buildPassage(); }}
      />
    </div>
  );
};
