"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getMemorizedPassages } from '@/lib/review';
import { loadProgress } from '@/lib/storage';
import { sanitizeVerseText } from '@/lib/sanitize';
import type { MemorizedPassage } from '@/lib/review';
import { ArrowLeft, Zap, Quote } from 'lucide-react';

interface RowData {
  id: string;
  reference: string;
  snippet: string;
  entry: MemorizedPassage['entry'];
}

function parseRangeFromId(id: string) {
  const parts = id.split('-');
  if (parts.length < 5) {
    return { start: 1, end: 1 };
  }
  const end = Number(parts[parts.length - 2]);
  const start = Number(parts[parts.length - 3]);
  return {
    start: Number.isNaN(start) ? 1 : start,
    end: Number.isNaN(end) ? (Number.isNaN(start) ? 1 : start) : end,
  };
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

  const startRally = React.useCallback((id: string) => {
    const { start, end } = parseRangeFromId(id);
    const params = new URLSearchParams();
    params.set('id', id);
    if (start) params.set('start', String(start));
    if (end) params.set('end', String(end));
    router.push(`/repaso/rally?${params.toString()}`);
  }, [router]);

  const startCitas = React.useCallback((id: string) => {
    const params = new URLSearchParams();
    params.set('id', id);
    router.push(`/repaso/citas?${params.toString()}`);
  }, [router]);

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

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4"
          >
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                {row.reference}
              </h3>
              {row.snippet && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {row.snippet}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => startRally(row.id)}
                className="flex-1 h-12 rounded-xl font-medium"
              >
                <Zap className="h-5 w-5 mr-2" />
                Rally
              </Button>
              <Button
                onClick={() => startCitas(row.id)}
                variant="outline"
                className="flex-1 h-12 rounded-xl font-medium"
              >
                <Quote className="h-5 w-5 mr-2" />
                Citas
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
