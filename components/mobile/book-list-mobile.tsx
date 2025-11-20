"use client";
import * as React from 'react';
import { BookIndexEntry, useFlowStore } from './flow';
import { Input } from '@/components/ui/input';
import { normalizeForCompare } from '@/lib/utils';

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

  const filtered = React.useMemo(() => {
    if (!index) return [];
    // Normalize filter: lowercase, remove accents, remove ALL spaces
    const cleanFilter = normalizeForCompare(filter).replace(/\s+/g, '');
    if (!cleanFilter) return index;

    return index.filter(b => 
      [b.title, b.shortTitle, b.abbr, b.key].some(t => {
        if (!t) return false;
        // Normalize target: lowercase, remove accents, remove ALL spaces
        const cleanTarget = normalizeForCompare(t).replace(/\s+/g, '');
        return cleanTarget.includes(cleanFilter);
      })
    );
  }, [index, filter]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-shrink-0">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50">Selecciona un libro</h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Explorar</span>
        </div>
        <div className="mt-4 flex-shrink-0">
          <Input
            value={filter}
            onChange={e=> setFilter(e.target.value)}
            placeholder="Buscar por nombre"
            className="h-11 rounded-2xl border border-neutral-200 bg-neutral-50/50 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 dark:border-neutral-800 dark:bg-neutral-900"
          />
        </div>
        <div ref={scrollContainerRef} className="mt-5 flex-1 overflow-auto space-y-2.5 p-1 pb-24">
          {!index && !error && <div className="text-xs text-neutral-500">Cargando…</div>}
          {error && <div className="text-xs text-red-500">{error}</div>}
          {filtered.map(b=> (
            <button
              key={b.key}
              onClick={()=> setBook(b)}
              className="group relative flex w-full min-h-[52px] items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-left text-sm font-semibold text-neutral-900 shadow-sm transition-all duration-150 hover:bg-neutral-50 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:bg-neutral-900"
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
