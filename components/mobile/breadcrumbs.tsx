"use client";
import * as React from 'react';
import { useFlow } from './flow';

export const Breadcrumbs: React.FC = () => {
  const { state } = useFlow();
  return (
    <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 flex-wrap">
      <span className={state.step==='BOOK'? 'text-neutral-900 dark:text-neutral-100':''}>Libro</span>
      <span>/</span>
      <span className={state.step==='CHAPTER'? 'text-neutral-900 dark:text-neutral-100':''}>{state.book? state.book.shortTitle : 'Capítulo'}</span>
      <span>/</span>
      <span className={state.step==='VERSE'? 'text-neutral-900 dark:text-neutral-100':''}>{state.chapter? `Cap ${state.chapter}` : 'Versos'}</span>
      <span>/</span>
      <span className={state.step==='ATTEMPT'? 'text-neutral-900 dark:text-neutral-100':''}>Intento</span>
    </div>
  );
};
