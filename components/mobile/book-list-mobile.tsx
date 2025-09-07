"use client";
import * as React from 'react';
import { BookIndexEntry, useFlow } from './flow';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const BookListMobile: React.FC = () => {
  const { dispatch } = useFlow();
  const [index, setIndex] = React.useState<BookIndexEntry[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('');

  React.useEffect(()=>{
    fetch('/bible_data/_index.json').then(r=>{ if(!r.ok) throw new Error('Index load failed'); return r.json(); }).then((d:BookIndexEntry[])=> setIndex(d)).catch(e=> setError(e.message));
  }, []);

  const filtered = (index||[]).filter(b=> [b.title,b.shortTitle,b.abbr,b.key].some(t=> t.toLowerCase().includes(filter.toLowerCase())));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Libros</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1 overflow-auto">
        <Input value={filter} onChange={e=> setFilter(e.target.value)} placeholder="Filtrar libros" className="text-sm" />
        <div className="flex-1 overflow-auto -mx-2 px-2 space-y-1">
          {!index && !error && <div className="text-xs text-neutral-500">Cargando…</div>}
          {error && <div className="text-xs text-red-600">{error}</div>}
          {filtered.map(b=> (
            <button key={b.key} onClick={()=> dispatch({ type: 'SET_BOOK', book: b })} className="w-full text-left p-3 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 active:bg-neutral-100 text-xs flex items-center justify-between">
              <span className="font-medium">{b.shortTitle}</span>
              <span className="text-neutral-500">{b.chapters}c</span>
            </button>
          ))}
          {index && !filtered.length && <div className="text-xs text-neutral-500">Sin resultados</div>}
        </div>
      </CardContent>
    </Card>
  );
};
