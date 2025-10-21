"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, RotateCcw,  } from "lucide-react";
import { cn } from "@/lib/utils";

type CitationSegmentId = 'book' | 'chapter' | 'verses';

type CitationSegment = {
  id: CitationSegmentId;
  label: string;
  order: number;
  appended: boolean;
};

function extractCitationSegments(reference: string | undefined): CitationSegment[] {
  if (!reference) return [];
  const trimmed = reference.trim();
  if (!trimmed) return [];

  const colonIndex = trimmed.indexOf(':');
  if (colonIndex === -1) {
    return [{ id: 'book', label: trimmed, order: 0, appended: false }];
  }

  const beforeColon = trimmed.slice(0, colonIndex).trim();
  const afterColon = trimmed.slice(colonIndex + 1).trim();
  const lastSpaceIdx = beforeColon.lastIndexOf(' ');

  let bookLabel = beforeColon;
  let chapterLabel = '';

  if (lastSpaceIdx !== -1) {
    bookLabel = beforeColon.slice(0, lastSpaceIdx).trim();
    chapterLabel = beforeColon.slice(lastSpaceIdx + 1).trim();
  }

  const segments: CitationSegment[] = [];
  let order = 0;
  if (bookLabel) segments.push({ id: 'book', label: bookLabel, order: order++, appended: false });
  if (chapterLabel) segments.push({ id: 'chapter', label: chapterLabel, order: order++, appended: false });
  if (afterColon) segments.push({ id: 'verses', label: afterColon, order: order++, appended: false });
  return segments;
}

interface ReadModeCardProps {
  reference: string;
  translation?: string;
  chunks: string[];
  onPractice?: () => void;
}

export function ReadModeCard({ chunks, onPractice, reference }: ReadModeCardProps) {
  const [index, setIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const revealAllButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const [readAnnounce, setReadAnnounce] = React.useState<string>('');
  const [citationSegments, setCitationSegments] = React.useState<CitationSegment[]>([]);
  const [appendedReference, setAppendedReference] = React.useState<Partial<Record<CitationSegmentId, string>>>({});
  const citationButtonsRef = React.useRef<Partial<Record<CitationSegmentId, HTMLButtonElement | null>>>({});
  const [citationAnnounce, setCitationAnnounce] = React.useState<string>('');
  const total = chunks.length;
  const progress = index < 0 ? 0 : Math.min(index + 1, total);
  // Consider the flow: index ranges -1 (nothing) .. total-1 (last fragment shown) .. total (user advanced past last)
  // Mark complete only when index has advanced past the last fragment (index >= total).
  const isComplete = total > 0 && index >= total;

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
    if (index >= total) return "Pasaje leído completo.";
    // progress is already 1-based (index + 1), so use it directly for the fragment number
    return `Fragmento ${progress} de ${total}`;
  }, [index, progress, total]);

  const revealedChunks = React.useMemo(() => {
    if (index < 0) return [];
    return chunks.slice(0, Math.min(index + 1, total));
  }, [chunks, index, total]);

  const handleAdvance = React.useCallback(() => {
    if (!total) return;
    setIndex((prev) => {
      // allow an extra advance so index can reach `total` (which indicates completion)
      const next = Math.min(prev + 1, total);
      // Announce change for screen readers
      if (next >= total) {
        setReadAnnounce('Pasaje leído completo.');
      } else {
        const fragNumber = Math.min(next + 1, total);
        setReadAnnounce(`Fragmento ${fragNumber} de ${total}`);
      }
      return next;
    });
  }, [total]);

  const handleRestart = React.useCallback(() => {
    setIndex(-1);
    setCitationSegments([]);
    setAppendedReference({});
    setCitationAnnounce('');
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

  // When user reveals the last fragment, initialize citation segments (if any)
  React.useEffect(() => {
    if (index === total - 1 && total > 0) {
      const segments = extractCitationSegments(reference);
      if (segments.length > 0) {
        setCitationSegments(segments);
        // Remove focus from container and focus first bubble after render
        requestAnimationFrame(() => {
          // Blur container to remove its focus
          try { containerRef.current?.blur(); } catch {}
          // Focus first bubble
          const first = segments[0];
          const btn = citationButtonsRef.current[first.id];
          try { btn?.focus(); } catch {}
        });
      } else {
        setCitationSegments([]);
      }
    } else if (index < total - 1) {
      // Reset if user goes back
      setCitationSegments([]);
      setAppendedReference({});
      setCitationAnnounce('');
    }
  }, [index, reference, total]);

  const handleCitationSegmentClick = React.useCallback((segmentId: CitationSegmentId) => {
    setCitationSegments(prev => {
      const segment = prev.find(item => item.id === segmentId);
      if (!segment || segment.appended) return prev;
      const nextSegment = [...prev].find(item => !item.appended);
      if (nextSegment && nextSegment.id !== segmentId) return prev; // enforce order
      setAppendedReference(prevRef => ({ ...prevRef, [segmentId]: segment.label }));
      setCitationAnnounce(`Agregado: ${segment.label}`);
      const updated = prev.map(item => item.id === segmentId ? { ...item, appended: true } : item);
      // focus next
      requestAnimationFrame(() => {
        const next = updated.find(s => !s.appended);
        if (next) {
          const btn = citationButtonsRef.current[next.id];
          try { btn?.focus(); } catch {}
        } else {
          // all appended: advance to complete state
          setIndex(total);
          setReadAnnounce('Pasaje leído completo.');
        }
      });
      return updated;
    });
  }, [total]);

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

  const handleRevealAll = React.useCallback(() => {
    if (total <= 0) return;
    // reveal all fragments (show last fragment) but do not mark complete
    setIndex(total - 1);
    // Announce reveal all
    setReadAnnounce('Se han revelado todos los fragmentos.');
    // focus Reveal All button so keyboard users are aware and can continue
    requestAnimationFrame(() => {
      revealAllButtonRef.current?.focus();
      // also ensure container still receives focus for keyboard navigation
      containerRef.current?.focus();
    });
  }, [total]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
            Modo lectura
          </p>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <div className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              {progress} / {total}
            </div>
          )}
          {/* Show 'Revelar todo' when there are fragments and the last fragment is not yet visible */}
          {total > 0 && index < total - 1 && (
            <Button ref={revealAllButtonRef} variant="ghost" size="sm" onClick={handleRevealAll} className="whitespace-nowrap">
              Revelar todo
            </Button>
          )}
        </div>
      </div>

      {/* Passage area: interactive while reading; when complete show confirmation panel */}
      {!isComplete ? (
        <div
          ref={containerRef}
          role="button"
          tabIndex={citationSegments.length > 0 ? -1 : 0}
          className={cn(
            // make relative so we can absolutely position the tap hint
            "mt-6 relative flex min-h-[260px] flex-1 cursor-pointer flex-col items-stretch gap-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900/60 dark:focus-visible:ring-offset-neutral-950",
            !total && "cursor-default",
            citationSegments.length > 0 && "cursor-default pointer-events-none",
            'overflow-hidden',
          )}
          onClick={() => {
            if (citationSegments.length > 0) return;
            handleAdvance();
          }}
          onKeyDown={(e) => {
            if (citationSegments.length > 0) return;
            handleKeyDown(e);
          }}
          aria-label="Área interactiva para revelar el pasaje verso por verso"
        >
          <span className="sr-only" aria-live="polite">{announcement}</span>
          <div aria-live="polite" className="sr-only">{readAnnounce}</div>

          {/* Tap hint: a small bouncing hand shown only before the first reveal */}
          {index < 0 && total > 0 && (
            <div className="absolute right-4 bottom-4 flex items-center gap-2 pointer-events-none">
              <div aria-hidden="true" className={`text-2xl ${reduceMotion ? '' : 'animate-bounce'} opacity-90 select-none`}>
                👆
              </div>
              <span className="sr-only">Toca aquí para revelar el pasaje</span>
            </div>
          )}

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

                    {/* Citation bubbles: show under the current chunk when available */}
                    {citationSegments.length > 0 && (
                      <div className="mt-4 pointer-events-auto">
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 text-center mb-2">Toca las burbujas en orden para completar la cita</p>
                        <div className="flex flex-wrap justify-center gap-3">
                          {citationSegments.map((segment, idx) => (
                            <button
                              key={segment.id}
                              ref={(el) => { citationButtonsRef.current[segment.id] = el; }}
                              type="button"
                              onClick={() => handleCitationSegmentClick(segment.id)}
                              disabled={segment.appended}
                              onKeyDown={(event) => {
                                const isSpace = event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space' || event.code === 'Space';
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  handleCitationSegmentClick(segment.id);
                                }
                                if (isSpace) {
                                  event.preventDefault();
                                  // Check if this is the active (next pending) segment
                                  const nextPending = citationSegments.find(s => !s.appended);
                                  if (nextPending && nextPending.id === segment.id) {
                                    // If it's the last segment, activate it
                                    const remainingCount = citationSegments.filter(s => !s.appended).length;
                                    if (remainingCount === 1) {
                                      handleCitationSegmentClick(segment.id);
                                    } else {
                                      // Otherwise, activate and let the handler focus the next
                                      handleCitationSegmentClick(segment.id);
                                    }
                                  } else if (!segment.appended) {
                                    // If space on a non-active segment, just focus the next pending
                                    if (nextPending) {
                                      const btn = citationButtonsRef.current[nextPending.id];
                                      try { btn?.focus(); } catch {}
                                    }
                                  }
                                }
                              }}
                              className={cn(
                                'inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors shadow-sm',
                                segment.appended
                                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800',
                                // ring the next pending
                                citationSegments.find(s => !s.appended)?.id === segment.id
                                  ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900'
                                  : ''
                              )}
                            >
                              {segment.label}
                            </button>
                          ))}
                        </div>
                        <div aria-live="polite" className="sr-only">{citationAnnounce}</div>
                        {Object.keys(appendedReference).length > 0 && (
                          <div className="mt-2 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-100">{(() => {
                            const book = appendedReference.book;
                            const chapter = appendedReference.chapter;
                            const versesLabel = appendedReference.verses;
                            if (!book && !chapter && !versesLabel) return '';
                            const pieces: string[] = [];
                            if (typeof book === 'string' && book) pieces.push(String(book));
                            if (typeof chapter === 'string' && chapter) {
                              const chapterPiece = typeof versesLabel === 'string' && versesLabel ? `${chapter}:${versesLabel}` : chapter;
                              pieces.push(String(chapterPiece));
                              return pieces.join(' ');
                            }
                            if (typeof versesLabel === 'string' && versesLabel) pieces.push(String(versesLabel));
                            return pieces.join(' ');
                          })()}</div>
                        )}
                      </div>
                    )}
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
