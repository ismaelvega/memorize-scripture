"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadModeCardProps {
  reference: string;
  translation?: string;
  chunks: string[];
  onPractice?: () => void;
}

export function ReadModeCard({ reference, translation, chunks, onPractice }: ReadModeCardProps) {
  const [index, setIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const total = chunks.length;
  const progress = index < 0 ? 0 : Math.min(index + 1, total);
  const isComplete = total > 0 && progress >= total;

  React.useEffect(() => {
    containerRef.current?.focus();
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

      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        className={cn(
          "mt-6 flex min-h-[260px] flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900/60 dark:focus-visible:ring-offset-neutral-950",
          isComplete && "border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-500/20",
          !total && "cursor-default"
        )}
        onClick={() => {
          if (isComplete) return;
          handleAdvance();
        }}
        onKeyDown={handleKeyDown}
        aria-label="Área interactiva para revelar el pasaje verso por verso"
      >
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
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
          <div className="w-full max-w-2xl text-left">
            <p className="leading-relaxed text-neutral-800 dark:text-neutral-100">
              {revealedChunks.map((chunk, i) => {
                const isActive = i === index;
                const containerClass = isActive ? 'text-xl font-bold italic' : 'text-lg';
                // Detect leading verse number like "1 " or "12 " at start of chunk
                const match = chunk.match(/^\s*(\d+)\s+([\s\S]*)$/);
                if (match) {
                  const [, num, rest] = match;
                  return (
                    <React.Fragment key={`chunk-${i}`}>
                      <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">{num}</span>
                      <span className={`px-1 ${containerClass}`}>{rest}</span>
                      {i < revealedChunks.length - 1 ? ' ' : ''}
                    </React.Fragment>
                  );
                }
                return (
                  <React.Fragment key={`chunk-${i}`}>
                    <span className={containerClass}>{chunk}</span>
                    {i < revealedChunks.length - 1 ? ' ' : ''}
                  </React.Fragment>
                );
              })}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        {isComplete ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestart}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Volver a leer
            </Button>

            <Button
              size="sm"
              onClick={() => {
                if (onPractice) onPractice();
              }}
              disabled={!onPractice}
              className="shrink-0"
            >
              Practicar
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
