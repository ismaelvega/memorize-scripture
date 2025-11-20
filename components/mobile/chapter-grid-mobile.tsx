"use client";
import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useFlowStore } from './flow';
import { Button } from '@/components/ui/button';

export const ChapterGridMobile: React.FC = () => {
  const book = useFlowStore((state) => state.book);
  const setChapter = useFlowStore((state) => state.setChapter);
  const back = useFlowStore((state) => state.back);

  if (!book) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-shrink-0">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50">{book.shortTitle} · Capítulos</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={()=> back()}
            className="h-10 w-10 rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm transition-all duration-150 hover:bg-neutral-100 hover:shadow-md active:scale-95 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-5 flex-1 overflow-auto p-1 pb-24">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2.5">
            {Array.from({ length: book.chapters }, (_,i)=> i+1).map(c => (
              <button
                key={c}
                onClick={()=> setChapter(c)}
                className="h-14 rounded-2xl border border-neutral-200 bg-white text-[15px] font-bold text-neutral-900 shadow-sm transition-all duration-150 hover:bg-neutral-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 active:scale-[0.96] dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:bg-neutral-900"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
