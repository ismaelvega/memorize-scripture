"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, RotateCcw, Volume2, VolumeX, Play, Pause, Square } from "lucide-react";
import { cn, extractCitationSegments } from "@/lib/utils";
import { useTTS } from "@/lib/use-tts";
import { CitationBubbles } from "./citation-bubbles";
import type { CitationSegment, CitationSegmentId } from "@/lib/types";

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

  // Text-to-speech for reading chunks aloud
  const { speak, cancel: cancelTTS, isMuted, toggleMute, isSupported: ttsSupported } = useTTS();
  const [autoPlayState, setAutoPlayState] = React.useState<'idle' | 'playing' | 'paused'>('idle');
  const autoPlayStateRef = React.useRef(autoPlayState); // Ref to access current state in callbacks
  const autoPlayIndexRef = React.useRef(0);
  const updateAutoPlayState = React.useCallback(
    (nextState: 'idle' | 'playing' | 'paused') => {
      autoPlayStateRef.current = nextState;
      setAutoPlayState(nextState);
    },
    [setAutoPlayState]
  );

  // Keep ref in sync with state when it changes outside helper (e.g., initial render)
  React.useEffect(() => {
    autoPlayStateRef.current = autoPlayState;
  }, [autoPlayState]);

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
        // Only speak if not in auto-play mode (auto-play handles its own speech)
        if (autoPlayState === 'idle') {
          const chunkText = chunks[next];
          if (chunkText) {
            // Strip verse numbers for cleaner speech
            const cleanText = chunkText.replace(/^\s*\d+\s+/, '');
            speak(cleanText);
          }
        }
      }
      return next;
    });
  }, [total, chunks, speak, autoPlayState]);

  const handleRestart = React.useCallback(() => {
    cancelTTS();
    updateAutoPlayState('idle');
    setIndex(-1);
    setCitationSegments([]);
    setAppendedReference({});
    setCitationAnnounce('');
    requestAnimationFrame(() => {
      containerRef.current?.focus();
    });
  }, [cancelTTS, updateAutoPlayState]);

  // Auto-play: reveal and read one chunk, then rely on TTS end events for real-time pacing
  const playCurrentChunk = React.useCallback(() => {
    if (autoPlayStateRef.current !== 'playing') {
      return;
    }

    const idx = autoPlayIndexRef.current;
    if (idx >= total) {
      updateAutoPlayState('idle');
      return;
    }

    setIndex(idx);

    const chunkText = chunks[idx];
    if (!chunkText) {
      autoPlayIndexRef.current = idx + 1;
      playCurrentChunk();
      return;
    }

    const cleanText = chunkText.replace(/^\s*\d+\s+/, '');
    speak(cleanText, {
      onEnd: () => {
        if (autoPlayStateRef.current !== 'playing') {
          return;
        }
        autoPlayIndexRef.current = idx + 1;
        if (autoPlayIndexRef.current >= total) {
          updateAutoPlayState('idle');
          return;
        }
        playCurrentChunk();
      },
    });
  }, [chunks, speak, total, updateAutoPlayState]);

  const handleAutoPlay = React.useCallback(() => {
    if (!total || isMuted) return;
    if (autoPlayState !== 'idle') return; // Prevent double-start

    const startIdx = index < 0 ? 0 : Math.min(index + 1, total - 1);
    autoPlayIndexRef.current = startIdx;
    updateAutoPlayState('playing');

    requestAnimationFrame(() => {
      playCurrentChunk();
    });
  }, [autoPlayState, index, isMuted, playCurrentChunk, total, updateAutoPlayState]);

  const handlePauseAutoPlay = React.useCallback(() => {
    cancelTTS();
    updateAutoPlayState('paused');
  }, [cancelTTS, updateAutoPlayState]);

  const handleResumeAutoPlay = React.useCallback(() => {
    if (autoPlayState !== 'paused') return;
    updateAutoPlayState('playing');
    
    // Resume from where we left off
    requestAnimationFrame(() => {
      playCurrentChunk();
    });
  }, [autoPlayState, playCurrentChunk, updateAutoPlayState]);

  const handleStopAutoPlay = React.useCallback(() => {
    cancelTTS();
    updateAutoPlayState('idle');
  }, [cancelTTS, updateAutoPlayState]);

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
          {total > 0 && index < total - 1 && autoPlayState === 'idle' && (
            <Button ref={revealAllButtonRef} variant="ghost" size="sm" onClick={handleRevealAll} className="whitespace-nowrap">
              Revelar todo
            </Button>
          )}
          {/* Auto-play controls: Play/Pause/Stop */}
          {ttsSupported && total > 0 && index < total - 1 && (
            <div className="flex items-center gap-1">
              {autoPlayState === 'idle' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoPlay}
                  disabled={isMuted}
                  className="flex items-center gap-1.5 px-2"
                  title={isMuted ? 'Activa el audio primero' : 'Escuchar pasaje'}
                >
                  <Play size={16} />
                  <span className="hidden sm:inline">Escuchar</span>
                </Button>
              )}
              {autoPlayState === 'playing' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePauseAutoPlay}
                    className="flex items-center gap-1.5 px-2"
                    title="Pausar"
                  >
                    <Pause size={16} />
                    <span className="hidden sm:inline">Pausar</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStopAutoPlay}
                    className="px-2"
                    title="Detener"
                  >
                    <Square size={14} />
                  </Button>
                </>
              )}
              {autoPlayState === 'paused' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResumeAutoPlay}
                    className="flex items-center gap-1.5 px-2"
                    title="Continuar"
                  >
                    <Play size={16} />
                    <span className="hidden sm:inline">Continuar</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStopAutoPlay}
                    className="px-2"
                    title="Detener"
                  >
                    <Square size={14} />
                  </Button>
                </>
              )}
            </div>
          )}
          {/* TTS mute/unmute toggle */}
          {ttsSupported && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="flex items-center gap-1.5 px-2"
              title={isMuted ? 'Activar audio' : 'Silenciar audio'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span className="sr-only">{isMuted ? 'Activar audio' : 'Silenciar'}</span>
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
            "mt-6 relative flex min-h-[260px] max-h-[calc(100dvh-10rem)] flex-1 cursor-pointer flex-col items-stretch gap-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900/60 dark:focus-visible:ring-offset-neutral-950",
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
            <div className="w-full max-w-2xl flex flex-col flex-1 min-h-0">
              {/* Previous chunks: scrollable area */}
              <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto pr-2"
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
                        <CitationBubbles
                          segments={citationSegments}
                          onSegmentClick={handleCitationSegmentClick}
                          appendedReference={appendedReference}
                          announce={citationAnnounce}
                          onButtonRef={(id, el) => { citationButtonsRef.current[id] = el; }}
                        />
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
            <h3 className="text-lg font-semibold">¿List@? 👀</h3>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Ya puedes empezar a practicar este pasaje!</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
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
