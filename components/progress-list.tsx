"use client";
import * as React from 'react';
import { ProgressState, Verse } from '../lib/types';
import { loadProgress, removeVerse } from '../lib/storage';
import { computePassageCompletion } from '../lib/completion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Trophy } from 'lucide-react';
import { Eye, BookOpen, Trash, Check, Sparkles } from 'lucide-react';
import { sanitizeVerseText } from '@/lib/sanitize';
import Link from 'next/link';
import { useToast } from './ui/toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuthUserId } from '@/lib/use-auth-user-id';

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
  snippet: string;
  truncated: boolean;
  source?: 'built-in' | 'custom';
  completionPercent: number;
  completedModes: number;
  totalModes: number;
}

export const ProgressList: React.FC<ProgressListProps> = ({ onSelect, refreshSignal, showEmpty = false, onBrowse }) => {
  const [rows, setRows] = React.useState<RowData[]>([]);
  const [expandedVerse, setExpandedVerse] = React.useState<string | null>(null);
  const [verseWithNumbers, setVerseWithNumbers] = React.useState<string>('');
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [showFade, setShowFade] = React.useState(false);
  const { pushToast } = useToast();
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deleteCandidate, setDeleteCandidate] = React.useState<{ id: string; reference: string } | null>(null);
  const [showMemorized, setShowMemorized] = React.useState(false);
  const userId = useAuthUserId();
  const [remoteRows, setRemoteRows] = React.useState<RowData[]>([]);
  const [loadingRemote, setLoadingRemote] = React.useState(false);

  // Separate rows into in-progress and memorized
  const { inProgressRows, memorizedRows } = React.useMemo(() => {
    const inProgress = rows.filter(r => r.completionPercent < 100);
    const memorized = rows.filter(r => r.completionPercent === 100);
    return { inProgressRows: inProgress, memorizedRows: memorized };
  }, [rows]);

  

  function getRelativeTime(ts: number) {
    const now = Date.now();
    const delta = Math.floor((now - ts) / 1000);
    if (delta < 60) return 'hace segundos';
    if (delta < 3600) {
      const m = Math.floor(delta / 60);
      return `hace ${m} min`;
    }
    if (delta < 86400) {
      const h = Math.floor(delta / 3600);
      return `hace ${h} h`;
    }
    if (delta < 604800) {
      const d = Math.floor(delta / 86400);
      return `hace ${d} día${d === 1 ? '' : 's'}`;
    }
    if (delta < 2592000) {
      const w = Math.floor(delta / 604800);
      return `hace ${w} semana${w === 1 ? '' : 's'}`;
    }
    const months = Math.floor(delta / 2592000);
    return `hace ${months} mes${months === 1 ? '' : 'es'}`;
  }

  function getFullTime(ts: number) {
    try {
      const d = new Date(ts);
      const datePart = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
      const timePart = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${datePart}, ${timePart}`;
    } catch {
      return String(ts);
    }
  }

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
            const clean = sanitizeVerseText(verseText, false);
            formattedText += `<sup>${i}</sup>&nbsp;${clean} `;
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

  const buildSnippet = React.useCallback((entryText: string | undefined) => {
    const raw = entryText ?? '';
    const clean = sanitizeVerseText(raw, false).replace(/\s+/g, ' ').trim();
    if (!clean) {
      return { snippet: '', truncated: false };
    }
    const words = clean.split(' ');
    const truncated = words.length > 10;
    const snippet = truncated ? `${words.slice(0, 10).join(' ')}...` : clean;
    return { snippet, truncated };
  }, []);

  const refreshRows = React.useCallback(() => {
    const p: ProgressState = loadProgress();
    const localData: Record<string, RowData> = {};

    Object.entries(p.verses).forEach(([id, v]) => {
      const attempts = v.attempts || [];
      const best = attempts.length ? Math.max(...attempts.map(a => a.accuracy)) : 0;
      const lastTs = attempts.length ? attempts[attempts.length - 1].ts : 0;
      const { snippet, truncated } = buildSnippet(v.text);
      const completion = computePassageCompletion(v);

      localData[id] = {
        id,
        reference: v.reference,
        translation: v.translation,
        attempts: attempts.length,
        best,
        lastTs,
        snippet,
        truncated,
        source: v.source,
        completionPercent: completion.completionPercent,
        completedModes: completion.completedModes.length,
        totalModes: 4,
      };
    });

    // Merge remote rows, prefer local when present
    const merged: RowData[] = [];
    const seen = new Set<string>();
    const allIds = new Set<string>([
      ...Object.keys(localData),
      ...remoteRows.map(r => r.id),
    ]);

    allIds.forEach((id) => {
      if (localData[id]) {
        merged.push(localData[id]);
      } else {
        merged.push(remoteRows.find(r => r.id === id)!);
      }
      seen.add(id);
    });

    const filtered = merged.filter(r => r.attempts > 0).sort((a, b) => b.lastTs - a.lastTs);
    setRows(filtered);
  }, [buildSnippet, remoteRows]);

  React.useEffect(()=>{
    refreshRows();
  }, [refreshSignal, buildSnippet, refreshRows]);

  // Hydrate remote rows with snippets from bible data when missing
  React.useEffect(() => {
    let cancelled = false;
    async function hydrateSnippets() {
      const updates: Record<string, { snippet: string; truncated: boolean }> = {};
      for (const row of remoteRows) {
        if (row.snippet || row.source === 'custom') continue;
        const { bookKey, chapter, start, end } = parseVerseId(row.id);
        if (!bookKey || !chapter || !start || !end) continue;
        try {
          const res = await fetch(`/bible_data/${bookKey}.json`);
          if (!res.ok) continue;
          const data = await res.json();
          const chapterData = data[chapter - 1];
          if (!Array.isArray(chapterData)) continue;
          let combined = '';
          for (let i = start; i <= end; i++) {
            const verseText = chapterData[i - 1];
            if (verseText) {
              const clean = sanitizeVerseText(verseText, false);
              combined += `${clean} `;
            }
          }
          const { snippet, truncated } = buildSnippet(combined);
          updates[row.id] = { snippet, truncated };
        } catch {
          // ignore errors
        }
      }
      if (cancelled || Object.keys(updates).length === 0) return;
      setRemoteRows(prev =>
        prev.map(r => (updates[r.id] ? { ...r, ...updates[r.id] } : r))
      );
    }
    void hydrateSnippets();
    return () => {
      cancelled = true;
    };
  }, [remoteRows, buildSnippet]);

  React.useEffect(() => {
    let active = true;
    if (!userId || !navigator.onLine) {
      setRemoteRows([]);
      return;
    }
    setLoadingRemote(true);
    const supabase = getSupabaseClient();
    supabase
      .from('verse_progress')
      .select('verse_id, best_accuracy, total_attempts, last_attempt_at, translation, reference, source, perfect_counts')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setRemoteRows([]);
          return;
        }
        const mapped: RowData[] = data.map((row) => {
          const id = row.verse_id;
          const completionCounts = row.perfect_counts || {};
          const modes: Array<keyof typeof completionCounts> = ['type', 'speech', 'stealth', 'sequence'];
          const completedModes = modes.filter((m) => (completionCounts as any)?.[m]?.perfectCount >= 3).length;
          const completionPercent = (completedModes / 4) * 100;
          const translation = row.translation === 'ES' ? 'RVR1960' : (row.translation || 'RVR1960');
          return {
            id,
            reference: row.reference || id,
            translation,
            attempts: row.total_attempts || 0,
            best: Number(row.best_accuracy) || 0,
            lastTs: row.last_attempt_at ? new Date(row.last_attempt_at).getTime() : 0,
            snippet: '',
            truncated: false,
            source: row.source as any,
            completionPercent,
            completedModes,
            totalModes: 4,
          };
        });
        setRemoteRows(mapped);
      })
      .finally(() => {
        if (active) setLoadingRemote(false);
      });

    return () => {
      active = false;
    };
  }, [userId, refreshSignal]);

  // scroll/fade handling for list: hide fade when scrolled to bottom
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => {
      const show = el.scrollHeight > el.clientHeight && (el.scrollTop + el.clientHeight) < (el.scrollHeight - 2);
      setShowFade(show);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [rows]);

  // When an item is expanded, auto-scroll it so the expanded content (and CTAs) are visible
  React.useEffect(() => {
    if (!expandedVerse) return;
    const container = listRef.current;
    if (!container) return;
    const target = container.querySelector(`[data-verse-id="${expandedVerse}"]`) as HTMLElement | null;
    if (!target) return;
    // wait a tick for expanded content to render
    const id = window.setTimeout(() => {
      try {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = targetRect.bottom - containerRect.bottom;
        if (offset > 0) {
          container.scrollBy({ top: offset + 8, behavior: 'smooth' });
        } else {
          // if target is above view, bring it into view
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } catch {
        try { target.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch {}
      }
    }, 120);
    return () => window.clearTimeout(id);
  }, [expandedVerse]);

  if (!rows.length) {
    if (!showEmpty) return null;
    return (
      <Card className="text-center">
        <CardContent className="space-y-4 py-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-300">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Aún no hay intentos</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Abre un pasaje y completa tu primera práctica para empezar a ver tu progreso aquí.</p>
          </div>
          {onBrowse ? (
            <Button onClick={onBrowse} className="w-full">Explorar pasajes</Button>
          ) : (
            <Link href="/practice" className="block w-full">
              <Button className="w-full">Explorar pasajes</Button>
            </Link>
          )}
          <p className="text-xs text-neutral-400 dark:text-neutral-500">Tu progreso se guarda localmente en este dispositivo.</p>
        </CardContent>
      </Card>
    );
  }

  // Helper function to render a single row
  const renderRow = (r: RowData, idx: number, isFirst: boolean) => {
    const color = r.completionPercent>=75? 'bg-green-500/30' : r.completionPercent>=50? 'bg-blue-500/30' : r.completionPercent>=25? 'bg-yellow-500/30' : 'bg-neutral-500/30';
    const isFullyCompleted = r.completionPercent === 100;
    return (
      <div
        key={r.id}
        data-verse-id={r.id}
        className={`group relative -mx-2 px-2 py-3 ${!isFirst ? 'border-t border-neutral-200 dark:border-neutral-800' : ''} transition-colors duration-150 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 rounded-lg`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={()=> {
              setExpandedVerse(expandedVerse === r.id ? null : r.id);
            }}
            className="flex-1 text-left cursor-pointer"
          >
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="relative max-h-[56px] overflow-hidden">
                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 pr-4 font-medium">
                  {r.snippet || 'Sin texto guardado'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 max-w-[220px] truncate group-hover:underline">{r.reference}</span>
                  {r.source==='custom' && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Personalizado</Badge>}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                  <span>{r.attempts} intento{r.attempts!==1 && 's'}</span>
                  {r.lastTs ? (
                    <span>· Último: <time dateTime={new Date(r.lastTs).toISOString()} title={getFullTime(r.lastTs)} className="text-[10px]">{getRelativeTime(r.lastTs)}</time></span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 relative">
                  <Progress value={r.completionPercent} className="h-2" />
                  <div className={`absolute inset-0 rounded-full pointer-events-none ${color}`} aria-hidden />
                </div>
                <span className="text-[10px] text-neutral-500 font-medium flex items-center gap-1">
                  {isFullyCompleted && <Check className="w-3 h-3 text-green-600 dark:text-green-400" />}
                  {Math.round(r.completionPercent)}%
                </span>
                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-medium">
                  ({r.completedModes}/{r.totalModes} modos)
                </span>
              </div>
            </div>
          </button>
          <div
            tabIndex={0}
            role="button"
            onClick={(e) => { e.stopPropagation(); setExpandedVerse(expandedVerse === r.id ? null : r.id); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedVerse(expandedVerse === r.id ? null : r.id); } }}
            className="flex items-center gap-1 shrink-0 cursor-pointer"
            aria-pressed={expandedVerse === r.id}
          >
            <div className="ml-1">
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
          <div className="mt-3 ml-5 pl-3 pb-2 border-t border-neutral-200 dark:border-neutral-700 pt-3">
            <div className="space-y-3">
              <div className='max-h-40 overflow-y-auto hide-scrollbar text-sm pr-2'>
                <p dangerouslySetInnerHTML={{ __html: verseWithNumbers }} />
              </div>
                <div>
                  <div className="space-y-2">
                    <Link href={`/practice/read?id=${encodeURIComponent(r.id)}`} className="block w-full" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-sm flex items-center justify-center gap-2 font-medium"
                      >
                        <Eye className="h-4 w-4 text-neutral-700" />
                        Leer
                      </Button>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteCandidate({ id: r.id, reference: r.reference });
                          setIsDeleteOpen(true);
                        }}
                        aria-label="Remover versículo"
                        className="text-white"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>

                      <div className="flex-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            const versePayload = { id: r.id, reference: r.reference, translation: r.translation, text: verseWithNumbers || (loadProgress().verses[r.id].text) || '', source: loadProgress().verses[r.id].source || 'built-in' };
                            onSelect(versePayload);
                          }}
                          className="w-full font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          {isFullyCompleted ? 'Repasar' : 'Practicar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Pasajes Practicados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex flex-col">
        <div ref={listRef} className="overflow-y-auto space-y-3 hide-scrollbar relative" style={{ maxHeight: '60vh', overflowX: 'hidden' }}>
          {/* In Progress Section */}
          {inProgressRows.length > 0 && (
            <div className="space-y-0">
              {inProgressRows.map((r, idx) => renderRow(r, idx, idx === 0))}
            </div>
          )}

          {/* Empty state for in-progress when all are memorized */}
          {inProgressRows.length === 0 && memorizedRows.length > 0 && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 mb-3">
                <Trophy className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">¡Todos memorizados!</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">No tienes pasajes en progreso</p>
            </div>
          )}

          {/* Memorized Section */}
          {memorizedRows.length > 0 && (
            <div className={`${inProgressRows.length > 0 ? 'border-t border-neutral-200 dark:border-neutral-800 pt-3 mt-3' : ''}`}>
              <button
                onClick={() => setShowMemorized(!showMemorized)}
                className="w-full flex items-center justify-between py-2 px-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Trophy className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Memorizados ({memorizedRows.length})
                  </span>
                </div>
                {showMemorized ? (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-neutral-500" />
                )}
              </button>
              
              {showMemorized && (
                <div className="mt-2 space-y-0">
                  {memorizedRows.map((r, idx) => renderRow(r, idx, idx === 0))}
                </div>
              )}
            </div>
          )}
        </div>
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

      <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open) { setIsDeleteOpen(false); setDeleteCandidate(null); } }}>
        <DialogContent className="max-w-sm !w-[calc(100%-2rem)] rounded-xl">
          <DialogHeader>
            <DialogTitle>Dejar de practicar {deleteCandidate?.reference}</DialogTitle>
            <DialogDescription>
              ¿Quieres dejar de practicar este pasaje? Tu progreso se perderá 👀 pero podrás volver a practicarlo cuando lo desees 😉
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex w-full flex-col gap-3">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (!deleteCandidate) return;
                  try {
                    removeVerse(deleteCandidate.id);
                    refreshRows();
                    if (expandedVerse === deleteCandidate.id) {
                      setExpandedVerse(null);
                      setVerseWithNumbers('');
                    }
                    pushToast({ title: 'Versículo removido del listado', description: deleteCandidate.reference });
                  } catch (err) {
                    console.error('Remove verse failed', err);
                    pushToast({ title: 'Error', description: 'No se pudo eliminar el versículo.' });
                  } finally {
                    setIsDeleteOpen(false);
                    setDeleteCandidate(null);
                  }
                }}
              >
                Dejar de practicar
              </Button>
              <Button variant="outline" className="w-full" onClick={() => { setIsDeleteOpen(false); setDeleteCandidate(null); }}>Cancelar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
