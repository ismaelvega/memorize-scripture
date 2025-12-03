"use client";
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { TypeModeCard } from '@/components/type-mode-card';
import { SpeechModeCard } from '@/components/speech-mode-card';
import { StealthModeCard } from '@/components/stealth-mode-card';
import { SequenceModeCard } from '@/components/sequence-mode-card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { loadProgress } from '@/lib/storage';
import type { AppMode, TrackingMode, Verse } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Home, LogOut } from 'lucide-react';
import { Footer } from '@/components/footer';
import { sanitizeVerseText } from '@/lib/sanitize';
import { useNavigationWarning } from '@/lib/use-navigation-warning';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuthUserId } from '@/lib/use-auth-user-id';

interface PracticeModePageProps {
  params: Promise<{ mode: string }>;
}

const VALID_MODES: AppMode[] = ['type', 'speech', 'stealth', 'sequence'];
const MODE_LABELS: Record<AppMode, string> = {
  type: 'Modo Escritura',
  speech: 'Modo Voz',
  stealth: 'Modo Sigilo',
  sequence: 'Modo Secuencia',
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

export default function PracticeModePage({ params }: PracticeModePageProps) {
  const { mode: modeParam } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const contextParam = searchParams.get('context');
  const trackingMode: TrackingMode = contextParam === 'review' ? 'review' : 'progress';
  const isReview = trackingMode !== 'progress';
  const userId = useAuthUserId();

  if (!VALID_MODES.includes(modeParam as AppMode)) {
    notFound();
  }

  const currentMode = modeParam as AppMode;
  const idParam = searchParams.get('id');
  const selectionFromId = React.useMemo(() => parseSelectionFromId(idParam), [idParam]);
  const startParam = Number(searchParams.get('start') || selectionFromId?.start || 1);
  const endParam = Number(searchParams.get('end') || selectionFromId?.end || startParam);

  // Load persisted progress (localStorage) on the client only to avoid
  // hydration mismatches caused by reading client-only data during render.
  const [clientEntry, setClientEntry] = React.useState<any | undefined>(undefined);
  const [clientEntryLoaded, setClientEntryLoaded] = React.useState(false);
  React.useEffect(() => {
    if (!idParam) {
      setClientEntry(undefined);
      setClientEntryLoaded(true);
      return;
    }
    try {
      const p = loadProgress();
      // Try to load from the main verses map first; if not present, fall back
      // to a saved passage entry so selecting from Saved page works as expected.
      const entry = p.verses[idParam] ?? (p.saved && p.saved[idParam] ? p.saved[idParam].verse : undefined);
      setClientEntry(entry);
    } catch {
      setClientEntry(undefined);
    }
    setClientEntryLoaded(true);
  }, [idParam]);

  // Build a fallback verse object from the URL ID when localStorage has no entry
  // This allows practice to work for verses only synced from Supabase (not in local storage)
  const verse: Verse | null = React.useMemo(() => {
    const entry = idParam ? clientEntry : undefined;
    if (idParam && entry) {
      const { reference, translation, text, source } = entry;
      return {
        id: idParam,
        reference,
        translation: translation || 'RVR1960',
        text: text || '',
        source: source || 'built-in',
      };
    }
    // Fallback: construct verse from URL params when entry is missing
    if (idParam && selectionFromId && clientEntryLoaded) {
      const { bookKey, chapter, start, end } = selectionFromId;
      // Build a reference string from parsed components
      const bookName = bookKey
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      const verseRange = start === end ? `${start}` : `${start}-${end}`;
      const reference = `${bookName} ${chapter}:${verseRange}`;
      return {
        id: idParam,
        reference,
        translation: 'RVR1960',
        text: '', // Will be filled by resolvedVerse from Bible data
        source: 'built-in' as const,
      };
    }
    return null;
  }, [clientEntry, clientEntryLoaded, idParam, selectionFromId]);

  const [chapterVerses, setChapterVerses] = React.useState<string[] | null>(null);
  const [isLoadingVerses, setIsLoadingVerses] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [navigationLocks, setNavigationLocks] = React.useState<Record<AppMode, boolean>>({
    type: false,
    speech: false,
    stealth: false,
    sequence: false,
  });
  const shouldConfirmNavigation = React.useMemo(
    () => Object.values(navigationLocks).some(Boolean),
    [navigationLocks]
  );
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = React.useState(false);
  const pendingNavigationRef = React.useRef<(() => void) | null>(null);
  // Cooldown ref to prevent modal from reopening immediately after cancel
  const dialogCooldownRef = React.useRef(false);

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
        setChapterVerses(chapterData);
      } catch (error: any) {
        if (!active) return;
        setFetchError(error?.message || 'Error al cargar los versÃ­culos');
        setChapterVerses(null);
      } finally {
        if (active) setIsLoadingVerses(false);
      }
    }

    loadChapter();
    return () => { active = false; };
  }, [selectionFromId, verse?.source]);

  const verseParts = React.useMemo(() => {
    if (!chapterVerses || Number.isNaN(startParam) || Number.isNaN(endParam)) {
      return undefined;
    }
    return chapterVerses.slice(startParam - 1, endParam);
  }, [chapterVerses, startParam, endParam]);

  const resolvedVerse: Verse | null = React.useMemo(() => {
    if (!verse) return null;
    if (verse.text && verse.text.includes('<sup>')) return verse;
    if (verseParts && verseParts.length > 0) {
      const textWithNumbers = verseParts.map((v, i) => `<sup>${startParam + i}</sup>&nbsp;${sanitizeVerseText(v, false)}`).join(' ');
      return { ...verse, text: textWithNumbers };
    }
    return verse;
  }, [verse, verseParts, startParam]);

  const verseReady = !!(resolvedVerse && resolvedVerse.text.trim().length > 0);
  const [remoteAttempts, setRemoteAttempts] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadRemoteAttempts() {
      if (!userId || !idParam) {
        setRemoteAttempts([]);
        return;
      }
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('verse_attempts')
          .select('id, mode, accuracy, missed_count, extra_count, created_at, diff, transcription, speech_duration, confidence_score, stealth_stats, sequence_stats, reference, translation, source, verse_text')
          .eq('user_id', userId)
          .eq('verse_id', idParam)
          .order('created_at', { ascending: false });
        if (cancelled || error || !data) {
          setRemoteAttempts([]);
          return;
        }
        const mapped = data.map((row) => ({
          ts: new Date(row.created_at || Date.now()).getTime(),
          mode: row.mode,
          inputLength: (row.transcription || row.verse_text || '').length,
          accuracy: Number(row.accuracy) || 0,
          missedWords: [],
          extraWords: [],
          feedback: undefined,
          promptHints: undefined,
          diff: row.diff || undefined,
          transcription: row.transcription || undefined,
          audioDuration: row.speech_duration || undefined,
          confidenceScore: row.confidence_score || undefined,
          stealthStats: row.stealth_stats || undefined,
          sequenceStats: row.sequence_stats || undefined,
        }));
        setRemoteAttempts(mapped);
      } catch {
        if (!cancelled) setRemoteAttempts([]);
      }
    }
    void loadRemoteAttempts();
    return () => {
      cancelled = true;
    };
  }, [userId, idParam]);

  const setNavigationLock = React.useCallback((mode: AppMode, active: boolean) => {
    setNavigationLocks(prev => {
      if (prev[mode] === active) return prev;
      return { ...prev, [mode]: active };
    });
  }, []);

  const clearNavigationLocks = React.useCallback(() => {
    setNavigationLocks({ type: false, speech: false, stealth: false, sequence: false });
  }, []);

  const requestNavigation = React.useCallback((action: () => void) => {
    // If on cooldown after cancel, ignore navigation requests briefly
    if (dialogCooldownRef.current) {
      return;
    }
    if (shouldConfirmNavigation) {
      pendingNavigationRef.current = action;
      setIsLeaveDialogOpen(true);
    } else {
      action();
    }
  }, [shouldConfirmNavigation]);

  useNavigationWarning(shouldConfirmNavigation, {
    onAttempt: (action) => {
      requestNavigation(action);
    },
  });

  const handleTypeAttemptState = React.useCallback((active: boolean) => {
    setNavigationLock('type', active);
  }, [setNavigationLock]);

  const handleSpeechAttemptState = React.useCallback((active: boolean) => {
    setNavigationLock('speech', active);
  }, [setNavigationLock]);

  const handleStealthAttemptState = React.useCallback((active: boolean) => {
    setNavigationLock('stealth', active);
  }, [setNavigationLock]);

  const handleSequenceAttemptState = React.useCallback((active: boolean) => {
    setNavigationLock('sequence', active);
  }, [setNavigationLock]);

  const handleHomeClick = React.useCallback(() => {
    requestNavigation(() => router.push('/'));
  }, [requestNavigation, router]);

  const handleChangeVerse = React.useCallback(() => {
    const target = isReview ? '/repaso' : '/practice';
    requestNavigation(() => router.push(target));
  }, [requestNavigation, router, isReview]);

  const handleCancelLeave = React.useCallback(() => {
    pendingNavigationRef.current = null;
    setIsLeaveDialogOpen(false);
    // Set cooldown to prevent immediate reopen from stale navigation events
    dialogCooldownRef.current = true;
    setTimeout(() => {
      dialogCooldownRef.current = false;
    }, 100);
  }, []);

  const handleConfirmLeave = React.useCallback(() => {
    const action = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setIsLeaveDialogOpen(false);
    clearNavigationLocks();
    action?.();
  }, [clearNavigationLocks]);

  const handleLeaveDialogChange = React.useCallback((open: boolean) => {
    if (!open) {
      handleCancelLeave();
    }
  }, [handleCancelLeave]);

  const referenceLabel = React.useMemo(() => {
    if (!resolvedVerse) return '';
    if (startParam === endParam) {
      return resolvedVerse.reference;
    }
    // Multi-verse range: rebuild reference with range
    const rangeSuffix = `${startParam}-${endParam}`;
    const colonIndex = resolvedVerse.reference.indexOf(':');
    if (colonIndex === -1) {
      return resolvedVerse.reference;
    }
    const base = resolvedVerse.reference.slice(0, colonIndex);
    return `${base}:${rangeSuffix}`;
  }, [resolvedVerse, startParam, endParam]);

  const handlePractice = React.useCallback(() => {
    if (!idParam) {
      router.push(isReview ? '/repaso' : '/practice');
      return;
    }
    if (isReview) {
      router.push('/repaso');
      return;
    }
    const params = new URLSearchParams();
    params.set('id', idParam);
    if (!Number.isNaN(startParam)) params.set('start', String(startParam));
    if (!Number.isNaN(endParam)) params.set('end', String(endParam));
    params.set('fromMode', 'true'); // Indicate user comes from read mode
    router.push(`/practice?${params.toString()}`);
  }, [router, idParam, startParam, endParam, isReview]);

  const handleChangeMode = React.useCallback(() => {
    if (!idParam) {
      router.push(isReview ? '/repaso' : '/practice');
      return;
    }
    // Navigate to practice page to open mode selector
    const params = new URLSearchParams();
    params.set('id', idParam);
    if (!Number.isNaN(startParam)) params.set('start', String(startParam));
    if (!Number.isNaN(endParam)) params.set('end', String(endParam));
    params.set('fromMode', 'true');
    requestNavigation(() => router.push(`/practice?${params.toString()}`));
  }, [router, idParam, startParam, endParam, isReview, requestNavigation]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleChangeMode}
          className="h-10 w-10 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {isReview ? 'Repaso' : 'Práctica'}
          </p>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {MODE_LABELS[currentMode]}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleHomeClick}
          className="h-10 w-10 rounded-full"
        >
          <Home className="h-5 w-5" />
        </Button>
      </header>
      {resolvedVerse && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 px-4 pb-3">{referenceLabel}</p>
      )}



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
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Cargando pasajes</div>
            )}
            {currentMode === 'type' && verseReady && (
              <TypeModeCard
                verse={resolvedVerse}
                onAttemptSaved={() => {}}
                onFirstType={() => {}}
                onAttemptStateChange={handleTypeAttemptState}
                onBrowseVerses={handlePractice}
                trackingMode={trackingMode}
                remoteAttempts={remoteAttempts}
              />
            )}
            {currentMode === 'speech' && verseReady && (
              <SpeechModeCard
                verse={resolvedVerse}
                onAttemptSaved={() => {}}
                onFirstRecord={() => {}}
                onBlockNavigationChange={handleSpeechAttemptState}
                onBrowseVerses={handlePractice}
                trackingMode={trackingMode}
                remoteAttempts={remoteAttempts}
              />
            )}
            {currentMode === 'stealth' && verseReady && (
              <StealthModeCard
                verse={resolvedVerse}
                onBrowseVerses={handlePractice}
                verseParts={verseParts}
                startVerse={startParam}
                onAttemptStateChange={handleStealthAttemptState}
                trackingMode={trackingMode}
                remoteAttempts={remoteAttempts}
              />
            )}
            {currentMode === 'sequence' && verseReady && (
              <SequenceModeCard
                verse={resolvedVerse}
                onAttemptSaved={() => {}}
                onAttemptStateChange={handleSequenceAttemptState}
                onPractice={handlePractice}
                trackingMode={trackingMode}
                remoteAttempts={remoteAttempts}
              />
            )}
            {(currentMode === 'stealth' && isLoadingVerses) && (
              <div className="text-xs text-neutral-500">Cargando versículos para marcadores</div>
            )}
          </div>
        )}
      </main>
      <Separator />
      <Footer />
      <Dialog open={isLeaveDialogOpen} onOpenChange={handleLeaveDialogChange}>
        <DialogContent
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
          className="max-w-sm !w-[calc(100%-2rem)] rounded-xl"
        >
          <DialogHeader>
            <DialogTitle>¿Salir sin terminar?</DialogTitle>
            <DialogDescription>
              Tu intento actual se descartará si abandonas esta pantalla.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex w-full flex-col gap-3">
              <Button onClick={handleConfirmLeave} className="w-full flex items-center justify-center gap-2">
                <LogOut className="h-4 w-4" />
                Salir de todos modos
              </Button>
              <Button variant="outline" onClick={handleCancelLeave} className="w-full">
                Continuar practicando
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
