"use client";
import * as React from 'react';
import { useFlow } from './flow';
import { Button } from '@/components/ui/button';

interface Props { buildPassage: () => void; canConfirmRange: boolean; }

export const BottomBar: React.FC<Props> = ({ buildPassage, canConfirmRange }) => {
  const { state, dispatch } = useFlow();
  function back(){ dispatch({ type: 'BACK' }); }
  function primary(){
    if (state.step === 'VERSE' && canConfirmRange) { buildPassage(); }
  }
  const refLabel = (state.book && state.chapter && state.verseStart!=null && state.verseEnd!=null)
    ? `${state.book.shortTitle} ${state.chapter}:${state.verseStart}${state.verseEnd>state.verseStart? '-' + state.verseEnd: ''}`
    : '';
  const primaryLabel = state.step==='VERSE'
    ? (canConfirmRange ? (refLabel ? `Practicar ${refLabel}` : 'Practicar') : 'Selecciona')
    : 'Continuar';
  const showPrimary = state.step==='VERSE';
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur px-3 py-2 flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={back} disabled={state.step==='BOOK'} className="min-w-[90px]">Atrás</Button>
      {showPrimary && <Button size="sm" onClick={primary} disabled={!canConfirmRange} className="flex-1">{primaryLabel}</Button>}
    </div>
  );
};
