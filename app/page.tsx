"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Memoriza la Palabra</h1>
        <div className="flex items-center gap-2">
        </div>
      </header>
      <main className="flex-1 px-4 py-4 max-w-xl mx-auto w-full grid gap-6">
        {/* Main Action Choice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => router.push('/practice')}
            className="p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-200 group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 active:scale-[0.97] active:border-blue-500 active:bg-blue-100/60 dark:active:bg-blue-900/60 max-h-72 overflow-y-auto"
            aria-label="Ir a practicar versos"
          >
            <div className="text-center space-y-3">
              <div className="text-4xl">📚</div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Practica versículos
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Pon a prueba tu memoria con los modos Escritura, Voz y Sigilo. Recibe una puntuación, repasa palabra por palabra y sigue tu progreso.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push('/read')}
            className="p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 transition-all duration-200 group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 active:scale-[0.97] active:border-amber-500 active:bg-amber-100/60 dark:active:bg-amber-900/60 max-h-72 overflow-y-auto"
            aria-label="Ir a leer y relajarse"
          >
            <div className="text-center space-y-3">
              <div className="text-4xl">☕</div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                Leer y relajarse
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Lectura relajada con escritura opcional. Sin presión ni puntuación: solo disfruta de los versículos.
              </p>
            </div>
          </button>
        </div>
      </main>
      <footer className="px-4 py-6 text-center text-xs text-neutral-500">Solo datos locales · v1.0</footer>
    </div>
  );
}
