"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SavedPassagesCarousel } from '@/components/saved-passages-carousel';
import type { Verse } from '@/lib/types';
import { loadProgress, saveProgress } from '@/lib/storage';

function SavedHeader() {
  const router = useRouter();

  return (
    <header className="flex-shrink-0 z-40 px-3 pt-3 pb-2">
      <div className="rounded-3xl border border-white/50 bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/80 dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-full border border-white/50 bg-white/80 text-neutral-700 transition-transform duration-100 hover:bg-white active:scale-95 dark:border-neutral-800/70 dark:bg-neutral-900/70 dark:text-neutral-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Práctica</span>
            <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">Guardados</span>
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

export default function SavedPassagesPage() {
  const router = useRouter();

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

    const params = new URLSearchParams();
    params.set('id', verse.id);
    params.set('start', String(meta.start));
    params.set('end', String(meta.end));
    params.set('fromProgress', 'true');
    router.replace(`/practice?${params.toString()}`, { scroll: false });
  }, [router]);

  const handleBrowse = React.useCallback(() => {
    router.push('/practice');
  }, [router]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SavedHeader />
      <div className="flex-1 flex flex-col overflow-hidden px-3 pb-3">
        <SavedPassagesCarousel
          onSelect={handleSelect}
          refreshSignal={0}
          onBrowse={handleBrowse}
        />
      </div>
    </div>
  );
}
