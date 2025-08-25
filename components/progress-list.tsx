"use client";
import * as React from 'react';
import { ProgressState, Verse } from '../lib/types';
import { loadProgress } from '../lib/storage';
import { Card, CardHeader, CardTitle, CardContent, Badge, Progress, Button, Separator } from './ui/primitives';

interface ProgressListProps {
  onSelect: (v: Verse) => void;
  refreshSignal: number; // increment to trigger reload
}

interface RowData {
  id: string;
  reference: string;
  translation: string;
  attempts: number;
  best: number;
  lastTs: number;
  source?: 'built-in' | 'custom';
}

export const ProgressList: React.FC<ProgressListProps> = ({ onSelect, refreshSignal }) => {
  const [rows, setRows] = React.useState<RowData[]>([]);

  React.useEffect(()=>{
    const p: ProgressState = loadProgress();
    const data: RowData[] = Object.entries(p.verses).map(([id, v])=>{
      const attempts = v.attempts || [];
      const best = attempts.length? Math.max(...attempts.map(a=> a.accuracy)) : 0;
      const lastTs = attempts.length? attempts[attempts.length-1].ts : 0;
      return { id, reference: v.reference, translation: v.translation, attempts: attempts.length, best, lastTs, source: v.source };
    }).filter(r=> r.attempts>0).sort((a,b)=> b.lastTs - a.lastTs);
    setRows(data);
  }, [refreshSignal]);

  if (!rows.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Pasajes Practicados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(r=>{
          const color = r.best>=90? 'bg-green-500/30' : r.best>=70? 'bg-blue-500/30' : 'bg-amber-500/30';
          return (
            <button key={r.id} onClick={()=> onSelect({ id: r.id, reference: r.reference, translation: r.translation, text: (loadProgress().verses[r.id].text)||'', source: loadProgress().verses[r.id].source||'built-in' })} className="w-full text-left group cursor-pointer">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium truncate max-w-[200px] group-hover:underline">{r.reference}</span>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{r.translation}</Badge>
                    {r.source==='custom' && <Badge variant="outline" className="text-[10px] py-0 px-1.5">custom</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                    <span>{r.attempts} intento{r.attempts!==1 && 's'}</span>
                    <span>· Mejor {r.best}%</span>
                  </div>
                </div>
                <div className="w-24 relative">
                  <Progress value={r.best} className="h-2" />
                  <div className={`absolute inset-0 rounded-full pointer-events-none ${color}`} aria-hidden />
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};
