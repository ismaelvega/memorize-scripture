"use client";
import * as React from 'react';
import { EyeOff } from 'lucide-react';
import type { Verse, StealthAttemptStats, Attempt, DiffToken } from '../lib/types';
import { appendAttempt, loadProgress, clearVerseHistory } from '../lib/storage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { HiddenInlineInput } from './hidden-inline-input';
import { History } from './history';
import { Separator } from '@/components/ui/separator';
import { useToast } from './ui/toast';

type WordAttemptStat = {
  index: number;
  mistakes: number;
  durationMs: number;
  typedLength: number;
  correct: boolean;
  typedWord: string;
};

function formatDuration(ms: number) {
  if (!ms) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (!minutes) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function formatNumber(value: number, fractionDigits: number) {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

interface StealthModeCardProps {
  verse: Verse | null;
  onBrowseVerses?: () => void;
  verseParts?: string[];
  startVerse?: number;
  onAttemptSaved?: () => void;
  onAttemptStateChange?: (active: boolean) => void;
}

export const StealthModeCard: React.FC<StealthModeCardProps> = ({
  verse,
  onBrowseVerses,
  verseParts,
  startVerse,
  onAttemptSaved,
  onAttemptStateChange,
}) => {
  const { pushToast } = useToast();
  const [wordsArray, setWordsArray] = React.useState<string[]>([]);
  const [markers, setMarkers] = React.useState<Array<{ index: number; label: string }>>([]);
  const [completedWords, setCompletedWords] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [sessionKey, setSessionKey] = React.useState(0);
  const wordStatsRef = React.useRef<WordAttemptStat[]>([]);
  const attemptStartRef = React.useRef<number | null>(null);
  const [hasStarted, setHasStarted] = React.useState(false);
  const [lastAttemptSummary, setLastAttemptSummary] = React.useState<{
    accuracy: number;
    stats: StealthAttemptStats;
  } | null>(null);
  const [attempts, setAttempts] = React.useState<Attempt[]>([]);
  const [isClearHistoryOpen, setIsClearHistoryOpen] = React.useState(false);

  React.useEffect(() => {
    if (!verse) {
      setAttempts([]);
      onAttemptStateChange?.(false);
      return;
    }
    const progress = loadProgress();
    const entry = progress.verses[verse.id];
    setAttempts(entry?.attempts || []);
  }, [verse, onAttemptStateChange]);

  React.useEffect(() => () => {
    onAttemptStateChange?.(false);
  }, [onAttemptStateChange]);

  React.useEffect(() => {
    if (!verse) {
      setWordsArray([]);
      setMarkers([]);
      setCompletedWords(0);
      setProgress(0);
      setIsCompleted(false);
      setSessionKey(prev => prev + 1);
      wordStatsRef.current = [];
      attemptStartRef.current = null;
      setHasStarted(false);
      setLastAttemptSummary(null);
      onAttemptStateChange?.(false);
      return;
    }

    const words = verse.text
      ? verse.text.trim().split(/\s+/).filter(Boolean)
      : [];
    setWordsArray(words);
    setCompletedWords(0);
    setProgress(0);
    setIsCompleted(false);
    setSessionKey(prev => prev + 1);
    wordStatsRef.current = [];
    attemptStartRef.current = null;
    setHasStarted(false);
    setLastAttemptSummary(null);
    onAttemptStateChange?.(false);

    if (verseParts && verseParts.length > 0 && startVerse != null) {
      let runningIndex = 0;
      const computedMarkers: Array<{ index: number; label: string }> = [];
      verseParts.forEach((part, idx) => {
        const tokenCount = part.trim().split(/\s+/).filter(Boolean).length;
        computedMarkers.push({ index: runningIndex, label: String(startVerse + idx) });
        runningIndex += tokenCount;
      });
      setMarkers(computedMarkers);
    } else {
      setMarkers([]);
    }
  }, [verse, verseParts, startVerse, onAttemptStateChange]);

  const totalWords = wordsArray.length;

  const handleFirstInteraction = React.useCallback(() => {
    if (attemptStartRef.current === null) {
      attemptStartRef.current = Date.now();
    }
    setHasStarted(true);
    onAttemptStateChange?.(true);
  }, [onAttemptStateChange]);

  const finalizeAttempt = React.useCallback(() => {
    const statsList = wordStatsRef.current
      .slice(0, totalWords)
      .filter((stat): stat is WordAttemptStat => Boolean(stat));
    const totalMistakes = statsList.reduce((sum, stat) => sum + stat.mistakes, 0);
    const totalCharacters = statsList.reduce((sum, stat) => sum + stat.typedLength, 0);
    const correctedWords = statsList.filter(stat => !stat.correct).length;
    const flawlessWords = Math.max(0, totalWords - correctedWords);
    let currentStreak = 0;
    let longestFlawlessStreak = 0;
    for (const stat of statsList) {
      if (stat.correct) {
        currentStreak += 1;
        if (currentStreak > longestFlawlessStreak) {
          longestFlawlessStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }
    const durationMs = attemptStartRef.current ? Date.now() - attemptStartRef.current : 0;
    const attemptsPerWord = totalWords > 0 ? (totalMistakes + totalWords) / totalWords : 0;
    const wordsPerMinute = durationMs > 0 ? totalWords / (durationMs / 60000) : 0;
    const accuracy = totalWords > 0 ? Math.max(0, Math.round((1 - totalMistakes / totalWords) * 100)) : 0;

    const summary: StealthAttemptStats = {
      totalWords,
      flawlessWords,
      correctedWords,
      totalMistakes,
      totalCharacters,
      durationMs,
      wordsPerMinute: Number.isFinite(wordsPerMinute) ? Number(wordsPerMinute.toFixed(1)) : 0,
      averageAttemptsPerWord: Number.isFinite(attemptsPerWord) ? Number(attemptsPerWord.toFixed(2)) : 0,
      longestFlawlessStreak,
    };

    const diffTokens: DiffToken[] = wordsArray.map((word, index) => {
      const stat = wordStatsRef.current[index];
      const status = !stat ? 'missing' : stat.mistakes > 0 ? 'missing' : 'match';
      return {
        token: word,
        status,
      };
    });

    setLastAttemptSummary({ accuracy, stats: summary });
    attemptStartRef.current = null;
    onAttemptStateChange?.(false);

    if (!verse) {
      return;
    }

    let feedback: string | undefined;
    if (totalWords === 0) {
      feedback = undefined;
    } else if (totalMistakes === 0) {
      feedback = 'Sin correcciones: memorización impecable.';
    } else if (totalMistakes === 1) {
      feedback = 'Solo una corrección en todo el pasaje. ¡Gran trabajo!';
    } else if (totalWords > 0 && correctedWords / totalWords >= 0.5) {
      feedback = 'Más de la mitad de las palabras requirieron corrección; repasa este pasaje otra vez.';
    } else {
      feedback = 'Buen progreso. Practica para reducir las correcciones restantes.';
    }

    const attempt: Attempt = {
      ts: Date.now(),
      mode: 'stealth',
      inputLength: totalCharacters,
      accuracy,
      missedWords: [],
      extraWords: [],
      feedback,
      diff: diffTokens,
      stealthStats: summary,
    };

    appendAttempt(verse, attempt);
    const progress = loadProgress();
    const updatedAttempts = progress.verses[verse.id]?.attempts || [];
    setAttempts(updatedAttempts);
    onAttemptSaved?.();
    setHasStarted(false);
  }, [totalWords, verse, onAttemptSaved, onAttemptStateChange, wordsArray]);

  const handleReset = React.useCallback(() => {
    setCompletedWords(0);
    setProgress(0);
    setIsCompleted(false);
    setSessionKey(prev => prev + 1);
    wordStatsRef.current = [];
    attemptStartRef.current = null;
    setHasStarted(false);
    setLastAttemptSummary(null);
    onAttemptStateChange?.(false);
  }, [onAttemptStateChange]);

  const handleClearHistory = React.useCallback(() => {
    if (!verse) return;
    setIsClearHistoryOpen(true);
  }, [verse]);

  const confirmClearHistory = React.useCallback(() => {
    if (!verse) return;
    clearVerseHistory(verse.id);
    const progress = loadProgress();
    setAttempts(progress.verses[verse.id]?.attempts || []);
    pushToast({ title: 'Historial eliminado', description: verse.reference });
    setIsClearHistoryOpen(false);
  }, [verse, pushToast]);

  if (!verse) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">📝</div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Selecciona un pasaje para practicar
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              Escoge un versículo para comenzar el modo sigiloso.
            </p>
            {onBrowseVerses && (
              <Button onClick={onBrowseVerses}>
                Elegir pasaje
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <EyeOff size={18} />
              Modo Sigilo
            </CardTitle>
            <CardDescription>{verse.reference}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6 overflow-auto">
        {!isCompleted ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-400">
                Escribe cada palabra desde memoria. El texto permanece oculto hasta que ingreses la palabra correcta. Presiona espacio para comprobar.
              </div>
            </div>
            <HiddenInlineInput
              key={sessionKey}
              words={wordsArray}
              markers={markers}
              onFirstInteraction={handleFirstInteraction}
              onWordCommit={({ index: wordIndex, typed, mistakes, durationMs, correct }) => {
                const completed = wordIndex + 1;
                setCompletedWords(completed);
                if (totalWords > 0) {
                  setProgress((completed / totalWords) * 100);
                }
                wordStatsRef.current[wordIndex] = {
                  index: wordIndex,
                  mistakes,
                  durationMs,
                  typedLength: typed.length,
                  correct,
                  typedWord: typed,
                };
              }}
              onDone={() => {
                setCompletedWords(totalWords);
                setProgress(100);
                setIsCompleted(true);
                finalizeAttempt();
              }}
            />
            {hasStarted && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="shrink-0"
              >
                Reiniciar intento
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-left">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                ¡Excelente! Completaste el pasaje sin verlo.
              </p>
            </div>
            {lastAttemptSummary && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Precisión</p>
                  <p className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">{lastAttemptSummary.accuracy}%</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Correcciones totales: {lastAttemptSummary.stats.totalMistakes}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Palabras</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">Perfectas: {lastAttemptSummary.stats.flawlessWords}</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">Corregidas: {lastAttemptSummary.stats.correctedWords}</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">Racha impecable: {lastAttemptSummary.stats.longestFlawlessStreak}</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Ritmo</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">Duración: {formatDuration(lastAttemptSummary.stats.durationMs)}</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">Palabras/min: {formatNumber(lastAttemptSummary.stats.wordsPerMinute, 1)}</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">Intentos por palabra: {formatNumber(lastAttemptSummary.stats.averageAttemptsPerWord, 2)}</p>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">
                {wordsArray.map((word, idx) => {
                  const stat = wordStatsRef.current[idx];
                  if (!stat || stat.correct) {
                    return (
                      <span key={idx} className="inline-flex items-center mr-1">
                        {word}
                      </span>
                    );
                  }

                  const typedWord = stat.typedWord || word;
                  return (
                    <span key={idx} className="inline-flex items-center gap-1 mr-1">
                      <span className="text-red-600 dark:text-red-400 line-through">{typedWord}</span>
                      <span aria-hidden className="text-neutral-400 dark:text-neutral-500">→</span>
                      <span>{word}</span>
                      <span className="sr-only">{`Incorrecto: ${typedWord}. Correcto: ${word}.`}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleReset} variant="secondary">
                Repetir intento
              </Button>
              {onBrowseVerses && (
                <Button onClick={onBrowseVerses}>
                  Elegir otro pasaje
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
            <span>{completedWords} palabra{completedWords === 1 ? '' : 's'} completada{completedWords === 1 ? '' : 's'}</span>
            <span>{totalWords} palabras totales</span>
          </div>
          <Progress value={progress} />
        </div>
        {attempts.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Historial</h4>
              <History attempts={attempts} onClear={handleClearHistory} />
            </div>
          </>
        )}
      </CardContent>
      <Dialog open={isClearHistoryOpen} onOpenChange={(open) => { if (!open) setIsClearHistoryOpen(false); }}>
        <DialogContent className="max-w-sm" onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>¿Borrar historial de este pasaje?</DialogTitle>
            <DialogDescription>
              Esto eliminará únicamente el registro de intentos de este pasaje. No afectará a otros versículos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClearHistoryOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmClearHistory}>
              Borrar historial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
