"use client";
import * as React from 'react';
import { EyeOff } from 'lucide-react';
import type { Verse } from '../lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HiddenInlineInput } from './hidden-inline-input';

interface StealthModeCardProps {
  verse: Verse | null;
  onBrowseVerses?: () => void;
  verseParts?: string[];
  startVerse?: number;
}

export const StealthModeCard: React.FC<StealthModeCardProps> = ({
  verse,
  onBrowseVerses,
  verseParts,
  startVerse,
}) => {
  const [wordsArray, setWordsArray] = React.useState<string[]>([]);
  const [markers, setMarkers] = React.useState<Array<{ index: number; label: string }>>([]);
  const [completedWords, setCompletedWords] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [sessionKey, setSessionKey] = React.useState(0);

  React.useEffect(() => {
    if (!verse) {
      setWordsArray([]);
      setMarkers([]);
      setCompletedWords(0);
      setProgress(0);
      setIsCompleted(false);
      setSessionKey(prev => prev + 1);
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
  }, [verse, verseParts, startVerse]);

  const totalWords = wordsArray.length;

  const handleReset = React.useCallback(() => {
    setCompletedWords(0);
    setProgress(0);
    setIsCompleted(false);
    setSessionKey(prev => prev + 1);
  }, []);

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
              <Button onClick={onBrowseVerses} className="bg-blue-600 hover:bg-blue-700 text-white">
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
              Stealth Mode
            </CardTitle>
            <CardDescription>{verse.reference}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6 overflow-auto">
        {!isCompleted ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-400">
              Escribe cada palabra desde memoria. El texto permanece oculto hasta que ingreses la palabra correcta. Presiona espacio para enviar; si fallas, verás la palabra en rojo y deberás corregirla.
            </div>
            <HiddenInlineInput
              key={sessionKey}
              words={wordsArray}
              markers={markers}
              onWordCommit={({ index: wordIndex }) => {
                const completed = wordIndex + 1;
                setCompletedWords(completed);
                if (totalWords > 0) {
                  setProgress((completed / totalWords) * 100);
                }
              }}
              onDone={() => {
                setCompletedWords(totalWords);
                setProgress(100);
                setIsCompleted(true);
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-left">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                ¡Excelente! Completaste el pasaje sin verlo.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-100">
              <p className="text-sm leading-relaxed">{verse.text}</p>
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
      </CardContent>
    </Card>
  );
};
