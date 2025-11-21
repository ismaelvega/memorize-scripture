"use client";
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Home, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFlowStore, type BookIndexEntry } from '../../components/mobile/flow';
import { MobileFlowController } from '../../components/mobile/flow-controller';
import { ProgressList } from '../../components/progress-list';
import { SavedPassagesCarousel } from '../../components/saved-passages-carousel';
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

function PracticeHeader({ showFlow, showSaved, onCloseFlow, onCloseSaved }: { showFlow: boolean; showSaved: boolean; onCloseFlow: () => void; onCloseSaved: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = useFlowStore((state) => state.step);
  const selectionMode = useFlowStore((state) => state.selectionMode);
  const book = useFlowStore((state) => state.book);
  const chapter = useFlowStore((state) => state.chapter);
  const verseStart = useFlowStore((state) => state.verseStart);
  const verseEnd = useFlowStore((state) => state.verseEnd);
  const goBack = useFlowStore((state) => state.back);

  const headline = React.useMemo(() => {
    if (showSaved) return 'Guardados';
    if (step === 'ENTRY') return 'Elige el pasaje';
    if (step === 'BOOK') return 'Explorar · Libro';
    if (step === 'CHAPTER') return `Explorar · ${book?.shortTitle ?? 'Libro'}`;
    if (step === 'VERSE') {
      const chapterLabel = chapter ? `Cap ${chapter}` : 'Capítulo';
      return `${book?.shortTitle ?? 'Libro'} · ${chapterLabel}`;
    }
    if (step === 'SEARCH') return 'Buscar pasaje';
    if (step === 'MODE') {
      if (selectionMode === 'search') return 'Buscar · Modo';
      const base = book?.shortTitle ?? book?.title ?? 'Pasaje';
      if (chapter && verseStart && verseEnd) {
        const range = `${chapter}:${verseStart}${verseEnd > verseStart ? `-${verseEnd}` : ''}`;
        return `${base} · ${range}`;
      }
      if (chapter) return `${base} · Cap ${chapter}`;
      return `${base} · Modo`;
    }
    return 'Práctica';
  }, [book, chapter, selectionMode, showSaved, step, verseEnd, verseStart]);

  const canGoBack = showFlow || showSaved;

  const handleBack = () => {
    if (showSaved) {
      onCloseSaved();
      return;
    }
    if (step === 'ENTRY') {
      onCloseFlow();
    } else if (step === 'MODE' && searchParams.get('fromSaved') === 'true') {
      router.push('/practice/saved');
      onCloseFlow();
    } else if (
      step === 'MODE' &&
      (searchParams.get('fromProgress') === 'true' || searchParams.get('fromMode') === 'true')
    ) {
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/practice');
      }
      router.replace('/practice', { scroll: false });
      onCloseFlow();
    } else {
      goBack();
    }
  };

  return (
    <header className="flex-shrink-0 z-40 px-3 pt-3 pb-2">
      <div className="rounded-3xl border border-white/50 bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/80 dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canGoBack}
            onClick={() => {
              if (canGoBack) {
                handleBack();
              }
            }}
            className="h-9 w-9 rounded-full border border-white/50 bg-white/80 text-neutral-700 transition-transform duration-100 enabled:active:scale-95 enabled:hover:bg-white dark:border-neutral-800/70 dark:bg-neutral-900/70 dark:text-neutral-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Práctica</span>
            <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{headline}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-9 w-9 rounded-full border border-white/50 bg-white/80 text-neutral-700 transition-transform duration-100 hover:bg-white active:scale-95 dark:border-neutral-800/70 dark:bg-neutral-900/70 dark:text-neutral-200"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

import { Footer } from '@/components/footer';

export default function PracticePage() {
  const [showFlow, setShowFlow] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <React.Suspense fallback={<div className="flex-shrink-0 px-3 pt-3 pb-2" />}>
        <PracticeHeader
          showFlow={showFlow}
          showSaved={showSaved}
          onCloseFlow={() => setShowFlow(false)}
          onCloseSaved={() => setShowSaved(false)}
        />
      </React.Suspense>
      <React.Suspense fallback={<div className="flex-1" />}>
        <PracticeContent showFlow={showFlow} setShowFlow={setShowFlow} showSaved={showSaved} setShowSaved={setShowSaved} />
      </React.Suspense>
    </div>
  );
}

function PracticeContent({ showFlow, setShowFlow, showSaved, setShowSaved }: { showFlow: boolean; setShowFlow: (show: boolean) => void; showSaved: boolean; setShowSaved: (show: boolean) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetFlow = useFlowStore((state) => state.reset);
  const setBook = useFlowStore((state) => state.setBook);
  const setChapter = useFlowStore((state) => state.setChapter);
  const setPassage = useFlowStore((state) => state.setPassage);
  const [refresh, setRefresh] = React.useState(0);
  const [savedRefresh, setSavedRefresh] = React.useState(0);
  const [bookIndex, setBookIndex] = React.useState<Record<string, BookIndexEntry>>({});
  const [indexLoaded, setIndexLoaded] = React.useState(false);
  const [pendingSelection, setPendingSelection] = React.useState<{ verse: Verse; meta: VerseMeta } | null>(null);

  React.useEffect(() => {
    resetFlow();
    setShowSaved(false);
  }, [resetFlow, setShowSaved]);

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
      entry.text = verse.text;
      entry.source = verse.source ?? entry.source;
      entry.translation = verse.translation ?? entry.translation;
      entry.reference = verse.reference ?? entry.reference;
    }
    progress.lastSelectedVerseId = verse.id;
    saveProgress(progress);
    setPendingSelection({ verse, meta });
    setShowFlow(true);
    setShowSaved(false);

    const params = new URLSearchParams();
    params.set('id', verse.id);
    params.set('start', String(meta.start));
    params.set('end', String(meta.end));
    params.set('fromProgress', 'true');
    router.replace(`/practice?${params.toString()}`, { scroll: false });
  }, [router]);

  React.useEffect(() => {
    if (!pendingSelection) return;
    const { verse, meta } = pendingSelection;
    if (meta.bookKey && !bookIndex[meta.bookKey] && !indexLoaded) {
      return;
    }

    resetFlow();

    const selectedBook = meta.bookKey ? bookIndex[meta.bookKey] : undefined;
    if (selectedBook) {
      setBook(selectedBook);
      setChapter(meta.chapter);
      setPassage({ verse, start: meta.start, end: meta.end, book: selectedBook, chapter: meta.chapter });
    } else {
      setPassage({ verse, start: meta.start, end: meta.end });
    }
    setPendingSelection(null);
  }, [pendingSelection, bookIndex, indexLoaded, resetFlow, setBook, setChapter, setPassage]);

  // If the page is opened with ?id=... we should preselect that passage and open the flow
  React.useEffect(() => {
    try {
      const id = searchParams.get('id');
      const start = searchParams.get('start');
      const end = searchParams.get('end');
      if (!id) return;
      // If already showing flow or pending selection, skip
      if (showFlow || pendingSelection) return;
      const progress = loadProgress();
      const entry = progress.verses[id];
      const savedEntry = progress.saved?.[id];
      
      if (!entry && !savedEntry) return;
      
      const meta = parseRangeFromId(id);
      // Ensure we use provided start/end query params if present
      const metaStart = start ? Number(start) : (savedEntry?.start ?? meta.start);
      const metaEnd = end ? Number(end) : (savedEntry?.end ?? meta.end);
      
      const verseData = entry ? {
          id,
          reference: entry.reference,
          translation: entry.translation ?? null,
          text: entry.text ?? '',
          source: (entry.source as any) ?? 'built-in',
      } : savedEntry!.verse;

      setPendingSelection({
        verse: verseData,
        meta: { bookKey: meta.bookKey ?? null, chapter: meta.chapter, start: metaStart, end: metaEnd, translation: meta.translation ?? null },
      });
      setShowFlow(true);
    } catch {
      // ignore
    }
  }, [showFlow, pendingSelection, searchParams]);

  const handleBrowse = React.useCallback(() => {
    setShowSaved(false);
    setShowFlow(true);
    resetFlow();
  }, [resetFlow, setShowSaved, setShowFlow]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-3 pb-3">
      {!showFlow && !showSaved && (
        <div className="flex-1 overflow-auto space-y-3">
          <ProgressList
            onSelect={handleSelect}
            refreshSignal={refresh}
            showEmpty
            onBrowse={handleBrowse}
          />
        </div>
      )}
      {!showFlow && showSaved && (
        <div className="flex-1 overflow-hidden">
          <SavedPassagesCarousel
            onSelect={(verse) => {
              handleSelect(verse);
              setShowSaved(false);
            }}
            refreshSignal={savedRefresh}
            onBrowse={handleBrowse}
          />
        </div>
      )}
      {showFlow && (
        <div className="flex-1 overflow-hidden">
          <MobileFlowController
            onSelectionSaved={() => setRefresh(r => r + 1)}
            onSavedForLater={() => setSavedRefresh((r) => r + 1)}
          />
        </div>
      )}
    </div>
  );
}
