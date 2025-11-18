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
      <div className="flex-1 rounded-3xl border border-white/50 bg-white/95 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/80 dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-shrink-0">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50">{book.shortTitle} · Capítulos</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={()=> back()}
            className="h-10 w-10 rounded-full border-0 bg-neutral-100/80 text-neutral-700 shadow-sm transition-all duration-150 hover:bg-neutral-200/80 hover:shadow-md active:scale-95 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-800/70"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-5 flex-1 overflow-auto p-1">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2.5">
            {Array.from({ length: book.chapters }, (_,i)=> i+1).map(c => (
              <button
                key={c}
                onClick={()=> setChapter(c)}
                className="h-14 rounded-2xl bg-white text-[15px] font-bold text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.96] active:shadow-[0_1px_4px_rgba(0,0,0,0.1)] dark:bg-neutral-900/90 dark:text-neutral-50 dark:shadow-[0_2px_12px_rgba(0,0,0,0.4),0_1px_3px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] dark:focus-visible:ring-offset-neutral-950"
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
