"use client";
import * as React from 'react';
import { useReadingFlow } from './reading-flow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const ChapterGridReading: React.FC = () => {
  const { state, dispatch } = useReadingFlow();
  const book = state.book!;
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-sm">{book.shortTitle} · Capítulos</CardTitle>
        <Button size="sm" variant="outline" onClick={()=> dispatch({ type: 'BACK' })}>Atrás</Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(52px,1fr))', gap: '6px' }}>
          {Array.from({ length: book.chapters }, (_,i)=> i+1).map(c => (
            <button key={c} onClick={()=> dispatch({ type: 'SET_CHAPTER', chapter: c })} className="h-12 rounded-md border text-xs font-medium border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 active:bg-neutral-100">
              {c}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};