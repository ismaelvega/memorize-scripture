"use client";
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppMode } from '../../lib/types';
import { useFlowStore } from './flow';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loadProgress, clearVerseHistory } from '@/lib/storage';
import { getModeCompletionStatus } from '@/lib/completion';
import { passageIdToString } from '@/lib/utils';
import { Keyboard, Volume2, EyeOff, Shapes, ArrowLeft, Sparkles, Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '../ui/toast';

const MODE_CARDS: Array<{
  mode: AppMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  difficulty: {
    label: string;
    badgeClass: string;
  };
}> = [
  {
    mode: 'sequence',
    title: 'Modo Secuencia',
    description: 'Arma el pasaje tocando los fragmentos en el orden correcto.',
    icon: <Shapes className="h-5 w-5" />,
    accent: 'border-purple-500/60 hover:border-purple-500 hover:bg-purple-500/5 active:border-purple-500 active:bg-purple-500/10',
    difficulty: {
      label: 'Fácil',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800',
    },
  },
  {
    mode: 'stealth',
    title: 'Modo Sigilo',
    description: 'Comprueba tu memoria palabra por palabra',
    icon: <EyeOff className="h-5 w-5" />,
    accent: 'border-neutral-700/60 hover:border-neutral-900 hover:bg-neutral-900/5 dark:hover:bg-neutral-900/30 active:border-neutral-900 active:bg-neutral-900/10 dark:active:bg-neutral-900/40',
    difficulty: {
      label: 'Intermedio',
      badgeClass: 'bg-neutral-200 text-neutral-900 border-neutral-300 dark:bg-neutral-800/50 dark:text-neutral-200 dark:border-neutral-700',
    },
  },
  {
    mode: 'type',
    title: 'Modo Escritura',
    description: 'Escribe el texto entero de memoria',
    icon: <Keyboard className="h-5 w-5" />,
    accent: 'border-blue-500/60 hover:border-blue-500 hover:bg-blue-500/5 active:border-blue-500 active:bg-blue-500/10',
    difficulty: {
      label: 'Avanzado',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
    },
  },
  {
    mode: 'speech',
    title: 'Modo Voz',
    description: 'Graba tu intento de recitar el pasaje en voz alta',
    icon: <Volume2 className="h-5 w-5" />,
    accent: 'border-green-500/60 hover:border-green-500 hover:bg-green-500/5 active:border-green-500 active:bg-green-500/10',
    difficulty: {
      label: 'Avanzado',
      badgeClass: 'bg-green-100 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800',
    },
  }
];

export function ModeSelectionMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passage = useFlowStore((state) => state.passage);
  const start = useFlowStore((state) => state.verseStart ?? 1);
  const end = useFlowStore((state) => state.verseEnd ?? (state.verseStart ?? 1));
  const selectionMode = useFlowStore((state) => state.selectionMode);
  const isSearch = selectionMode === 'search';
  const goBack = useFlowStore((state) => state.back);
  const { pushToast } = useToast();
  const [progressVersion, setProgressVersion] = React.useState(0);

  // Check if user comes from read mode or another mode
  const fromRead = searchParams.get('fromRead') === 'true';
  const fromAnotherMode = searchParams.get('fromMode') === 'true';

  const attemptsCount = React.useMemo(() => {
    if (!passage) return 0;
    const progress = loadProgress();
    const entry = progress.verses[passage.id];
    return entry?.attempts?.length ?? 0;
  }, [passage, progressVersion]);

  // Get passage string representation
  const passageString = React.useMemo(() => {
    if (!passage) return '';

    console.log('passage.id, start, end:', passage.id, start, end);
    console.log('passageIdToString(passage.id, start, end):', passageIdToString(passage.id, start, end));
    return passageIdToString(passage.id, start, end);
  }, [passage, start, end]);

  // Get completion status for each mode
  const modeCompletions = React.useMemo(() => {
    if (!passage) {
      return {
        type: { perfectCount: 0, isCompleted: false },
        speech: { perfectCount: 0, isCompleted: false },
        stealth: { perfectCount: 0, isCompleted: false },
        sequence: { perfectCount: 0, isCompleted: false },
      };
    }
    const progress = loadProgress();
    const entry = progress.verses[passage.id];
    if (!entry) {
      return {
        type: { perfectCount: 0, isCompleted: false },
        speech: { perfectCount: 0, isCompleted: false },
        stealth: { perfectCount: 0, isCompleted: false },
        sequence: { perfectCount: 0, isCompleted: false },
      };
    }
    
    const completions: Record<AppMode, { perfectCount: number; isCompleted: boolean }> = {
      type: { perfectCount: 0, isCompleted: false },
      speech: { perfectCount: 0, isCompleted: false },
      stealth: { perfectCount: 0, isCompleted: false },
      sequence: { perfectCount: 0, isCompleted: false },
    };
    
    (['type', 'speech', 'stealth', 'sequence'] as AppMode[]).forEach(mode => {
      const status = getModeCompletionStatus(mode, entry.modeCompletions?.[mode]);
      completions[mode] = {
        perfectCount: status.perfectCount,
        isCompleted: status.isCompleted,
      };
    });
    
    return completions;
  }, [passage, progressVersion]);

  const hasAnyModeProgress = React.useMemo(() => (
    Object.values(modeCompletions).some((entry) => entry.perfectCount > 0 || entry.isCompleted)
  ), [modeCompletions]);

  const canResetProgress = attemptsCount > 0 || hasAnyModeProgress;

  const [isDialogOpen, setIsDialogOpen] = React.useState(true);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);

  const handleModeClick = React.useCallback((mode: AppMode) => {
    if (!passage) return;
    const params = new URLSearchParams();
    params.set('id', passage.id);
    params.set('start', String(start));
    params.set('end', String(end));
    router.push(`/practice/${mode}?${params.toString()}`);
  }, [end, passage, router, start]);

  const handleReadClick = React.useCallback(() => {
    if (!passage) return;
    const params = new URLSearchParams();
    params.set('id', passage.id);
    params.set('start', String(start));
    params.set('end', String(end));
    router.push(`/practice/read?${params.toString()}`);
  }, [end, passage, router, start]);

  const handlePracticeLanding = React.useCallback(() => {
    if (!passage) return;
    const params = new URLSearchParams();
    params.set('id', passage.id);
    params.set('start', String(start));
    params.set('end', String(end));
    // Close dialog first so the UI responds, then navigate.
    setIsDialogOpen(false);
    // Small timeout to allow dialog close animation before navigation.
    setTimeout(() => {
      router.push(`/practice?${params.toString()}`);
    }, 80);
  }, [end, passage, router, start]);

  const refreshProgress = React.useCallback(() => {
    setProgressVersion((prev) => prev + 1);
  }, []);

  const handleResetProgress = React.useCallback(() => {
    if (!passage) return;
    clearVerseHistory(passage.id);
    refreshProgress();
    setIsResetDialogOpen(false);
    pushToast({ title: 'Progreso eliminado', description: 'Se reiniciaron los intentos y contadores de este pasaje.' });
  }, [passage, refreshProgress, pushToast]);

  const referenceLabel = React.useMemo(() => {
    if (!passage) return '';
    const rangeSuffix = end !== start ? `${start}-${end}` : `${start}`;
    const colonIndex = passage.reference.indexOf(':');
    if (colonIndex === -1) {
      return passage.reference;
    }
    const base = passage.reference.slice(0, colonIndex);
    return `${base}:${rangeSuffix}`;
  }, [end, passage, start]);

  if (!passage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
        <p>No hay un pasaje seleccionado. Vuelve a {isSearch ? 'buscar un versículo' : 'elegir un libro y versículos'}.</p>
        <Button onClick={() => goBack()}>{isSearch ? 'Buscar versículo' : 'Elegir versículos'}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-left">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">¿Cómo quieres practicar?</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{referenceLabel}</p>
        </div>
        {selectionMode && !fromRead && !fromAnotherMode ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => goBack()}>
              <ArrowLeft className="mr-1 h-4 w-4" /> {isSearch ? 'Cambiar búsqueda' : 'Cambiar versículos'}
            </Button>
          </div>
        ) : null}
      </div>

      {attemptsCount === 0 && !fromRead && (
        <Dialog open={isDialogOpen} onOpenChange={(o) => setIsDialogOpen(o)}>
          <DialogContent className="max-w-md !w-[calc(100%-2rem)] rounded-xl">
            <DialogHeader>
              <DialogTitle>¿Primera vez? 👀</DialogTitle>
              <DialogDescription>
                <div className="flex items-start gap-2 mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                  <div>
                    Parece que es tu primera vez intentando practicar {passageString}. Te recomendamos leerlo primero para familiarizarte antes de practicar.
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <div className="flex w-full flex-col gap-3">
                <Button className="w-full" onClick={() => {
                  // Leer is the primary CTA
                  handleReadClick();
                }}>
                  Leer
                </Button>
                <Button variant="outline" className="w-full" onClick={() => {
                  // Practicar should navigate to the practice landing (mode selector)
                  handlePracticeLanding();
                }}>
                  Practicar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="grid grid-cols-1 gap-3">
        {MODE_CARDS.map(card => {
          const completion = modeCompletions[card.mode];
          const isCompleted = completion?.isCompleted ?? false;
          const perfectCount = completion?.perfectCount ?? 0;
          
          return (
            <Card
              key={card.mode}
              role="button"
              tabIndex={0}
              className={`cursor-pointer transition-transform transition-colors duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 active:scale-[0.98] hover:shadow-sm active:shadow-none ${card.accent}`}
              onClick={() => handleModeClick(card.mode)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleModeClick(card.mode);
                }
              }}
            >
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800">
                  {card.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm">{card.title}</CardTitle>
                    <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wide ${card.difficulty.badgeClass}`}>
                      {card.difficulty.label}
                    </Badge>
                    {isCompleted && (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 text-[10px]">
                        <Trophy className="w-3 h-3" />
                        Completado
                      </Badge>
                    )}
                    {!isCompleted && perfectCount > 0 && (
                      <Badge variant="outline" className="text-[10px] text-neutral-600 dark:text-neutral-300">
                        {perfectCount}/3
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </div>
              </CardHeader>
              {!isCompleted && (
                <CardContent>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleModeClick(card.mode);
                    }}
                  >
                    Comenzar
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {canResetProgress && (
        <div className="flex justify-center pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300"
            onClick={() => setIsResetDialogOpen(true)}
          >
            Eliminar progreso
          </Button>
        </div>
      )}

      <Dialog open={isResetDialogOpen} onOpenChange={(open) => setIsResetDialogOpen(open)}>
        <DialogContent className="max-w-md !w-[calc(100%-2rem)] rounded-xl">
          <DialogHeader>
            <DialogTitle>Eliminar progreso guardado</DialogTitle>
            <DialogDescription>
              Esta acción borrará los intentos guardados y reiniciará los contadores de completitud de todos los modos para este pasaje.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex w-full flex-col gap-3">
              <Button variant="destructive" className="w-full" onClick={handleResetProgress}>
                Sí, eliminar progreso
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setIsResetDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
