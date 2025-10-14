"use client";
import * as React from 'react';
import { useFlowStore } from './flow';

export const Breadcrumbs: React.FC = () => {
  const step = useFlowStore((state) => state.step);
  const book = useFlowStore((state) => state.book);
  const chapter = useFlowStore((state) => state.chapter);
  const selectionMode = useFlowStore((state) => state.selectionMode);

  if (step === 'ENTRY') {
    return (
      <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 flex-wrap">
        <span className="text-neutral-900 dark:text-neutral-100">Selecciona</span>
        <span>método</span>
      </div>
    );
  }

  // Render crumbs progressively based on current step to avoid stale selections
  if (step === 'BOOK') {
    return (
      <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 flex-wrap">
        <span>Explorar</span>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100">Libro</span>
      </div>
    );
  }

  if (step === 'CHAPTER') {
    return (
      <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 flex-wrap">
        <span>Explorar</span>
        <span>/</span>
        <span>Libro</span>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100">{book?.shortTitle || 'Libro'}</span>
      </div>
    );
  }

  if (step === 'VERSE') {
    return (
      <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 flex-wrap">
        <span>Explorar</span>
        <span>/</span>
        <span>Libro</span>
        <span>/</span>
        <span>{book?.shortTitle || 'Libro'}</span>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100">{chapter ? `Cap ${chapter}` : 'Capítulo'}</span>
      </div>
    );
  }

  if (step === 'SEARCH') {
    return (
      <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 flex-wrap">
        <span>Buscar</span>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100">Versículo</span>
      </div>
    );
  }

  // MODE selection step
  if (selectionMode === 'search') {
    return (
      <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 flex-wrap">
        <span>Buscar</span>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100">Modo</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 flex-wrap">
      <span>Explorar</span>
      <span>/</span>
      <span>Libro</span>
      <span>/</span>
      <span>{book?.shortTitle || 'Libro'}</span>
      <span>/</span>
      <span>{chapter ? `Cap ${chapter}` : 'Capítulo'}</span>
      <span>/</span>
      <span className="text-neutral-900 dark:text-neutral-100">Modo</span>
    </div>
  );
};
