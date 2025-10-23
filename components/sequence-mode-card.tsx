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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { History } from './history';
import { useToast } from './ui/toast';
import { RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
  const { pushToast } = useToast();
  const [orderedChunks, setOrderedChunks] = React.useState<SequenceChunk[]>([]);
  const [availableChunks, setAvailableChunks] = React.useState<SequenceChunk[]>([]);
  const [selectionTrail, setSelectionTrail] = React.useState<SequenceChunk[]>([]);
  const [mistakesByChunk, setMistakesByChunk] = React.useState<Record<string, number>>({});
  const [attempts, setAttempts] = React.useState<Attempt[]>([]);
  const [status, setStatus] = React.useState<'idle' | 'complete'>('idle');
  const [highlightedChunkId, setHighlightedChunkId] = React.useState<string | null>(null);
  const [lastAccuracy, setLastAccuracy] = React.useState<number | null>(null);
  const [lastMistakes, setLastMistakes] = React.useState<number | null>(null);
  const [isClearHistoryOpen, setIsClearHistoryOpen] = React.useState(false);
  const liveRegionRef = React.useRef<HTMLDivElement | null>(null);
  const attemptActiveRef = React.useRef(false);
  const highlightTimer = React.useRef<number | null>(null);

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

  const resetAttemptState = React.useCallback(() => {
      setSelectionTrail([]);
      setMistakesByChunk({});
      setStatus('idle');
      setLastAccuracy(null);
      setLastMistakes(null);
      setHighlightedChunkId(null);
      attemptActiveRef.current = false;
      onAttemptStateChange?.(false);
      setAvailableChunks(orderedChunks.length ? shuffleArray(orderedChunks) : []);
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = 'Secuencia reiniciada.';
      }
    },
    [orderedChunks, onAttemptStateChange]
  );

  React.useEffect(() => {
    return () => {
      if (highlightTimer.current) {
        window.clearTimeout(highlightTimer.current);
      }
    };
  }, []);

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
    setAvailableChunks(shuffleArray(withIds));
    setSelectionTrail([]);
    setMistakesByChunk({});
    setStatus('idle');
    setLastAccuracy(null);
    setLastMistakes(null);
    attemptActiveRef.current = false;
    onAttemptStateChange?.(false);

    const progress = loadProgress();
    setAttempts(progress.verses[verse.id]?.attempts || []);
  }, [verse, onAttemptStateChange]);

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
      onAttemptSaved();
      const progress = loadProgress();
      setAttempts(progress.verses[verse.id]?.attempts || []);
      setStatus('complete');
      setLastAccuracy(accuracy);
      setLastMistakes(mistakesCount);
      attemptActiveRef.current = false;
      onAttemptStateChange?.(false);
      pushToast({
        title: 'Secuencia completada',
        description: `Precisión ${accuracy}%`,
      });
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Secuencia completada con precisión de ${accuracy} por ciento.`;
      }
    },
    [verse, orderedChunks, mistakesByChunk, onAttemptSaved, onAttemptStateChange, pushToast]
  );

  const handleChunkClick = React.useCallback(
    (chunk: SequenceChunk) => {
      if (!verse || status === 'complete') return;
      if (!orderedChunks.length) return;

      const expectedIndex = selectionTrail.length;
      const expectedChunk = orderedChunks[expectedIndex];
      if (!expectedChunk) return;

      ensureAttemptActive();

      if (chunk.id === expectedChunk.id) {
        const nextTrail = [...selectionTrail, chunk];
        setSelectionTrail(nextTrail);
        setAvailableChunks((prev) => {
          const remaining = prev.filter((item) => item.id !== chunk.id);
          if (remaining.length <= 1) return remaining;
          return shuffleArray(remaining);
        });
        setHighlightedChunkId(null);
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
      pushToast({
        title: 'Ese fragmento no va aquí',
        description: 'Intenta con otro orden para continuar.',
      });
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = 'Fragmento incorrecto. Intenta con otro.';
      }
      if (highlightTimer.current) {
        window.clearTimeout(highlightTimer.current);
      }
      highlightTimer.current = window.setTimeout(() => {
        setHighlightedChunkId(null);
      }, 480);
    },
    [
      verse,
      status,
      orderedChunks,
      selectionTrail,
      ensureAttemptActive,
      finalizeAttempt,
      pushToast,
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
    pushToast({ title: 'Historial eliminado', description: verse.reference });
    setIsClearHistoryOpen(false);
  }, [pushToast, verse]);

  const remainingChunks = totalChunks - selectionTrail.length;
  const progressValue = totalChunks ? Math.round((selectionTrail.length / totalChunks) * 100) : 0;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Modo Secuencia</CardTitle>
            <CardDescription>
              {verse ? verse.reference : 'Selecciona un versículo para comenzar'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!totalChunks}
              className="flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Reiniciar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-auto">
        {!totalChunks && (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Este pasaje no tiene texto disponible para practicar en secuencia.
          </div>
        )}
        {totalChunks > 0 && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>
                  Fragmentos correctos: {selectionTrail.length} / {totalChunks}
                </span>
                <span>Errores: {mistakesTotal}</span>
              </div>
              <Progress value={progressValue} />
            </div>

            <div className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-3">
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                Toca los fragmentos en el orden correcto para reconstruir el versículo.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectionTrail.length === 0 ? (
                  <span className="text-xs text-neutral-500">
                    Aún no seleccionas fragmentos.
                  </span>
                ) : (
                  selectionTrail.map((chunk) => (
                    <span
                      key={chunk.id}
                      className="rounded-full bg-neutral-900 text-neutral-50 dark:bg-neutral-200 dark:text-neutral-900 px-3 py-1 text-sm"
                    >
                      {chunk.text}
                    </span>
                  ))
                )}
              </div>
              {remainingChunks > 0 && (
                <p className="mt-2 text-[11px] uppercase tracking-wide text-neutral-400">
                  Faltan {remainingChunks} fragmento{remainingChunks === 1 ? '' : 's'}
                </p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {availableChunks.map((chunk) => (
                <Button
                  key={chunk.id}
                  type="button"
                  variant="outline"
                  size="lg"
                  className={cn(
                    'justify-start rounded-full border-2 text-left text-sm font-medium leading-snug whitespace-normal px-4 py-3 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                    highlightedChunkId === chunk.id &&
                      'border-red-500 text-red-600 dark:border-red-400 dark:text-red-300'
                  )}
                  onClick={() => handleChunkClick(chunk)}
                  disabled={status === 'complete'}
                >
                  {chunk.text}
                </Button>
              ))}
            </div>

            {status === 'complete' && (
              <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-neutral-800 dark:text-neutral-100">
                <p className="font-medium">
                  ¡Bien hecho! Precisión {lastAccuracy ?? 0}% · Errores {lastMistakes ?? 0}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button onClick={resetAttemptState}>Intentar nuevamente</Button>
                </div>
              </div>
            )}

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
          className="max-w-sm"
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
            <Button variant="outline" onClick={() => setIsClearHistoryOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleClearHistory}>Borrar historial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SequenceModeCard;
