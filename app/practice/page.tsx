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

const PASSAGE_ID_PATTERN = /^([a-z0-9_]+)-(\d+)-(\d+)-(\d+)(?:-([a-z0-9_]+)|([a-z0-9_]+))?$/i;

function parseRangeFromId(id: string): VerseMeta {
  const normalized = id?.trim() ?? '';
  const match = normalized.match(PASSAGE_ID_PATTERN);

  if (match) {
    const [, bookKeyRaw, chapterStr, startStr, endStr] = match;
    return {
      bookKey: bookKeyRaw ?? null,
      chapter: Number(chapterStr) || 1,
      start: Number(startStr) || 1,
      end: Number(endStr) || Number(startStr) || 1,
      translation: match[5] ?? match[6] ?? null,
    };
  }

  const parts = normalized.split('-').filter(Boolean);
  const [bookKeyRaw, chapterPart, startPart, endPart] = parts;
  let translation = parts.length > 4 ? parts.slice(4).join('-') : null;

  const parsedChapter = Number(chapterPart);
  let parsedStart = Number(startPart);
  let parsedEnd = Number(endPart);

  if (!Number.isFinite(parsedStart)) parsedStart = 1;
  if (!Number.isFinite(parsedEnd)) parsedEnd = parsedStart;

  if (!translation && parts.length) {
    const lastPart = parts[parts.length - 1] ?? '';
    const combinedMatch = lastPart.match(/^(\d+)([a-z][a-z0-9_]*)$/i);
    if (combinedMatch) {
      parsedEnd = Number(combinedMatch[1]) || parsedEnd;
      translation = combinedMatch[2];
    }
  }

  return {
    bookKey: bookKeyRaw ?? null,
    chapter: Number.isFinite(parsedChapter) ? parsedChapter : 1,
    start: parsedStart,
    end: parsedEnd,
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
      // Use history back to trigger popstate and sync with store
      if (typeof window !== 'undefined') {
        window.history.back();
      } else {
        goBack();
      }
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
  const [flowOrigin, setFlowOrigin] = React.useState<'browse' | 'progress' | 'saved' | null>(null);
  // Flag to prevent the ?id useEffect from reopening the flow when we intentionally close it
  const closingFlowRef = React.useRef(false);


  const handleCloseFlow = React.useCallback(() => {
    closingFlowRef.current = true;
    setShowFlow(false);
    setFlowOrigin(null);
    // Reset the flag after a short delay to allow URL changes to settle
    setTimeout(() => {
      closingFlowRef.current = false;
    }, 100);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <React.Suspense fallback={<div className="flex-shrink-0 px-3 pt-3 pb-2" />}>
        <PracticeHeader
          showFlow={showFlow}
          showSaved={showSaved}
          onCloseFlow={handleCloseFlow}
          onCloseSaved={() => setShowSaved(false)}
        />
      </React.Suspense>
      <React.Suspense fallback={<div className="flex-1" />}>
        <PracticeContent 
          showFlow={showFlow} 
          setShowFlow={setShowFlow} 
          showSaved={showSaved} 
          setShowSaved={setShowSaved}
          closingFlowRef={closingFlowRef}
          flowOrigin={flowOrigin}
          setFlowOrigin={setFlowOrigin}
          onCloseFlow={handleCloseFlow}
        />
      </React.Suspense>
    </div>
  );
}

function PracticeContent({ showFlow, setShowFlow, showSaved, setShowSaved, closingFlowRef, onCloseFlow, flowOrigin, setFlowOrigin }: { showFlow: boolean; setShowFlow: (show: boolean) => void; showSaved: boolean; setShowSaved: (show: boolean) => void; closingFlowRef: React.MutableRefObject<boolean>; onCloseFlow: () => void; flowOrigin: 'browse' | 'progress' | 'saved' | null; setFlowOrigin: React.Dispatch<React.SetStateAction<'browse' | 'progress' | 'saved' | null>> }) {
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

  // Tracks when we're about to update the URL and shouldn't close the flow yet
  const urlSettlingRef = React.useRef(false);

  const handleSelect = React.useCallback((verse: Verse, origin: 'progress' | 'saved') => {
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
    setFlowOrigin(origin);

    const params = new URLSearchParams();
    params.set('id', verse.id);
    params.set('start', String(meta.start));
    params.set('end', String(meta.end));
    if (origin === 'progress') {
      params.set('fromProgress', 'true');
    } else {
      params.set('fromSaved', 'true');
    }
    // Mark that we're updating the URL so the close-flow effect doesn't fire prematurely
    urlSettlingRef.current = true;
    router.replace(`/practice?${params.toString()}`, { scroll: false });
    // Clear the settling flag after a tick so searchParams can catch up
    setTimeout(() => {
      urlSettlingRef.current = false;
    }, 100);
  }, [router, setFlowOrigin, setShowFlow, setShowSaved]);

  const handleProgressSelect = React.useCallback((verse: Verse) => {
    handleSelect(verse, 'progress');
  }, [handleSelect]);

  const handleSavedSelect = React.useCallback((verse: Verse) => {
    handleSelect(verse, 'saved');
  }, [handleSelect]);

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
      // If already showing flow, pending selection, or intentionally closing, skip
      if (showFlow || pendingSelection || closingFlowRef.current) return;
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

  React.useEffect(() => {
    if (searchParams.get('view') !== 'entry') return;
    if (closingFlowRef.current) return;
    setShowSaved(false);
    setShowFlow(true);
    setFlowOrigin('browse');
    router.replace('/practice', { scroll: false });
  }, [searchParams, setShowFlow, setShowSaved, setFlowOrigin, router, closingFlowRef]);

  React.useEffect(() => {
    if (!showFlow) return;
    if (closingFlowRef.current) return;
    // Wait for URL to settle after selecting from progress/saved
    if (urlSettlingRef.current) return;

    const fromProgressParam = searchParams.get('fromProgress') === 'true';
    const fromSavedParam = searchParams.get('fromSaved') === 'true';

    if (flowOrigin === 'progress' && !fromProgressParam) {
      if (pendingSelection) return;
      onCloseFlow();
      return;
    }

    if (flowOrigin === 'saved' && !fromSavedParam) {
      if (pendingSelection) return;
      onCloseFlow();
    }
  }, [showFlow, flowOrigin, searchParams, onCloseFlow, closingFlowRef, pendingSelection]);

  const handleBrowse = React.useCallback(() => {
    setShowSaved(false);
    setShowFlow(true);
    setFlowOrigin('browse');
    resetFlow();
  }, [resetFlow, setShowSaved, setShowFlow, setFlowOrigin]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-3 pb-3">
      {!showFlow && !showSaved && (
        <div className="flex-1 overflow-auto space-y-3">
          <ProgressList
            onSelect={handleProgressSelect}
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
              handleSavedSelect(verse);
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
            onClose={onCloseFlow}
          />
        </div>
      )}
    </div>
  );
}
