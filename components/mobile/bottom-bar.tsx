"use client";
import * as React from 'react';
import { shallow } from 'zustand/shallow';
import { useFlowStore } from './flow';
import { Button } from '@/components/ui/button';

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
  if (step === 'MODE' || step === 'ENTRY' || step === 'SEARCH') return null;
  function back(){ goBack(); }
  function primary(){
    if (step === 'VERSE' && canConfirmRange) { buildPassage(); }
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
      <Button size="sm" variant="outline" onClick={back} disabled={step==='ENTRY'} className="min-w-[90px]">Atrás</Button>
      {showPrimary && <Button size="sm" onClick={primary} disabled={!canConfirmRange} className="flex-1">{primaryLabel}</Button>}
    </div>
  );
};
