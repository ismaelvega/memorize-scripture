"use client";
import * as React from 'react';
import { Verse, AppMode } from '../lib/types';
import { loadProgress, saveProgress } from '../lib/storage';
import { ProgressList } from '../components/progress-list';
import { VersePicker } from '../components/verse-picker';
import { TypeModeCard } from '../components/type-mode-card';
import { SpeechModeCard } from '../components/speech-mode-card';
import { MobileFlowController } from '../components/mobile/flow-controller';

const USE_MOBILE_FLOW = process.env.NEXT_PUBLIC_MOBILE_FLOW === 'true';

export default function Home() {
  const [selectedVerse, setSelectedVerse] = React.useState<Verse | null>(null);
  const [autoHideSignal, setAutoHideSignal] = React.useState(0);
  const [progressRefresh, setProgressRefresh] = React.useState(0);
  const [mode, setMode] = React.useState<AppMode>('type');

  React.useEffect(()=>{
    const p = loadProgress();
    if (p.lastSelectedVerseId && p.verses[p.lastSelectedVerseId]) {
      const v = p.verses[p.lastSelectedVerseId];
      setSelectedVerse({ id: p.lastSelectedVerseId, reference: v.reference, translation: v.translation, text: v.text || '', source: v.source || 'built-in' });
    }
  }, []);

  function handleSelect(v: Verse) {
    setSelectedVerse(v);
    const p = loadProgress();
    if (!p.verses[v.id]) {
      p.verses[v.id] = { reference: v.reference, translation: v.translation, text: v.text, attempts: [], source: v.source };
    }
    p.lastSelectedVerseId = v.id;
    saveProgress(p);
    setProgressRefresh(r=> r+1);
  }

  function handleClear() {
    setSelectedVerse(null);
    const p = loadProgress();
    p.lastSelectedVerseId = undefined;
    saveProgress(p);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Memorize</h1>
        <div className="flex items-center gap-4">
          {/* <ModeSelector 
            mode={mode} 
            onModeChange={setMode}
            disabled={false}
          /> */}
          <div className="text-xs text-neutral-500">v0.1</div>
        </div>
      </header>
      {!USE_MOBILE_FLOW && (
        <main className="flex-1 px-4 md:px-8 py-6 max-w-6xl mx-auto grid gap-6 md:grid-cols-2 auto-rows-min">
          <div className="order-2 md:order-none">
            <VersePicker selected={selectedVerse} onSelect={handleSelect} onClear={handleClear} autoHideSignal={autoHideSignal} />
          </div>
          <div className="order-1 md:order-none flex flex-col gap-4">
            {mode === 'type' ? (
              <TypeModeCard 
                verse={selectedVerse} 
                onAttemptSaved={() => { setProgressRefresh(r => r + 1); }} 
                onFirstType={() => setAutoHideSignal(s => s + 1)} 
              />
            ) : (
              <SpeechModeCard 
                verse={selectedVerse} 
                onAttemptSaved={() => { setProgressRefresh(r => r + 1); }} 
                onFirstRecord={() => setAutoHideSignal(s => s + 1)} 
              />
            )}
            <ProgressList onSelect={handleSelect} refreshSignal={progressRefresh} />
          </div>
        </main>
      )}
      {USE_MOBILE_FLOW && (
        <div className="flex-1">
          <MobileFlowController />
        </div>
      )}
      <footer className="px-4 py-6 text-center text-xs text-neutral-500">Local data only · v0.1</footer>
    </div>
  );
}

