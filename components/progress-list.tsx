"use client";
import * as React from 'react';
import { ProgressState, Verse } from '../lib/types';
import { loadProgress } from '../lib/storage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ProgressListProps {
  onSelect: (v: Verse) => void;
  refreshSignal: number; // increment to trigger reload
  showEmpty?: boolean; // when true, show an empty state card instead of nothing
  onBrowse?: () => void; // optional CTA when empty
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

export const ProgressList: React.FC<ProgressListProps> = ({ onSelect, refreshSignal, showEmpty = false, onBrowse }) => {
  const [rows, setRows] = React.useState<RowData[]>([]);
  const [expandedVerse, setExpandedVerse] = React.useState<string | null>(null);
  const [verseWithNumbers, setVerseWithNumbers] = React.useState<string>('');

  function parseVerseId(id: string) {
    const parts = id.split('-');
    const translation = parts.pop() || '';
    const end = parseInt(parts.pop() || '0', 10);
    const start = parseInt(parts.pop() || '0', 10);
    const chapter = parseInt(parts.pop() || '0', 10);
    const bookKey = parts.join('-');
    return { bookKey, chapter, start, end, translation };
  }

  React.useEffect(() => {
    if (!expandedVerse) {
      setVerseWithNumbers('');
      return;
    }
    const currentVerseId = expandedVerse;

    const { bookKey, chapter, start, end } = parseVerseId(currentVerseId);

    if (!bookKey) {
      setVerseWithNumbers((loadProgress().verses[currentVerseId]?.text) || '');
      return;
    }

    async function fetchVerses() {
      try {
        const res = await fetch(`/bible_data/${bookKey}.json`);
        if (!res.ok) throw new Error('Failed to fetch bible data');
        const bookData = await res.json();
        const chapterData = bookData[chapter - 1];
        if (!chapterData) {
          setVerseWithNumbers((loadProgress().verses[currentVerseId]?.text) || '');
          return;
        }

        let formattedText = '';
        for (let i = start; i <= end; i++) {
          const verseText = chapterData[i - 1];
          if (verseText) {
            formattedText += `<sup>${i}</sup>&nbsp;${verseText} `;
          }
        }
        setVerseWithNumbers(formattedText.trim());
      } catch (error) {
        console.error('Error fetching verses', error);
        // Fallback to text from progress
        setVerseWithNumbers((loadProgress().verses[currentVerseId]?.text) || '');
      }
    }

    fetchVerses();
  }, [expandedVerse]);

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

  if (!rows.length) {
    if (!showEmpty) return null;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pasajes Practicados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Aún no tienes intentos de práctica.</p>
          {onBrowse ? (
            <Button onClick={onBrowse} className="w-full">Memorizar otro pasaje</Button>
          ) : (
            <Link href="/practice" className="block w-full">
              <Button className="w-full">Memorizar otro pasaje</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Pasajes Practicados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(r=>{
          const color = r.best>=90? 'bg-green-500/30' : r.best>=70? 'bg-blue-500/30' : 'bg-amber-500/30';
          return (
            <div key={r.id} className="w-full group">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={()=> {
                    setExpandedVerse(expandedVerse === r.id ? null : r.id);
                  }}
                  className="flex-1 text-left cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium truncate max-w-[200px] group-hover:underline">{r.reference}</span>
                      {r.source==='custom' && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Personalizado</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                      <span>{r.attempts} intento{r.attempts!==1 && 's'}</span>
                      <span>· Mejor {r.best}%</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="w-24 relative">
                    <Progress value={r.best} className="h-2" />
                    <div className={`absolute inset-0 rounded-full pointer-events-none ${color}`} aria-hidden />
                  </div>
                  <div className="ml-2">
                      {expandedVerse === r.id ? (
                        <ChevronDown className="h-4 w-4 text-neutral-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-neutral-500" />
                      )}
                    </div>
                </div>
              </div>

              {/* Collapsible Quick Start Buttons */}
              {expandedVerse === r.id && (
                <div className="mt-3 px-4 pb-2 border-t border-neutral-200 dark:border-neutral-700 pt-3">
                  <div className="space-y-3">
                    <div className='text-sm'>
                      <p dangerouslySetInnerHTML={{ __html: verseWithNumbers }} />
                    </div>
                    <div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            const versePayload = { id: r.id, reference: r.reference, translation: r.translation, text: verseWithNumbers || (loadProgress().verses[r.id].text) || '', source: loadProgress().verses[r.id].source || 'built-in' };
                            onSelect(versePayload);
                          }}
                          className="font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                        >
                          Practicar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="pt-3">
          {onBrowse ? (
            <Button className="w-full" onClick={onBrowse}>Memorizar otro pasaje</Button>
          ) : (
            <Link href="/practice" className="block w-full">
              <Button className="w-full">Memorizar otro pasaje</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
