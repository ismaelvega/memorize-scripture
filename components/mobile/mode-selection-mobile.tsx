"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppMode } from '../../lib/types';
import { useFlowStore } from './flow';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Keyboard, Volume2, EyeOff, ArrowLeft } from 'lucide-react';

const MODE_CARDS: Array<{
  mode: AppMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}> = [
  {
    mode: 'type',
    title: 'Modo Escritura',
    description: 'Escribe palabra por palabra y recibe una calificación inmediata.',
    icon: <Keyboard className="h-5 w-5" />,
    accent: 'border-blue-500/60 hover:border-blue-500 hover:bg-blue-500/5 active:border-blue-500 active:bg-blue-500/10',
  },
  {
    mode: 'speech',
    title: 'Modo Voz',
    description: 'Graba tu intento, edita la transcripción y obtén una calificación.',
    icon: <Volume2 className="h-5 w-5" />,
    accent: 'border-green-500/60 hover:border-green-500 hover:bg-green-500/5 active:border-green-500 active:bg-green-500/10',
  },
  {
    mode: 'stealth',
    title: 'Modo Sigilo',
    description: 'Oculta el texto y comprueba tu memoria corrigiendo cada palabra.',
    icon: <EyeOff className="h-5 w-5" />,
    accent: 'border-neutral-700/60 hover:border-neutral-900 hover:bg-neutral-900/5 dark:hover:bg-neutral-900/30 active:border-neutral-900 active:bg-neutral-900/10 dark:active:bg-neutral-900/40',
  },
];

export function ModeSelectionMobile() {
  const router = useRouter();
  const passage = useFlowStore((state) => state.passage);
  const start = useFlowStore((state) => state.verseStart ?? 1);
  const end = useFlowStore((state) => state.verseEnd ?? (state.verseStart ?? 1));
  const isSearch = useFlowStore((state) => state.selectionMode === 'search');
  const goBack = useFlowStore((state) => state.back);

  const handleModeClick = React.useCallback((mode: AppMode) => {
    if (!passage) return;
    const params = new URLSearchParams();
    params.set('id', passage.id);
    params.set('start', String(start));
    params.set('end', String(end));
    router.push(`/practice/${mode}?${params.toString()}`);
  }, [end, passage, router, start]);

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
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">¿Cómo quieres practicar?</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{passage.reference}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => goBack()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {isSearch ? 'Cambiar búsqueda' : 'Cambiar versículos'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {MODE_CARDS.map(card => (
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
              <div>
                <CardTitle className="text-sm">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </div>
            </CardHeader>
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
          </Card>
        ))}
      </div>
    </div>
  );
}
