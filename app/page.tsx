"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppMode, Verse } from '../lib/types';
import { loadProgress, saveProgress } from '../lib/storage';
import { ProgressList } from '../components/progress-list';
import { Button } from '@/components/ui/button';

export default function Home() {
  const router = useRouter();
  const [refresh, setRefresh] = React.useState(0);

  function selectAndGo(v: Verse, mode?: AppMode) {
    const p = loadProgress();
    if (!p.verses[v.id]) {
      p.verses[v.id] = { reference: v.reference, translation: v.translation, text: v.text, attempts: [], source: v.source };
    }
    p.lastSelectedVerseId = v.id;
    saveProgress(p);
    setRefresh(r => r + 1);
    const qp = new URLSearchParams();
    qp.set('id', v.id);
    if (mode) qp.set('mode', mode);
    router.push(`/practice?${qp.toString()}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Memorize</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/practice')}>Explorar pasajes</Button>
          <div className="text-xs text-neutral-500">v0.1</div>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 max-w-xl mx-auto w-full grid gap-4">
        <ProgressList 
          onSelect={(v)=> selectAndGo(v)} 
          refreshSignal={refresh}
          onQuickStart={(v, m)=> selectAndGo(v, m)}
          showEmpty
          onBrowse={() => router.push('/practice')}
        />
      </main>
      <footer className="px-4 py-6 text-center text-xs text-neutral-500">Local data only · v0.1</footer>
    </div>
  );
}
