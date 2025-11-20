"use client";
import * as React from 'react';
import { shallow } from 'zustand/shallow';
import { useFlowStore } from './flow';
import { Button } from '@/components/ui/button';
import { LargeSelectionDialog } from '@/components/large-selection-dialog';
import { CheckCircle2 } from 'lucide-react';

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
  
  const showFAB = step === 'VERSE' && canConfirmRange;
  
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
  const primaryLabel = refLabel ? `Practicar ${refLabel}` : 'Practicar';
  
  if (!showFAB) return (
    <LargeSelectionDialog
      open={showLargeDialog}
      onClose={() => setShowLargeDialog(false)}
      onReduce={() => { setShowLargeDialog(false); goBack(); }}
      onContinue={() => { setShowLargeDialog(false); if (typeof window !== 'undefined') window.localStorage.setItem(DONT_SHOW_KEY, 'true'); buildPassage(); }}
    />
  );
  
  return (
    <>
      <div className="fixed bottom-6 left-4 right-4 z-50 flex items-center justify-center">
        <Button
          onClick={primary}
          disabled={!canConfirmRange}
          className="h-14 w-full max-w-md rounded-2xl bg-neutral-900 px-6 text-base font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 hover:bg-neutral-800 hover:shadow-[0_12px_32px_rgba(0,0,0,0.16),0_4px_12px_rgba(0,0,0,0.1)] active:scale-[0.97] disabled:bg-neutral-300 disabled:shadow-none dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500"
        >
          <CheckCircle2 className="mr-2 h-5 w-5" />
          {primaryLabel}
        </Button>
      </div>
      <LargeSelectionDialog
        open={showLargeDialog}
        onClose={() => setShowLargeDialog(false)}
        onReduce={() => { setShowLargeDialog(false); goBack(); }}
        onContinue={() => { setShowLargeDialog(false); if (typeof window !== 'undefined') window.localStorage.setItem(DONT_SHOW_KEY, 'true'); buildPassage(); }}
      />
    </>
  );
};
