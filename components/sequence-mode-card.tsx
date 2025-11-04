"use client";
import * as React from 'react';
import { Attempt, Verse } from '@/lib/types';
import {
  chunkVerseForSequenceMode,
  SequenceChunkDefinition,
  shuffleArray,
  tokenize,
  diffTokens,
  normalizeForCompare,
  isPunct,
} from '@/lib/utils';
import { appendAttempt, clearVerseHistory, loadProgress } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { History } from './history';
import { RotateCcw, Lightbulb } from 'lucide-react';
import DiffRenderer from './diff-renderer';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type CitationSegmentId = 'book' | 'chapter' | 'verses';

type CitationSegment = {
  id: CitationSegmentId;
  label: string;
  order: number;
  appended: boolean;
};

function extractCitationSegments(reference: string | undefined): CitationSegment[] {
  if (!reference) return [];
  const trimmed = reference.trim();
  if (!trimmed) return [];

  const colonIndex = trimmed.indexOf(':');
  if (colonIndex === -1) {
    return [{ id: 'book', label: trimmed, order: 0, appended: false }];
  }

  const beforeColon = trimmed.slice(0, colonIndex).trim();
  const afterColon = trimmed.slice(colonIndex + 1).trim();
  const lastSpaceIdx = beforeColon.lastIndexOf(' ');

  let bookLabel = beforeColon;
  let chapterLabel = '';

  if (lastSpaceIdx !== -1) {
    bookLabel = beforeColon.slice(0, lastSpaceIdx).trim();
    chapterLabel = beforeColon.slice(lastSpaceIdx + 1).trim();
  }

  const segments: CitationSegment[] = [];
  let order = 0;
  if (bookLabel) segments.push({ id: 'book', label: bookLabel, order: order++, appended: false });
  if (chapterLabel) segments.push({ id: 'chapter', label: chapterLabel, order: order++, appended: false });
  if (afterColon) segments.push({ id: 'verses', label: afterColon, order: order++, appended: false });
  return segments;
}

// Haptic feedback helper
function vibratePattern(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // silently ignore vibration errors
    }
  }
}

interface SequenceChunk extends SequenceChunkDefinition {
  id: string;
  index: number;
}

interface SequenceModeCardProps {
  verse: Verse | null;
  onAttemptSaved: () => void;
  onAttemptStateChange?: (active: boolean) => void;
}

export const SequenceModeCard: React.FC<SequenceModeCardProps> = ({
  verse,
  onAttemptSaved,
  onAttemptStateChange,
}) => {
  // no toasts: prefer aria-live region updates
  const [orderedChunks, setOrderedChunks] = React.useState<SequenceChunk[]>([]);
  const [availableChunks, setAvailableChunks] = React.useState<SequenceChunk[]>([]);
  const [visibleChunks, setVisibleChunks] = React.useState<SequenceChunk[]>([]);
  const [selectionTrail, setSelectionTrail] = React.useState<SequenceChunk[]>([]);
  const [mistakesByChunk, setMistakesByChunk] = React.useState<Record<string, number>>({});
  const [attempts, setAttempts] = React.useState<Attempt[]>([]);
  const [status, setStatus] = React.useState<'idle' | 'complete'>('idle');
  const [highlightedChunkId, setHighlightedChunkId] = React.useState<string | null>(null);
  const [lastAccuracy, setLastAccuracy] = React.useState<number | null>(null);
  const [lastMistakes, setLastMistakes] = React.useState<number | null>(null);
  const [isClearHistoryOpen, setIsClearHistoryOpen] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);
  // Citation bubbles state (mirrors ReadModeCard behavior)
  const [citationSegments, setCitationSegments] = React.useState<CitationSegment[]>([]);
  const [appendedReference, setAppendedReference] = React.useState<Partial<Record<CitationSegmentId, string>>>({});
  const [citationAnnounce, setCitationAnnounce] = React.useState<string>('');
  const citationButtonsRef = React.useRef<Partial<Record<CitationSegmentId, HTMLButtonElement | null>>>({});
  const [citationComplete, setCitationComplete] = React.useState(false);
  const [lastAttempt, setLastAttempt] = React.useState<Attempt | null>(null);
  const liveRegionRef = React.useRef<HTMLDivElement | null>(null);
  const attemptActiveRef = React.useRef(false);
  const highlightTimer = React.useRef<number | null>(null);
  const positiveHighlightTimer = React.useRef<number | null>(null);
  const trailContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [recentCorrectChunkId, setRecentCorrectChunkId] = React.useState<string | null>(null);
  const [animatingChunkId, setAnimatingChunkId] = React.useState<string | null>(null);
  const chunkRefsPool = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const chunkRefsTrail = React.useRef<Record<string, HTMLSpanElement | null>>({});

  const totalChunks = orderedChunks.length;
  const mistakesTotal = React.useMemo(
    () => Object.values(mistakesByChunk).reduce((sum, count) => sum + count, 0),
    [mistakesByChunk]
  );

  const ensureAttemptActive = React.useCallback(() => {
    if (!attemptActiveRef.current) {
      attemptActiveRef.current = true;
      onAttemptStateChange?.(true);
    }
  }, [onAttemptStateChange]);

  const refreshVisibleChunks = React.useCallback((available: SequenceChunk[], expectedIdx: number, ordered: SequenceChunk[]) => {
    if (!available.length || !ordered.length) {
      setVisibleChunks([]);
      return;
    }
    
    const expectedChunk = ordered[expectedIdx];
    if (!expectedChunk) {
      setVisibleChunks(available.slice(0, 5));
      return;
    }

    // Find the expected chunk in available
    const expectedInAvailable = available.find(ch => ch.id === expectedChunk.id);
    
    if (!expectedInAvailable) {
      // Expected chunk already selected, just show up to 5 random
      setVisibleChunks(shuffleArray(available).slice(0, 5));
      return;
    }

    // Get 4 random incorrect chunks
    const incorrectChunks = available.filter(ch => ch.id !== expectedChunk.id);
    const shuffledIncorrect = shuffleArray(incorrectChunks);
    const selectedIncorrect = shuffledIncorrect.slice(0, Math.min(4, shuffledIncorrect.length));
    
    // Combine expected + 4 incorrect, then shuffle for display
    const pool = shuffleArray([expectedInAvailable, ...selectedIncorrect]);
    setVisibleChunks(pool);
  }, []);

  const resetAttemptState = React.useCallback(() => {
    setSelectionTrail([]);
    setMistakesByChunk({});
    setStatus('idle');
    setLastAccuracy(null);
    setLastMistakes(null);
    setHighlightedChunkId(null);
    setShowHint(false);
    setRecentCorrectChunkId(null);
    setCitationSegments([]);
    setAppendedReference({});
    setCitationAnnounce('');
    setCitationComplete(false);
    attemptActiveRef.current = false;
    onAttemptStateChange?.(false);
    const shuffled = orderedChunks.length ? shuffleArray(orderedChunks) : [];
    setAvailableChunks(shuffled);
    refreshVisibleChunks(shuffled, 0, orderedChunks);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = 'Secuencia reiniciada.';
    }
  }, [orderedChunks, onAttemptStateChange, refreshVisibleChunks]);

  React.useEffect(() => {
    return () => {
      if (highlightTimer.current) {
        window.clearTimeout(highlightTimer.current);
      }
      if (positiveHighlightTimer.current) {
        window.clearTimeout(positiveHighlightTimer.current);
      }
    };
  }, []);
      if (positiveHighlightTimer.current) {
        window.clearTimeout(positiveHighlightTimer.current);
      }

  React.useEffect(() => {
    if (!verse?.text) {
      setOrderedChunks([]);
      setAvailableChunks([]);
      setSelectionTrail([]);
      setMistakesByChunk({});
      setAttempts([]);
      setStatus('idle');
      setLastAccuracy(null);
      setLastMistakes(null);
      setCitationSegments([]);
      setAppendedReference({});
      setCitationAnnounce('');
      setCitationComplete(false);
      attemptActiveRef.current = false;
      onAttemptStateChange?.(false);
      return;
    }

    const baseChunks = chunkVerseForSequenceMode(verse.text);
    const withIds: SequenceChunk[] = baseChunks.map((chunk, index) => ({
      ...chunk,
      id: `chunk-${index}`,
      index,
    }));
    setOrderedChunks(withIds);
    const shuffled = shuffleArray(withIds);
    setAvailableChunks(shuffled);
    setSelectionTrail([]);
    setMistakesByChunk({});
  setStatus('idle');
    setLastAccuracy(null);
    setLastMistakes(null);
    setShowHint(false);
    setRecentCorrectChunkId(null);
    setCitationSegments([]);
    setAppendedReference({});
    setCitationAnnounce('');
    setCitationComplete(false);
    attemptActiveRef.current = false;
    onAttemptStateChange?.(false);
    refreshVisibleChunks(shuffled, 0, withIds);

    const progress = loadProgress();
    setAttempts(progress.verses[verse.id]?.attempts || []);
  }, [verse, onAttemptStateChange, refreshVisibleChunks]);

  // When status becomes 'complete', initialize citation segments from verse.reference
  React.useEffect(() => {
    if (status === 'complete' && verse) {
      const segments = extractCitationSegments(verse.reference);
      setAppendedReference({});
      if (segments.length > 0) {
        setCitationSegments(segments);
        setCitationComplete(false);
        // Focus first bubble after render
        requestAnimationFrame(() => {
          try { citationButtonsRef.current[segments[0].id]?.focus(); } catch {}
        });
      } else {
        setCitationSegments([]);
        setCitationComplete(true);
      }
    } else if (status !== 'complete') {
      // Reset if user retries
      setCitationSegments([]);
      setAppendedReference({});
      setCitationAnnounce('');
      setCitationComplete(false);
    }
  }, [status, verse]);

  const handleCitationSegmentClick = React.useCallback((segmentId: CitationSegmentId) => {
    setCitationSegments(prev => {
      const segment = prev.find(item => item.id === segmentId);
      if (!segment || segment.appended) return prev;
      const nextSegment = [...prev].find(item => !item.appended);
      if (nextSegment && nextSegment.id !== segmentId) return prev; // enforce order
      setAppendedReference(prevRef => ({ ...prevRef, [segmentId]: segment.label }));
      setCitationAnnounce(`Agregado: ${segment.label}`);
      const updated = prev.map(item => item.id === segmentId ? { ...item, appended: true } : item);
      // focus next or finish
      requestAnimationFrame(() => {
        const next = updated.find(s => !s.appended);
        if (next) {
          const btn = citationButtonsRef.current[next.id];
          try { btn?.focus(); } catch {}
        } else {
          // all appended: nothing else to do (already complete)
          setCitationComplete(true);
          setCitationAnnounce('Cita completada.');
        }
      });
      return updated;
    });
  }, []);

  const finalizeAttempt = React.useCallback(
    (completedTrail: SequenceChunk[]) => {
      if (!verse) return;
      const total = orderedChunks.length;
      if (total === 0) return;
      const mistakeEntries = orderedChunks.map((chunk) => ({
        chunk,
        count: mistakesByChunk[chunk.id] ?? 0,
      }));
      const mistakesCount = mistakeEntries.reduce((sum, entry) => sum + entry.count, 0);
      const accuracy =
        total === 0
          ? 0
          : Math.max(0, Math.round(((total - mistakesCount) / total) * 100));

      const attemptTextForDiff = orderedChunks
        .filter((chunk) => (mistakesByChunk[chunk.id] ?? 0) === 0)
        .map((chunk) => chunk.text)
        .join(' ');

      const targetTokens = tokenize(verse.text);
      const attemptTokens = tokenize(attemptTextForDiff);
      const diff = diffTokens(targetTokens, attemptTokens, { normalize: normalizeForCompare });
      const missedWords = diff
        .filter((token) => token.status === 'missing' && !isPunct(token.token))
        .map((token) => token.token);
      const extraWords = diff
        .filter((token) => token.status === 'extra' && !isPunct(token.token))
        .map((token) => token.token);

      const attempt: Attempt = {
        ts: Date.now(),
        mode: 'sequence',
        inputLength: completedTrail.map((chunk) => chunk.text).join(' ').length,
        accuracy,
        missedWords,
        extraWords,
        feedback:
          accuracy === 100
            ? '¡Excelente! Reconstruiste el pasaje en orden perfecto.'
            : 'Revisa los fragmentos resaltados y vuelve a intentar la secuencia.',
        diff,
        sequenceStats: {
          totalChunks: total,
          mistakes: mistakesCount,
          selectedChunks: completedTrail.map((chunk) => chunk.text),
          mistakeCountsByChunk: mistakeEntries
            .filter((entry) => entry.count > 0)
            .map((entry) => ({
              index: entry.chunk.index,
              text: entry.chunk.text,
              count: entry.count,
            })),
        },
      };

      appendAttempt(verse, attempt);
  // store the most recent attempt locally so we can show its diff in the UI
  setLastAttempt(attempt);
      onAttemptSaved();
      const progress = loadProgress();
      setAttempts(progress.verses[verse.id]?.attempts || []);
      setStatus('complete');
      setLastAccuracy(accuracy);
      setLastMistakes(mistakesCount);
      attemptActiveRef.current = false;
      onAttemptStateChange?.(false);
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Secuencia completada con precisión de ${accuracy} por ciento.`;
      }
      // Haptic celebration for perfect score
      if (accuracy === 100) {
        vibratePattern([50, 100, 50]);
      }
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Secuencia completada con precisión de ${accuracy} por ciento.`;
      }
    },
    [verse, orderedChunks, mistakesByChunk, onAttemptSaved, onAttemptStateChange]
  );

  const handleChunkClick = React.useCallback(
    (chunk: SequenceChunk) => {
      if (!verse || status === 'complete') return;
      if (!orderedChunks.length) return;

      const expectedIndex = selectionTrail.length;
      const expectedChunk = orderedChunks[expectedIndex];
      if (!expectedChunk) return;

      ensureAttemptActive();

      // Normalize text for comparison to handle duplicates (e.g., "y tiempo de" repeated)
      const normalizeChunkText = (text: string) =>
        text.toLowerCase().trim().replace(/[,;.]/g, '');
      const isCorrectByContent =
        normalizeChunkText(chunk.text) === normalizeChunkText(expectedChunk.text);

      if (isCorrectByContent) {
        // FLIP animation: First - capture initial position
        const poolButton = chunkRefsPool.current[chunk.id];
        const firstRect = poolButton?.getBoundingClientRect();

        // Accept any chunk with matching text content (handles duplicates gracefully)
        const nextTrail = [...selectionTrail, expectedChunk]; // Use expectedChunk to maintain order
        setSelectionTrail(nextTrail);
        setRecentCorrectChunkId(expectedChunk.id);
        setAnimatingChunkId(expectedChunk.id);
        
        if (positiveHighlightTimer.current) {
          window.clearTimeout(positiveHighlightTimer.current);
        }
        positiveHighlightTimer.current = window.setTimeout(() => {
          setRecentCorrectChunkId(null);
        }, 600);

        const remaining = availableChunks.filter((item) => item.id !== chunk.id);
        const shuffledRemaining = remaining.length <= 1 ? remaining : shuffleArray(remaining);
        setAvailableChunks(shuffledRemaining);
        // Refresh visible pool for next expected chunk
        refreshVisibleChunks(shuffledRemaining, nextTrail.length, orderedChunks);
        setHighlightedChunkId(null);
        setShowHint(false); // hide hint on correct selection
        // Haptic feedback for success
        vibratePattern(30);

        // FLIP animation: Last - wait for DOM update, then animate
        if (firstRect) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const trailSpan = chunkRefsTrail.current[expectedChunk.id];
              const lastRect = trailSpan?.getBoundingClientRect();
              
              if (lastRect && trailSpan) {
                // Invert: calculate the difference
                const deltaX = firstRect.left - lastRect.left;
                const deltaY = firstRect.top - lastRect.top;
                const scaleX = firstRect.width / lastRect.width;
                const scaleY = firstRect.height / lastRect.height;

                // Play: animate from old position to new
                trailSpan.style.transformOrigin = 'top left';
                trailSpan.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
                trailSpan.style.transition = 'none';

                requestAnimationFrame(() => {
                  trailSpan.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                  trailSpan.style.transform = 'translate(0, 0) scale(1, 1)';
                  
                  setTimeout(() => {
                    trailSpan.style.transition = '';
                    trailSpan.style.transform = '';
                    trailSpan.style.transformOrigin = '';
                    setAnimatingChunkId(null);
                  }, 400);
                });
              } else {
                setAnimatingChunkId(null);
              }
            });
          });
        }

        // Scroll to bottom of trail to show most recent chunks
        if (trailContainerRef.current) {
          setTimeout(() => {
            if (trailContainerRef.current) {
              trailContainerRef.current.scrollTop = trailContainerRef.current.scrollHeight;
            }
          }, 450); // After animation completes
        }
        if (nextTrail.length === orderedChunks.length) {
          finalizeAttempt(nextTrail);
        } else if (liveRegionRef.current) {
          liveRegionRef.current.textContent = `Fragmento correcto. ${nextTrail.length} de ${orderedChunks.length}.`;
        }
        return;
      }

      setMistakesByChunk((prev) => ({
        ...prev,
        [expectedChunk.id]: (prev[expectedChunk.id] ?? 0) + 1,
      }));
      setHighlightedChunkId(chunk.id);
      // Haptic feedback for error (longer pattern)
      vibratePattern([100, 50, 100]);
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = 'Fragmento incorrecto. Intenta con otro.';
      }
      if (highlightTimer.current) {
        window.clearTimeout(highlightTimer.current);
      }
      highlightTimer.current = window.setTimeout(() => {
        setHighlightedChunkId(null);
      }, 800);
    },
    [
      verse,
      status,
      orderedChunks,
      selectionTrail,
      ensureAttemptActive,
      finalizeAttempt,
      availableChunks,
      refreshVisibleChunks,
    ]
  );

  const handleReset = React.useCallback(() => {
    if (!orderedChunks.length) return;
    resetAttemptState();
  }, [orderedChunks, resetAttemptState]);

  const handleClearHistory = React.useCallback(() => {
    if (!verse) return;
    clearVerseHistory(verse.id);
    const progress = loadProgress();
    setAttempts(progress.verses[verse.id]?.attempts || []);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = 'Historial eliminado.';
    }
    setIsClearHistoryOpen(false);
  }, [verse]);

  const handleShowHint = React.useCallback(() => {
    if (!orderedChunks.length || status === 'complete') return;
    const expectedIndex = selectionTrail.length;
    const expectedChunk = orderedChunks[expectedIndex];
    if (!expectedChunk) return;
    // Count this as a mistake for the expected chunk
    setMistakesByChunk((prev) => ({
      ...prev,
      [expectedChunk.id]: (prev[expectedChunk.id] ?? 0) + 1,
    }));
    setShowHint(true);
    vibratePattern(50);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `Pista: el siguiente fragmento es ${expectedChunk.text}`;
    }
  }, [orderedChunks, selectionTrail, status]);

  const remainingChunks = totalChunks - selectionTrail.length;
  const progressValue = totalChunks ? Math.round((selectionTrail.length / totalChunks) * 100) : 0;
  
  // Find the expected chunk for hint highlighting
  const expectedChunk = orderedChunks[selectionTrail.length];

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="flex-1 flex flex-col space-y-3 overflow-hidden pb-4 pt-4">
        {!totalChunks && (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Este pasaje no tiene texto disponible para practicar en secuencia.
          </div>
        )}
        {totalChunks > 0 && (
          <>
            <div className="space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                <span className="font-medium">
                  {selectionTrail.length} / {totalChunks}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'font-medium',
                    mistakesTotal > 0 && 'text-orange-600 dark:text-orange-400'
                  )}>
                    {selectionTrail.length === 0 ? `Errores: ${mistakesTotal}` : (mistakesTotal === 0 ? '¡Perfecto!' : `${mistakesTotal} error${mistakesTotal === 1 ? '' : 'es'}`)}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShowHint}
                      disabled={!totalChunks || status === 'complete'}
                      className="flex items-center gap-1.5 h-8 px-2"
                      title="Mostrar pista (suma 1 error)"
                    >
                      <Lightbulb size={14} />
                      <span className="sr-only">Pista</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      disabled={!totalChunks}
                      className="flex items-center gap-1.5 h-8 px-2"
                      title="Reiniciar"
                    >
                      <RotateCcw size={14} />
                      <span className="sr-only">Reiniciar</span>
                    </Button>
                  </div>
                </div>
              </div>
              <Progress 
                value={progressValue} 
                className={cn(
                  'h-2.5 transition-all',
                  progressValue === 100 && 'bg-green-200 dark:bg-green-900'
                )}
              />
            </div>

            <div 
              ref={trailContainerRef}
              className="rounded-lg border-2 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-3 max-h-[120px] overflow-y-auto flex flex-col flex-shrink-0"
            >
              <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 font-medium flex-shrink-0">
                Tu secuencia
              </p>
              <div className="flex flex-wrap gap-2 flex-1 content-start">
                {!citationComplete || !lastAttempt ? (
                  selectionTrail.length === 0 ? (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 italic">
                      Toca los fragmentos en orden…
                    </span>
                  ) : (
                    selectionTrail.map((chunk, idx) => (
                      <span
                        key={chunk.id}
                        ref={(el) => { chunkRefsTrail.current[chunk.id] = el; }}
                        className={cn(
                          'rounded-full text-white px-3 py-1.5 text-sm font-medium shadow-sm',
                          chunk.id === animatingChunkId ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-200',
                          chunk.id === recentCorrectChunkId
                            ? 'bg-emerald-600 dark:bg-emerald-500 animate-[pulse_0.6s_ease-in-out] shadow-lg'
                            : 'bg-blue-600 dark:bg-blue-500'
                        )}
                        style={chunk.id === animatingChunkId ? {} : { animationDelay: `${idx * 30}ms` }}
                      >
                        {chunk.text}
                      </span>
                    ))
                  )
                ) : (
                  // citationComplete && lastAttempt: show diff of the attempt
                  <div className="w-full text-sm">
                    <h5 className="text-xs font-medium mb-2">Diferencias del intento</h5>
                    <div className="prose max-w-none text-sm">
                      {/* DiffRenderer expects diff tokens */}
                      <DiffRenderer diff={lastAttempt.diff || []} />
                    </div>
                  </div>
                )}
              </div>
              {remainingChunks > 0 && (
                <p className="mt-2.5 text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500 font-medium flex-shrink-0">
                  Faltan {remainingChunks}
                </p>
              )}
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 font-medium flex-shrink-0">
                Fragmentos disponibles
              </p>
              <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 overflow-y-auto" style={{ maxHeight: 'calc(5 * 68px)' }}>
                {visibleChunks.map((chunk) => {
                  const isExpected = expectedChunk?.id === chunk.id;
                  const isHighlighted = highlightedChunkId === chunk.id;
                  return (
                    <Button
                      key={chunk.id}
                      ref={(el) => { chunkRefsPool.current[chunk.id] = el; }}
                      type="button"
                      variant="outline"
                      size="lg"
                      className={cn(
                        'justify-start text-left text-sm font-medium leading-snug whitespace-normal min-h-[52px] px-4 py-3.5 transition-all rounded-xl',
                        'border-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                        'active:scale-[0.98] touch-manipulation',
                        isHighlighted &&
                          'border-red-500 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-950/40 dark:text-red-300 animate-shake',
                        showHint && isExpected &&
                          'border-yellow-500 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-950/30 ring-2 ring-yellow-400/50'
                      )}
                      onClick={() => handleChunkClick(chunk)}
                      disabled={status === 'complete'}
                    >
                      {chunk.text}
                    </Button>
                  );
                })}
              </div>
            </div>

            {status === 'complete' && (
              <>
                {citationSegments.length > 0 && !citationComplete && (
                  <div className="rounded-lg border px-4 py-3 bg-white dark:bg-neutral-950">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 text-center mb-2">
                      {citationComplete ? 'Cita completada' : 'Toca las burbujas en orden para completar la cita'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {citationSegments.map((segment) => (
                        <button
                          key={segment.id}
                          ref={(el) => { citationButtonsRef.current[segment.id] = el; }}
                          type="button"
                          onClick={() => handleCitationSegmentClick(segment.id)}
                          disabled={segment.appended}
                          onKeyDown={(event) => {
                            const isSpace = event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space' || event.code === 'Space';
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              handleCitationSegmentClick(segment.id);
                            }
                            if (isSpace) {
                              event.preventDefault();
                              const nextPending = citationSegments.find(s => !s.appended);
                              if (nextPending && nextPending.id === segment.id) {
                                handleCitationSegmentClick(segment.id);
                              } else if (!segment.appended) {
                                if (nextPending) {
                                  const btn = citationButtonsRef.current[nextPending.id];
                                  try { btn?.focus(); } catch {}
                                }
                              }
                            }
                          }}
                          className={cn(
                            'inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors shadow-sm',
                            segment.appended
                              ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                              : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800',
                            citationSegments.find(s => !s.appended)?.id === segment.id
                              ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900'
                              : ''
                          )}
                        >
                          {segment.label}
                        </button>
                      ))}
                    </div>
                    <div aria-live="polite" className="sr-only">{citationAnnounce}</div>
                    {Object.keys(appendedReference).length > 0 && (
                      <div className="mt-2 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-100">{(() => {
                        const book = appendedReference.book;
                        const chapter = appendedReference.chapter;
                        const versesLabel = appendedReference.verses;
                        if (!book && !chapter && !versesLabel) return '';
                        const pieces: string[] = [];
                        if (typeof book === 'string' && book) pieces.push(String(book));
                        if (typeof chapter === 'string' && chapter) {
                          const chapterPiece = typeof versesLabel === 'string' && versesLabel ? `${chapter}:${versesLabel}` : chapter;
                          pieces.push(String(chapterPiece));
                          return pieces.join(' ');
                        }
                        if (typeof versesLabel === 'string' && versesLabel) pieces.push(String(versesLabel));
                        return pieces.join(' ');
                      })()}</div>
                    )}
                  </div>
                )}

                {(citationComplete || citationSegments.length === 0) && (
                  <>
                    <div className="rounded-xl border-2 border-green-500/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4 text-sm animate-in fade-in slide-in-from-bottom-3 duration-300 flex-shrink-0">
                      <p className="font-semibold text-green-900 dark:text-green-100 text-base mb-1">
                        ¡Secuencia completada!
                      </p>
                      <p className="text-neutral-700 dark:text-neutral-300 mb-3">
                        Precisión: <span className="font-bold">{lastAccuracy ?? 0}%</span>
                        {mistakesTotal > 0 && (
                          <> · <span className="text-orange-700 dark:text-orange-400">{lastMistakes ?? 0} error{(lastMistakes ?? 0) === 1 ? '' : 'es'}</span></>
                        )}
                      </p>
                      <Button onClick={resetAttemptState} className="w-full">
                        Intentar nuevamente
                      </Button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
                      <Separator />

                      {attempts.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Historial</h4>
                          <History
                            attempts={attempts}
                            onClear={() => {
                              if (!verse) return;
                              setIsClearHistoryOpen(true);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
        <div aria-live="polite" ref={liveRegionRef} className="sr-only" />
      </CardContent>
      <Dialog
        open={isClearHistoryOpen}
        onOpenChange={(open) => {
          if (!open) setIsClearHistoryOpen(false);
        }}
      >
        <DialogContent
          className="max-w-sm !w-[calc(100%-2rem)] rounded-xl"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>¿Borrar historial de este pasaje?</DialogTitle>
            <DialogDescription>
              Esto eliminará únicamente los intentos guardados de este pasaje.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex w-full flex-col gap-3">
              <Button onClick={handleClearHistory} className="w-full">Borrar historial</Button>
              <Button variant="outline" onClick={() => setIsClearHistoryOpen(false)} className="w-full">
                Cancelar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SequenceModeCard;
