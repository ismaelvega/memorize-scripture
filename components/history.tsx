"use client";
import { Attempt } from '../lib/types';
import { formatTime, classNames } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import * as React from 'react';

interface HistoryProps { attempts: Attempt[]; onClear: () => void; }

export const History: React.FC<HistoryProps> = ({ attempts, onClear }) => {
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  if (!attempts?.length) return <p className="text-sm text-neutral-500">No attempts yet.</p>;
  const rev = [...attempts].sort((a,b)=>b.ts-a.ts);
  return (
    <div className="space-y-3">
      {rev.map((a,i)=>{
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
              <span className="text-neutral-500 text-xs">{open?'Hide':'Details'}</span>
            </button>
            {open && (
              <div className="px-3 pb-3 text-xs space-y-2">
                {a.feedback && <p className="text-neutral-600 dark:text-neutral-400">Feedback: {a.feedback}</p>}
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
                {/* Missed and Extra word lists hidden per new requirement */}
                {a.diff && <div className="p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 max-h-40 overflow-auto leading-relaxed">
                  {a.diff.map((t,j)=> <span key={j} className={classNames('px-0.5', t.status==='match' && 'text-neutral-800 dark:text-neutral-200', t.status==='missing' && 'bg-red-500/10 text-red-600 dark:text-red-400 underline', t.status==='extra' && 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 line-through')}>{t.token + ' '}</span>)}
                </div>}
              </div>
            )}
          </div>
        );
      })}
  <div><Button variant="outline" size="sm" onClick={onClear}>Clear history</Button></div>
    </div>
  );
};
