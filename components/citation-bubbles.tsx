"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import type { CitationSegment, CitationSegmentId } from "@/lib/types";

interface CitationBubblesProps {
  segments: CitationSegment[];
  onSegmentClick: (id: CitationSegmentId) => void;
  appendedReference?: Partial<Record<CitationSegmentId, string>>;
  announce?: string;
  isComplete?: boolean;
  className?: string;
  onButtonRef?: (id: CitationSegmentId, el: HTMLButtonElement | null) => void;
}

export function CitationBubbles({
  segments,
  onSegmentClick,
  appendedReference = {},
  announce = '',
  isComplete = false,
  className,
  onButtonRef,
}: CitationBubblesProps) {
  
  const formattedReference = React.useMemo(() => {
    return segments
      .filter(s => s.appended)
      .map(s => s.label)
      .join(' ');
  }, [segments]);

  // Internal ref to manage focus navigation if parent doesn't
  const internalRefs = React.useRef<Partial<Record<CitationSegmentId, HTMLButtonElement | null>>>({});

  const handleRef = (id: CitationSegmentId, el: HTMLButtonElement | null) => {
    internalRefs.current[id] = el;
    if (onButtonRef) {
      onButtonRef(id, el);
    }
  };

  return (
    <div className={cn("space-y-3 text-center", className)}>
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
        {isComplete ? 'Cita completada' : 'Toca en orden para completar la cita'}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {segments.map((segment) => (
          <button
            key={segment.id}
            ref={(el) => handleRef(segment.id, el)}
            type="button"
            onClick={() => onSegmentClick(segment.id)}
            disabled={segment.appended}
            onKeyDown={(event) => {
              const isSpace = event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space' || event.code === 'Space';
              if (event.key === 'Enter') {
                event.preventDefault();
                onSegmentClick(segment.id);
              }
              if (isSpace) {
                event.preventDefault();
                // Check if this is the active (next pending) segment
                const nextPending = segments.find(s => !s.appended);
                if (nextPending && nextPending.id === segment.id) {
                  // If it's the last segment, activate it
                  const remainingCount = segments.filter(s => !s.appended).length;
                  if (remainingCount === 1) {
                    onSegmentClick(segment.id);
                  } else {
                    // Otherwise, activate and let the handler focus the next
                    onSegmentClick(segment.id);
                  }
                } else if (!segment.appended) {
                  // If space on a non-active segment, just focus the next pending
                  if (nextPending) {
                    const btn = internalRefs.current[nextPending.id];
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
              // Ring logic: ring the next pending segment
              segments.find(s => !s.appended)?.id === segment.id
                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900'
                : ''
            )}
          >
            {segment.label}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="sr-only">{announce}</div>
      {formattedReference && (
        <div className="mt-2 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {formattedReference}
        </div>
      )}
    </div>
  );
}
