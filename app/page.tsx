"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Footer } from "@/components/footer";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Memoriza Su Palabra</h1>
        <div className="flex items-center gap-2">
        </div>
      </header>
      <main className="flex-1 px-4 py-4 max-w-xl mx-auto w-full grid gap-6">
        {/* Main Action Choice */}
        <div className="grid grid-cols-1 gap-4">
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
            </div>
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
