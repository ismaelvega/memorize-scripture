"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, RotateCcw,  } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadModeCardProps {
  reference: string;
  translation?: string;
  chunks: string[];
  onPractice?: () => void;
}

export function ReadModeCard({ chunks, onPractice }: ReadModeCardProps) {
  const [index, setIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const total = chunks.length;
  const progress = index < 0 ? 0 : Math.min(index + 1, total);
  const isComplete = total > 0 && progress >= total;

  React.useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Respect user's reduced motion preference
  const [reduceMotion, setReduceMotion] = React.useState(false);
  React.useEffect(() => {
    try {
      const m = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduceMotion(m.matches);
      const handler = () => setReduceMotion(m.matches);
      m.addEventListener?.('change', handler);
      return () => m.removeEventListener?.('change', handler);
    } catch {
      return undefined;
    }
  }, []);

  const announcement = React.useMemo(() => {
    if (!total) return "No hay texto disponible para este pasaje.";
    if (index < 0) return "Toca o presiona espacio para revelar el primer fragmento.";
    if (progress >= total) return "Pasaje leído completo.";
    return `Fragmento ${progress + 1} de ${total}`;
  }, [index, progress, total]);

  const revealedChunks = React.useMemo(() => {
    if (index < 0) return [];
    return chunks.slice(0, Math.min(index + 1, total));
  }, [chunks, index, total]);

  const handleAdvance = React.useCallback(() => {
    if (!total) return;
    setIndex((prev) => {
      if (prev >= total - 1) return prev;
      return prev + 1;
    });
  }, [total]);

  const handleRestart = React.useCallback(() => {
    setIndex(-1);
    requestAnimationFrame(() => {
      containerRef.current?.focus();
    });
  }, []);

  // Scroll previous-chunks container to bottom when index changes
  React.useEffect(() => {
    if (!scrollRef.current) return;
    // Only scroll when there are revealed chunks
    if (index < 0) return;
    try {
      const node = scrollRef.current;
      const behavior = reduceMotion ? 'auto' : 'smooth';
      node.scrollTo({ top: node.scrollHeight, behavior: behavior as ScrollBehavior });
    } catch {
      // ignore
    }
  }, [index, reduceMotion]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === " " || event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        handleAdvance();
      }
      if (event.key === "Backspace" || event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((prev) => Math.max(prev - 1, -1));
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        handleRestart();
      }
    },
    [handleAdvance, handleRestart]
  );

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
            Modo lectura
          </p>
        </div>
        {total > 0 && (
          <div className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            {progress} / {total}
          </div>
        )}
      </div>

      {/* Passage area: interactive while reading; when complete show confirmation panel */}
      {!isComplete ? (
        <div
          ref={containerRef}
          role="button"
          tabIndex={0}
          className={cn(
            "mt-6 flex min-h-[260px] flex-1 cursor-pointer flex-col items-stretch gap-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900/60 dark:focus-visible:ring-offset-neutral-950",
            !total && "cursor-default",
            'overflow-hidden',
          )}
          onClick={() => {
            handleAdvance();
          }}
          onKeyDown={handleKeyDown}
          aria-label="Área interactiva para revelar el pasaje verso por verso"
        >
          <span className="sr-only" aria-live="polite">{announcement}</span>

          {!total && (
            <div className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
              No encontramos texto para este pasaje.
            </div>
          )}

          {total > 0 && revealedChunks.length === 0 && (
            <div className="max-w-sm text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
              Toca, haz clic o presiona la barra espaciadora para revelar el pasaje en fragmentos.
            </div>
          )}

          {revealedChunks.length > 0 && (
            <div className="w-full max-w-2xl flex flex-col h-full">
              {/* Previous chunks: scrollable area */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto pr-2"
                style={{ maxHeight: 'calc(100vh - 360px)' }}
                aria-hidden={false}
              >
                <div className="flex flex-col gap-2">
                  {revealedChunks.slice(0, Math.max(0, revealedChunks.length - 1)).map((chunk, i) => {
                    const isActive = i === index;
                    const containerClass = isActive ? 'text-xl font-bold italic' : 'text-lg';
                    const match = chunk.match(/^\s*(\d+)\s+([\s\S]*)$/);
                    if (match) {
                      const [, num, rest] = match;
                      return (
                        <div key={`prev-${i}`}>
                          <span className={`read-mode-transition inline-block ${isActive ? 'read-mode-current' : 'read-mode-prev'} text-xs font-bold text-neutral-600 dark:text-neutral-300`}>{num}</span>
                          <span className={`read-mode-transition inline-block ${isActive ? 'read-mode-current' : 'read-mode-prev'} px-1 ${containerClass}`}>{rest}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={`prev-${i}`} className={`read-mode-transition inline-block ${isActive ? 'read-mode-current' : 'read-mode-prev'} ${containerClass}`}>
                        {chunk}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current chunk: fixed at bottom of the container */}
              {index >= 0 && (
                <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 bg-transparent">
                  <div className="w-full">
                    {(() => {
                      const current = revealedChunks[index];
                      if (!current) return null;
                      const match = current.match(/^\s*(\d+)\s+([\s\S]*)$/);
                      if (match) {
                        const [, num, rest] = match;
                        return (
                          <p className="text-xl font-bold italic text-neutral-800 dark:text-neutral-100">
                            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 inline-block">{num}</span>
                            <span className="px-1">{rest}</span>
                          </p>
                        );
                      }
                      return (
                        <p className="text-xl font-bold italic text-neutral-800 dark:text-neutral-100">{current}</p>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 flex min-h-[260px] flex-1 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center dark:border-neutral-700 dark:bg-neutral-900/60">
          <div className="max-w-md">
            <h3 className="text-lg font-semibold">¿Listo?</h3>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Cuando estés listo, puedes practicar este pasaje ahora.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleRestart} className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Volver a leer
              </Button>

              <Button size="sm" onClick={() => { if (onPractice) onPractice(); }} disabled={!onPractice} className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Practicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
