"use client";
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { ReadingFlowProvider, useReadingFlow } from '../../components/reading/reading-flow';
import { ReadingFlowController } from '../../components/reading/reading-flow-controller';
import { loadProgress } from '../../lib/storage';
import type { Verse } from '../../lib/types';

function ReadHeader() {
  const router = useRouter();

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold tracking-tight">Leer y relajarse</h1>
      <div className="flex items-center gap-2">
        <div className="text-xs text-neutral-500">v0.1</div>
        <Button
          variant="default"
          size="sm"
          onClick={() => router.push('/')}
          className="flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
          Inicio
        </Button>
      </div>
    </header>
  );
}

export default function ReadPage() {
  return (
    <ReadingFlowProvider>
      <div className="min-h-screen flex flex-col">
        <React.Suspense fallback={null}>
          <ReadInitializer />
        </React.Suspense>
        <ReadHeader />
        <div className="flex-1">
          <ReadingFlowController />
        </div>
        <footer className="px-4 py-6 text-center text-xs text-neutral-500">
          Solo datos locales · v0.1
        </footer>
      </div>
    </ReadingFlowProvider>
  );
}

function ReadInitializer() {
  const { dispatch } = useReadingFlow();
  const params = useSearchParams();

  React.useEffect(() => {
    const id = params.get('id');
    if (!id) return;

    const p = loadProgress();
    const entry = p.verses[id];
    if (!entry) return;

    const verse: Verse = {
      id,
      reference: entry.reference,
      translation: entry.translation,
      text: entry.text || '',
      source: entry.source || 'built-in',
    };

    // Jump straight to reading with the selected verse
    dispatch({ type: 'SET_VERSE', verse, start: 1, end: 1 });
  }, [dispatch, params]);

  return null;
}
