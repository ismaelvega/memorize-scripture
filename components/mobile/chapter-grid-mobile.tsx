"use client";
import * as React from 'react';
import { useFlowStore } from './flow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const ChapterGridMobile: React.FC = () => {
  const book = useFlowStore((state) => state.book);
  const setChapter = useFlowStore((state) => state.setChapter);
  const back = useFlowStore((state) => state.back);

  if (!book) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-sm">{book.shortTitle} · Capítulos</CardTitle>
        <Button size="sm" variant="outline" onClick={()=> back()}>Atrás</Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(52px,1fr))', gap: '6px' }}>
          {Array.from({ length: book.chapters }, (_,i)=> i+1).map(c => (
            <button
              key={c}
              onClick={()=> setChapter(c)}
              className="h-12 rounded-md border text-xs font-medium border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 active:bg-neutral-100 dark:active:bg-neutral-800/70 transition-colors transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 active:scale-[0.97]"
            >
              {c}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
