"use client";
import { Attempt } from '../lib/types';
import { formatTime} from '../lib/utils';
import { Button } from '@/components/ui/button';
import DiffRenderer from './diff-renderer';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import * as React from 'react';

interface HistoryProps { attempts: Attempt[]; onClear: () => void; }

export const History: React.FC<HistoryProps> = ({ attempts, onClear }) => {
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  const [showAll, setShowAll] = React.useState(false);

  const rev = React.useMemo(() => {
    if (!attempts?.length) return [];
    return [...attempts].sort((a, b) => b.ts - a.ts);
  }, [attempts]);

  const hasAttempts = rev.length > 0;
  const visibleAttempts = showAll ? rev : rev.slice(0, 3);

  React.useEffect(() => {
    if (rev.length <= 3 && showAll) {
      setShowAll(false);
    }
  }, [rev.length, showAll]);

  React.useEffect(() => {
    if (openIdx === null) return;
    if (openIdx >= visibleAttempts.length) {
      setOpenIdx(null);
    }
  }, [openIdx, visibleAttempts.length]);

  if (!hasAttempts) return <p className="text-sm text-neutral-500">Aún no hay intentos.</p>;

  return (
    <div className="space-y-3">
      {visibleAttempts.map((a, i) => {
        const idx = i;
        const open = openIdx === idx;
        return (
          <div key={a.ts} className="border rounded-md border-neutral-200 dark:border-neutral-800">
            <button className="w-full flex items-center justify-between px-3 py-2 text-sm" onClick={()=>setOpenIdx(open?null:idx)} aria-expanded={open}>
              <span className="flex items-center gap-3">
                <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{formatTime(a.ts)}</span>
                <span className="flex items-center gap-2">
                  <Badge variant={a.accuracy>=85?'default': a.accuracy>=60?'secondary':'outline'}>{a.accuracy}%</Badge>
                  <div className="w-24"><Progress value={a.accuracy} /></div>
                </span>
              </span>
              <span className="text-neutral-500 text-xs">{open ? 'Ocultar' : 'Detalles'}</span>
            </button>
            {open && (
              <div className="px-3 pb-3 text-xs space-y-2">
                {a.feedback && <p className="text-neutral-600 dark:text-neutral-400">Retroalimentación: {a.feedback}</p>}
                {a.mode === 'stealth' && a.stealthStats && (
                  <div className="grid gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/40">
                    <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Detalle modo sigiloso</p>
                    <div className="flex flex-wrap gap-3">
                      <span>Perfectas: {a.stealthStats.flawlessWords}</span>
                      <span>Corregidas: {a.stealthStats.correctedWords}</span>
                      <span>Correcciones: {a.stealthStats.totalMistakes}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span>Palabras/min: {a.stealthStats.wordsPerMinute.toLocaleString('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</span>
                      <span>Intentos/palabra: {a.stealthStats.averageAttemptsPerWord.toLocaleString('es-ES', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                      <span>Racha impecable: {a.stealthStats.longestFlawlessStreak}</span>
                    </div>
                  </div>
                )}
                {a.mode === 'sequence' && a.sequenceStats && (
                  <div className="flex flex-wrap gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
                    <span>Fragmentos: {a.sequenceStats.totalChunks}</span>
                    <span>Errores: {a.sequenceStats.mistakes}</span>
                    {a.sequenceStats.mistakeCountsByChunk?.length ? (
                      <span>
                        Fallos en:{' '}
                        {a.sequenceStats.mistakeCountsByChunk
                          .map((entry) => `${entry.index + 1}º (${entry.count})`)
                          .join(', ')}
                      </span>
                    ) : (
                      <span>Sin fallos de orden</span>
                    )}
                  </div>
                )}
                {/* Missed and Extra word lists hidden per new requirement */}
                {a.diff && <div className="p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 max-h-40 overflow-auto leading-relaxed">
                  <DiffRenderer diff={a.diff} />
                </div>}
              </div>
            )}
          </div>
        );
      })}
      {rev.length > 3 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? 'Mostrar menos' : `Mostrar más (${rev.length - 3})`}
          </Button>
        </div>
      )}
      <div>
        <Button variant="outline" size="sm" onClick={onClear}>Borrar historial</Button>
      </div>
    </div>
  );
};
