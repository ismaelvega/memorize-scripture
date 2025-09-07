"use client";
import * as React from 'react';
import { useFlow } from './flow';
import { TypeModeCard } from '../type-mode-card';
import { SpeechModeCard } from '../speech-mode-card';
import { ModeSelector } from '../mode-selector';
import { Button } from '@/components/ui/button';

export const AttemptViewMobile: React.FC = () => {
  const { state, dispatch } = useFlow();
  const passage = state.passage || null;
  
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold">Intento</h2>
          {passage && <p className="text-[11px] text-neutral-500">{passage.reference}</p>}
        </div>
        <div className="flex items-center gap-2">
          <ModeSelector 
            mode={state.mode} 
            onModeChange={(mode) => dispatch({ type: 'SET_MODE', mode })}
            disabled={false}
          />
          <Button size="sm" variant="outline" onClick={()=> dispatch({ type: 'BACK' })}>Versos</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-3 pb-24">
        {state.mode === 'type' ? (
          <TypeModeCard 
            verse={passage} 
            onAttemptSaved={()=>{}} 
            onFirstType={()=>{}} 
          />
        ) : (
          <SpeechModeCard 
            verse={passage} 
            onAttemptSaved={()=>{}} 
            onFirstRecord={()=>{}} 
          />
        )}
      </div>
    </div>
  );
};

