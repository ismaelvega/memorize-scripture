"use client";
import * as React from 'react';
import { BookIndexEntry, useFlowStore } from './flow';
import { Input } from '@/components/ui/input';

export const BookListMobile: React.FC = () => {
  const setBook = useFlowStore((state) => state.setBook);
  const [index, setIndex] = React.useState<BookIndexEntry[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('');
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(()=>{
    fetch('/bible_data/_index.json').then(r=>{ if(!r.ok) throw new Error('No se pudo cargar el índice'); return r.json(); }).then((d:BookIndexEntry[])=> setIndex(d)).catch(e=> setError(e.message));
  }, []);

  React.useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const filtered = (index||[]).filter(b=> [b.title,b.shortTitle,b.abbr,b.key].some(t=> t.toLowerCase().includes(filter.toLowerCase())));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 rounded-3xl border border-white/50 bg-white/95 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/80 dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-shrink-0">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50">Libros</h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Explorar</span>
        </div>
        <div className="mt-4 flex-shrink-0">
          <Input
            value={filter}
            onChange={e=> setFilter(e.target.value)}
            placeholder="Filtrar libros"
            className="h-11 rounded-2xl border-0 bg-neutral-100/80 text-sm shadow-inner focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 dark:bg-neutral-900/60 dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]"
          />
        </div>
        <div ref={scrollContainerRef} className="mt-5 flex-1 overflow-auto space-y-2.5 p-1">
          {!index && !error && <div className="text-xs text-neutral-500">Cargando…</div>}
          {error && <div className="text-xs text-red-500">{error}</div>}
          {filtered.map(b=> (
            <button
              key={b.key}
              onClick={()=> setBook(b)}
              className="group relative flex w-full min-h-[52px] items-center justify-between rounded-2xl bg-white px-4 py-3.5 text-left text-sm font-semibold text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.08)] active:scale-[0.98] active:shadow-[0_1px_4px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-neutral-900/90 dark:text-neutral-50 dark:shadow-[0_2px_12px_rgba(0,0,0,0.4),0_1px_3px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] dark:focus-visible:ring-offset-neutral-950"
            >
              <span className="text-[15px]">{b.shortTitle}</span>
              <span className="rounded-full bg-neutral-900/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 transition-all duration-150 group-hover:bg-neutral-900/12 group-active:scale-95 dark:bg-neutral-100/15 dark:text-neutral-300 dark:group-hover:bg-neutral-100/25">{b.chapters}c</span>
            </button>
          ))}
          {index && !filtered.length && <div className="text-xs text-neutral-500">Sin resultados</div>}
        </div>
      </div>
    </div>
  );
};
