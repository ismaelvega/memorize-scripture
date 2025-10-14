"use client";
import * as React from 'react';
import { useFlow } from './flow';

export const Breadcrumbs: React.FC = () => {
  const { state } = useFlow();
  const step = state.step;

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
        <span className="text-neutral-900 dark:text-neutral-100">{state.book?.shortTitle || 'Libro'}</span>
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
        <span>{state.book?.shortTitle || 'Libro'}</span>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100">{state.chapter ? `Cap ${state.chapter}` : 'Capítulo'}</span>
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
  if (state.selectionMode === 'search') {
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
      <span>{state.book?.shortTitle || 'Libro'}</span>
      <span>/</span>
      <span>{state.chapter ? `Cap ${state.chapter}` : 'Capítulo'}</span>
      <span>/</span>
      <span className="text-neutral-900 dark:text-neutral-100">Modo</span>
    </div>
  );
};
