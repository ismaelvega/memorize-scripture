"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlowProvider, useFlow, type BookIndexEntry } from '../../components/mobile/flow';
import { MobileFlowController } from '../../components/mobile/flow-controller';
import { ProgressList } from '../../components/progress-list';
import type { Verse } from '../../lib/types';
import { loadProgress, saveProgress } from '../../lib/storage';

interface VerseMeta {
  bookKey: string | null;
  chapter: number;
  start: number;
  end: number;
  translation: string | null;
}

function parseRangeFromId(id: string): VerseMeta {
  const parts = id.split('-');
  if (parts.length < 5) {
    return {
      bookKey: parts[0] ?? null,
      chapter: Number(parts[1]) || 1,
      start: 1,
      end: 1,
      translation: parts[parts.length - 1] ?? null,
    };
  }
  const bookKey = parts[0] ?? null;
  const chapter = Number(parts[1]);
  const end = Number(parts[parts.length - 2]);
  const start = Number(parts[parts.length - 3]);
  const translation = parts[parts.length - 1] ?? null;
  return {
    bookKey,
    chapter: Number.isNaN(chapter) ? 1 : chapter,
    start: Number.isNaN(start) ? 1 : start,
    end: Number.isNaN(end) ? (Number.isNaN(start) ? 1 : start) : end,
    translation,
  };
}

function PracticeHeader() {
  const router = useRouter();

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold tracking-tight">Práctica</h1>
      <div className="flex items-center gap-2">
        <div className="text-xs text-neutral-500">v0.1</div>
        <Button
          variant="default"
          size="sm"
          onClick={() => router.push('/')}
          aria-label="Ir al inicio"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Inicio</span>
        </Button>
      </div>
    </header>
  );
}

export default function PracticePage() {
  return (
    <FlowProvider>
      <div className="min-h-screen flex flex-col">
        <PracticeHeader />
        <PracticeContent />
        <footer className="px-4 py-6 text-center text-xs text-neutral-500">Solo datos locales · v0.1</footer>
      </div>
    </FlowProvider>
  );
}

function PracticeContent() {
  const { dispatch } = useFlow();
  const [refresh, setRefresh] = React.useState(0);
  const [showFlow, setShowFlow] = React.useState(false);
  const [bookIndex, setBookIndex] = React.useState<Record<string, BookIndexEntry>>({});
  const [indexLoaded, setIndexLoaded] = React.useState(false);
  const [pendingSelection, setPendingSelection] = React.useState<{ verse: Verse; meta: VerseMeta } | null>(null);

  React.useEffect(() => {
    let active = true;
    async function loadIndex() {
      try {
        const res = await fetch('/bible_data/_index.json');
        if (!res.ok) throw new Error('No se pudo cargar el índice');
        const data: BookIndexEntry[] = await res.json();
        if (!active) return;
        const map = data.reduce<Record<string, BookIndexEntry>>((acc, entry) => {
          acc[entry.key] = entry;
          return acc;
        }, {});
        setBookIndex(map);
      } catch (error) {
        console.error('Error cargando índice de libros', error);
        if (active) setBookIndex({});
      } finally {
        if (active) setIndexLoaded(true);
      }
    }
    loadIndex();
    return () => {
      active = false;
    };
  }, []);

  const handleSelect = React.useCallback((verse: Verse) => {
    const meta = parseRangeFromId(verse.id);
    const progress = loadProgress();
    if (progress.verses[verse.id]) {
      const entry = progress.verses[verse.id];
      entry.text = verse.text ?? entry.text;
      entry.source = verse.source ?? entry.source;
      entry.translation = verse.translation ?? entry.translation;
      entry.reference = verse.reference ?? entry.reference;
    }
    progress.lastSelectedVerseId = verse.id;
    saveProgress(progress);
    setPendingSelection({ verse, meta });
    setShowFlow(true);
  }, []);

  React.useEffect(() => {
    if (!pendingSelection) return;
    const { verse, meta } = pendingSelection;
    if (meta.bookKey && !bookIndex[meta.bookKey] && !indexLoaded) {
      return;
    }

    dispatch({ type: 'RESET' });

    if (meta.bookKey && bookIndex[meta.bookKey]) {
      dispatch({ type: 'SET_BOOK', book: bookIndex[meta.bookKey] });
      dispatch({ type: 'SET_CHAPTER', chapter: meta.chapter });
    }

    dispatch({ type: 'SET_PASSAGE', verse, start: meta.start, end: meta.end });
    setPendingSelection(null);
  }, [pendingSelection, bookIndex, dispatch, indexLoaded]);

  const handleBrowse = React.useCallback(() => {
    setShowFlow(true);
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  return (
    <div className="flex-1 flex flex-col gap-4 px-3 py-4">
      {!showFlow && (
        <ProgressList
          onSelect={handleSelect}
          refreshSignal={refresh}
          showEmpty
          onBrowse={handleBrowse}
        />
      )}
      {showFlow && (
        <div className="flex-1">
          <MobileFlowController onSelectionSaved={() => setRefresh(r => r + 1)} />
        </div>
      )}
    </div>
  );
}
