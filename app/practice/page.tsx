"use client";
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FlowProvider, useFlow } from '../../components/mobile/flow';
import { MobileFlowController } from '../../components/mobile/flow-controller';
import { loadProgress } from '../../lib/storage';
import type { Verse } from '../../lib/types';

// Always render the mobile flow here, regardless of env flags.
function PracticeHeader() {
  const router = useRouter();
  const { state } = useFlow();
  const [open, setOpen] = React.useState(false);

  function onHomeClick() {
    if (state.step === 'ATTEMPT') setOpen(true);
    else router.push('/');
  }

  function confirmExit() {
    setOpen(false);
    router.push('/');
  }

  return (
    <>
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Practice</h1>
        <div className="flex items-center gap-2">
          <div className="text-xs text-neutral-500">v0.1</div>
          <Button variant="default" size="sm" onClick={onHomeClick}>Inicio</Button>
        </div>
      </header>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salir y perder intento?</DialogTitle>
            <DialogDescription>
              Estás en medio de un intento. Si vuelves al inicio se perderá lo que no hayas guardado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmExit}>Ir al inicio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PracticePage() {
  return (
    <FlowProvider>
      <div className="min-h-screen flex flex-col">
        <React.Suspense fallback={null}>
          <FlowInitializer />
        </React.Suspense>
        <PracticeHeader />
        <div className="flex-1">
          <MobileFlowController />
        </div>
        <footer className="px-4 py-6 text-center text-xs text-neutral-500">Local data only · v0.1</footer>
      </div>
    </FlowProvider>
  );
}

function FlowInitializer() {
  const { dispatch } = useFlow();
  const params = useSearchParams();

  React.useEffect(() => {
    const id = params.get('id');
    if (!id) return;
    const p = loadProgress();
    const entry = p.verses[id];
    if (!entry) return;
    const verse: Verse = {
      id,
      reference: entry.reference,
      translation: entry.translation,
      text: entry.text || '',
      source: entry.source || 'built-in',
    };
    // Jump straight to attempt with the selected passage
    dispatch({ type: 'SET_PASSAGE', verse, start: 1, end: 1 });
  }, [dispatch, params]);

  return null;
}
