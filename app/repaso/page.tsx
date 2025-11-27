"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getMemorizedPassages } from '@/lib/review';
import { loadProgress } from '@/lib/storage';
import { sanitizeVerseText } from '@/lib/sanitize';
import type { MemorizedPassage } from '@/lib/review';
import { ArrowLeft, Zap, Quote, ChevronRight } from 'lucide-react';

interface RowData {
  id: string;
  reference: string;
  snippet: string;
  entry: MemorizedPassage['entry'];
}

function buildSnippet(text: string | undefined) {
  const clean = sanitizeVerseText(text || '', false).replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const words = clean.split(' ');
  return words.length > 15 ? `${words.slice(0, 15).join(' ')}…` : clean;
}

export default function RepasoPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<RowData[]>([]);

  React.useEffect(() => {
    try {
      const progress = loadProgress();
      const memorized = getMemorizedPassages(progress);
      const mapped: RowData[] = memorized.map(({ id, entry }) => ({
        id,
        reference: entry.reference,
        snippet: buildSnippet(entry.text),
        entry,
      }));
      setRows(mapped);
    } catch (error) {
      console.error('Error loading memorized passages', error);
      setRows([]);
    }
  }, []);

  if (rows.length === 0) {
    return (
      <div className="h-screen flex flex-col">
        <header className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-10 w-10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Repaso</p>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Pasajes memorizados</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center">
            <Zap className="h-10 w-10 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Sin pasajes memorizados</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[280px]">
              Completa los 4 modos en práctica para desbloquear el repaso.
            </p>
          </div>
          <Button onClick={() => router.push('/practice')} className="mt-2 rounded-full px-6">
            Ir a práctica
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
      <header className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-10 w-10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Repaso</p>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Pasajes memorizados</h1>
          </div>
        </div>
        <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full">
          {rows.length}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Main actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/repaso/rally')}
            className="w-full bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 text-white rounded-2xl p-5 text-left shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span className="text-lg font-bold">Rally</span>
                </div>
                <p className="text-sm text-white/80">
                  Modos aleatorios con todos tus pasajes
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-white/60" />
            </div>
          </button>

          <button
            onClick={() => router.push('/repaso/citas')}
            className="w-full bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 text-white rounded-2xl p-5 text-left shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Quote className="h-5 w-5" />
                  <span className="text-lg font-bold">Citas</span>
                </div>
                <p className="text-sm text-white/80">
                  Identifica referencias de tus pasajes
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-white/60" />
            </div>
          </button>
        </div>

        {/* Memorized passages list */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 px-1">
            Tus pasajes memorizados
          </h2>
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
              >
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  {row.reference}
                </h3>
                {row.snippet && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                    {row.snippet}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
