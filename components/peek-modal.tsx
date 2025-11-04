"use client";
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import sanitizeVerseText from '@/lib/sanitize';

interface PeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseText: string;
  verseReference?: string;
  // durationFactor multiplies the base peek duration (1 = 100%, 0.8 = 80%, etc.)
  // Set to 0 for no countdown (manual close only)
  durationFactor?: number;
}

/**
 * Calculate peek duration based on word count
 * Formula: ~200-250ms per word with min 3s and max 15s
 */
function calculatePeekDuration(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const msPerWord = 220;
  const baseDuration = wordCount * msPerWord;
  const minDuration = 3000; // 3 seconds minimum
  const maxDuration = 15000; // 15 seconds maximum
  return Math.max(minDuration, Math.min(maxDuration, baseDuration));
}

export const PeekModal: React.FC<PeekModalProps> = ({
  isOpen,
  onClose,
  verseText,
  verseReference,
  durationFactor,
}) => {
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [totalDuration, setTotalDuration] = React.useState(0);
  const [isUnlimited, setIsUnlimited] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef<number | null>(null);

  // Initialize duration when modal opens
  React.useEffect(() => {
    if (isOpen && verseText) {
      // durationFactor === 0 means no countdown (unlimited time)
      if (durationFactor === 0) {
        setIsUnlimited(true);
        setTotalDuration(0);
        setTimeRemaining(0);
        startTimeRef.current = null;
        return;
      }
      
      setIsUnlimited(false);
      const base = calculatePeekDuration(verseText);
      const factor = typeof durationFactor === 'number' && durationFactor > 0 ? durationFactor : 1;
      const duration = Math.max(1000, Math.round(base * factor));
      setTotalDuration(duration);
      setTimeRemaining(duration);
      startTimeRef.current = Date.now();
    }
  }, [isOpen, verseText, durationFactor]);

  // Countdown timer (only when not unlimited)
  React.useEffect(() => {
    if (!isOpen || isUnlimited || timeRemaining <= 0) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      if (!startTimeRef.current) return;
      
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, totalDuration - elapsed);
      
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        onClose();
      }
    }, 50); // Update every 50ms for smooth progress bar

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, timeRemaining, totalDuration, onClose]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const progressValue = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;
  const secondsRemaining = Math.ceil(timeRemaining / 1000);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-2xl !w-[calc(100%-2rem)] rounded-xl max-h-[80vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Vistazo rápido</span>
            {!isUnlimited && (
              <span className={cn(
                "text-2xl font-bold tabular-nums",
                secondsRemaining <= 2 ? "text-red-600 dark:text-red-400 animate-pulse" :
                secondsRemaining <= 5 ? "text-orange-600 dark:text-orange-400" :
                "text-neutral-600 dark:text-neutral-400"
              )}>
                {secondsRemaining}s
              </span>
            )}
          </DialogTitle>
          {verseReference && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {verseReference}
            </p>
          )}
        </DialogHeader>

        {!isUnlimited && (
          <div className="flex-shrink-0 mb-3">
            <Progress 
              value={progressValue} 
              className={cn(
                "h-2 transition-all",
                progressValue >= 80 && "bg-red-200 dark:bg-red-900"
              )}
            />
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4"
          style={{ maxHeight: isUnlimited ? 'calc(80vh - 140px)' : 'calc(80vh - 180px)' }}
        >
          {/* Render sanitized HTML so <sup> and entities are shown correctly. */}
          <div
            className="text-lg leading-relaxed text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap"
            // sanitized to only allow <sup> tags and decoded entities
            dangerouslySetInnerHTML={{ __html: sanitizeVerseText(verseText || '', true) }}
          />
        </div>

        <div className="flex-shrink-0 mt-3 text-center">
          <button
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 underline underline-offset-2"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
