"use client";
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { TypeModeCard } from '@/components/type-mode-card';
import { SpeechModeCard } from '@/components/speech-mode-card';
import { StealthModeCard } from '@/components/stealth-mode-card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { loadProgress } from '@/lib/storage';
import type { AppMode, Verse } from '@/lib/types';
import { Home } from 'lucide-react';

interface PracticeModePageProps {
  params: Promise<{ mode: string }>;
}

const VALID_MODES: AppMode[] = ['type', 'speech', 'stealth'];
const MODE_LABELS: Record<AppMode, string> = {
  type: 'Modo Escritura',
  speech: 'Modo Voz',
  stealth: 'Modo Sigilo',
};

function parseSelectionFromId(id: string | null) {
  if (!id) return null;
  const parts = id.split('-');
  if (parts.length < 5) return null;
  const translation = parts[parts.length - 1];
  const end = Number(parts[parts.length - 2]);
  const start = Number(parts[parts.length - 3]);
  const chapter = Number(parts[parts.length - 4]);
  const bookKey = parts.slice(0, parts.length - 4).join('-');
  if (!bookKey || Number.isNaN(chapter) || Number.isNaN(start) || Number.isNaN(end)) return null;
  return { bookKey, chapter, start, end, translation };
}

function cleanText(raw: string) {
  return raw.replace(/\s*\/n\s*/gi, ' ').replace(/_/g, '').replace(/\s+/g, ' ').trim();
}

export default function PracticeModePage({ params }: PracticeModePageProps) {
  const { mode: modeParam } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!VALID_MODES.includes(modeParam as AppMode)) {
    notFound();
  }

  const currentMode = modeParam as AppMode;
  const idParam = searchParams.get('id');
  const selectionFromId = React.useMemo(() => parseSelectionFromId(idParam), [idParam]);
  const startParam = Number(searchParams.get('start') || selectionFromId?.start || 1);
  const endParam = Number(searchParams.get('end') || selectionFromId?.end || startParam);

  const progress = loadProgress();
  const entry = idParam ? progress.verses[idParam] : undefined;

  const verse: Verse | null = React.useMemo(() => {
    if (!idParam || !entry) return null;
    const { reference, translation, text, source } = entry;
    return {
      id: idParam,
      reference,
      translation,
      text: text || '',
      source: source || 'built-in',
    };
  }, [entry, idParam]);

  const [chapterVerses, setChapterVerses] = React.useState<string[] | null>(null);
  const [isLoadingVerses, setIsLoadingVerses] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [shouldConfirmNavigation, setShouldConfirmNavigation] = React.useState(false);

  React.useEffect(() => {
    if (!selectionFromId || verse?.source === 'custom') {
      setChapterVerses(null);
      return;
    }

    let active = true;
    const key = selectionFromId.bookKey;
    const chapter = selectionFromId.chapter;

    async function loadChapter() {
      try {
        setIsLoadingVerses(true);
        setFetchError(null);
        const res = await fetch(`/bible_data/${key}.json`);
        if (!res.ok) throw new Error('No se pudo cargar el libro');
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Formato inesperado de datos');
        const chapterData: string[] = data[chapter - 1] || [];
        if (!active) return;
        setChapterVerses(chapterData.map(cleanText));
      } catch (error: any) {
        if (!active) return;
        setFetchError(error?.message || 'Error al cargar los versículos');
        setChapterVerses(null);
      } finally {
        if (active) setIsLoadingVerses(false);
      }
    }

    loadChapter();
    return () => { active = false; };
  }, [selectionFromId, verse?.source]);

  const verseParts = (!chapterVerses || Number.isNaN(startParam) || Number.isNaN(endParam))
    ? undefined
    : chapterVerses.slice(startParam - 1, endParam);

  const resolvedVerse: Verse | null = React.useMemo(() => {
    if (!verse) return null;
    if (verse.text && verse.text.trim().length > 0) return verse;
    if (verseParts && verseParts.length > 0) {
      return { ...verse, text: verseParts.join(' ') };
    }
    return verse;
  }, [verse, verseParts]);

  const verseReady = !!(resolvedVerse && resolvedVerse.text.trim().length > 0);

  React.useEffect(() => {
    if (currentMode !== 'speech') {
      setShouldConfirmNavigation(false);
    }
  }, [currentMode]);

  const exitPromptMessage = 'Tienes una grabación en curso. ¿Seguro que quieres salir sin terminar?';

  const confirmBeforeNavigate = React.useCallback(() => {
    if (!shouldConfirmNavigation) return true;
    return window.confirm(exitPromptMessage);
  }, [shouldConfirmNavigation]);

  const handleHomeClick = React.useCallback(() => {
    if (!confirmBeforeNavigate()) return;
    router.push('/');
  }, [confirmBeforeNavigate, router]);

  const handleChangeVerse = React.useCallback(() => {
    if (!confirmBeforeNavigate()) return;
    router.push('/practice');
  }, [confirmBeforeNavigate, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="flex w-full flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Práctica ({MODE_LABELS[currentMode]})</h1>
            {resolvedVerse && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{resolvedVerse.reference}</p>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleHomeClick}
            className="flex items-center gap-1 shrink-0 self-start"
          >
            <Home className="h-4 w-4" />
            Inicio
          </Button>
        </div>
      </header>

      <main className="flex-1 px-3 py-4">
        {!resolvedVerse ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <p>No encontramos un pasaje seleccionado para este intento.</p>
            <Button onClick={handleChangeVerse}>Elegir un pasaje</Button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {fetchError && currentMode === 'stealth' && (
              <div className="text-sm text-red-600 bg-red-500/10 border border-red-200 dark:border-red-800 p-3 rounded">
                {fetchError}
              </div>
            )}
            {!verseReady && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Cargando pasaje…</div>
            )}
            {currentMode === 'type' && verseReady && (
              <TypeModeCard
                verse={resolvedVerse}
                onAttemptSaved={() => {}}
                onFirstType={() => {}}
              />
            )}
            {currentMode === 'speech' && verseReady && (
              <SpeechModeCard
                verse={resolvedVerse}
                onAttemptSaved={() => {}}
                onFirstRecord={() => {}}
                onBlockNavigationChange={setShouldConfirmNavigation}
              />
            )}
            {currentMode === 'stealth' && verseReady && (
              <StealthModeCard
                verse={resolvedVerse}
                onBrowseVerses={handleChangeVerse}
                verseParts={verseParts}
                startVerse={startParam}
              />
            )}
            {(currentMode === 'stealth' && isLoadingVerses) && (
              <div className="text-xs text-neutral-500">Cargando versículos para marcadores…</div>
            )}
          </div>
        )}
      </main>
      <Separator />
      <footer className="px-4 py-6 text-center text-xs text-neutral-500">Solo datos locales · v0.1</footer>
    </div>
  );
}
