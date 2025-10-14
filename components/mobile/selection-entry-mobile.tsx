"use client";
import * as React from 'react';
import { BookOpen, Search } from 'lucide-react';
import { useFlow, type FlowSelectionMode } from './flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const OPTIONS: Array<{
  mode: FlowSelectionMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}> = [
  {
    mode: 'browse',
    title: 'Explorar por libro',
    description: 'Elige libro, capítulo y rango de versículos paso a paso.',
    icon: <BookOpen className="h-5 w-5" />,
    accent: 'border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/5 active:border-blue-500 active:bg-blue-500/10',
  },
  {
    mode: 'search',
    title: 'Buscar versículo',
    description: 'Encuentra rápidamente por referencia o texto en español.',
    icon: <Search className="h-5 w-5" />,
    accent: 'border-violet-500/50 hover:border-violet-500 hover:bg-violet-500/5 active:border-violet-500 active:bg-violet-500/10',
  },
];

export function SelectionEntryMobile() {
  const { dispatch } = useFlow();

  const handleSelect = React.useCallback((mode: FlowSelectionMode) => {
    dispatch({ type: 'SET_SELECTION_MODE', mode });
  }, [dispatch]);

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-left">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">¿Cómo quieres encontrar el versículo?</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Puedes navegar libro por libro o buscar directamente por referencia o palabras clave.</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {OPTIONS.map(option => (
          <Card
            key={option.mode}
            role="button"
            tabIndex={0}
            className={`cursor-pointer transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 active:scale-[0.98] hover:shadow-sm ${option.accent}`}
            onClick={() => handleSelect(option.mode)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleSelect(option.mode);
              }
            }}
          >
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800">
                {option.icon}
              </div>
              <div>
                <CardTitle className="text-sm">{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  handleSelect(option.mode);
                }}
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
