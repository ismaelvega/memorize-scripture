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

  function selectAndRead(v: Verse) {
    const p = loadProgress();
    if (!p.verses[v.id]) {
      p.verses[v.id] = { reference: v.reference, translation: v.translation, text: v.text, attempts: [], source: v.source };
    }
    saveProgress(p);
    setRefresh(r => r + 1);
    const qp = new URLSearchParams();
    qp.set('id', v.id);
    router.push(`/read?${qp.toString()}`);
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
      <main className="flex-1 px-4 py-4 max-w-xl mx-auto w-full grid gap-6">
        {/* Main Action Choice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => router.push('/practice')}
            className="p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-200 group"
          >
            <div className="text-center space-y-3">
              <div className="text-4xl">📚</div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Practice Verses
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Test your memory with Type Mode and Speech Mode. Get scored and track your progress.
              </p>
            </div>
          </div>

          <div
            onClick={() => router.push('/read')}
            className="p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 transition-all duration-200 group"
          >
            <div className="text-center space-y-3">
              <div className="text-4xl">☕</div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                Read & Chill
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Relaxed reading with optional typing. No pressure, no scoring - just enjoy the verses.
              </p>
            </div>
          </div>
        </div>

        <ProgressList
          onSelect={(v)=> selectAndGo(v)}
          refreshSignal={refresh}
          onQuickStart={(v, m)=> selectAndGo(v, m)}
          onReadStart={(v)=> selectAndRead(v)}
          showEmpty
          onBrowse={() => router.push('/practice')}
        />
      </main>
      <footer className="px-4 py-6 text-center text-xs text-neutral-500">Local data only · v0.1</footer>
    </div>
  );
}
