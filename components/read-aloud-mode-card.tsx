"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, RotateCcw, CheckCircle2, AlertCircle, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { sanitizeVerseText } from "@/lib/sanitize";

interface ReadAloudModeCardProps {
  reference: string;
  text: string;
  verseParts?: string[];
  startVerse?: number;
  onComplete?: () => void;
  onBack?: () => void;
}

// Normalize text for comparison (lowercase, remove punctuation, accents)
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

// Common phonetic confusions in Spanish speech recognition
// Maps what might be heard -> what it could be
const PHONETIC_EQUIVALENTS: Record<string, string[]> = {
  // S/Z confusion (common in Latin American Spanish)
  's': ['z', 'c'],
  'z': ['s'],
  'c': ['s', 'z'],
  // B/V confusion
  'b': ['v'],
  'v': ['b'],
  // J/G confusion  
  'j': ['g'],
  'g': ['j'],
  // Y/LL confusion
  'y': ['ll', 'i'],
  'll': ['y'],
  // Common biblical name mishearings
};

// Check if two words are phonetically similar
function arePhoneticallySimilar(spoken: string, expected: string): boolean {
  if (spoken === expected) return true;
  if (spoken.length === 0 || expected.length === 0) return false;
  
  // If lengths are very different, not similar
  if (Math.abs(spoken.length - expected.length) > 2) return false;
  
  // Try replacing common confusions
  let modifiedSpoken = spoken;
  
  // S/Z swap
  modifiedSpoken = spoken.replace(/s/g, 'z');
  if (modifiedSpoken === expected) return true;
  modifiedSpoken = spoken.replace(/z/g, 's');
  if (modifiedSpoken === expected) return true;
  
  // B/V swap
  modifiedSpoken = spoken.replace(/b/g, 'v');
  if (modifiedSpoken === expected) return true;
  modifiedSpoken = spoken.replace(/v/g, 'b');
  if (modifiedSpoken === expected) return true;
  
  // Check Levenshtein distance for close matches (1-2 edits for short words)
  const distance = levenshteinDistance(spoken, expected);
  const maxDistance = expected.length <= 4 ? 1 : 2;
  
  return distance <= maxDistance;
}

// Simple Levenshtein distance implementation
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Split text into words, preserving the original form
function splitIntoWords(text: string): string[] {
  // Remove verse numbers like <sup>1</sup> or standalone numbers at start
  const sanitized = sanitizeVerseText(text)
    .replace(/^\d+\s+/, "") // Remove leading verse number
    .replace(/\s*\d+\s+/g, " ") // Remove inline verse numbers
    .trim();
  
  return sanitized.split(/\s+/).filter(Boolean);
}

export function ReadAloudModeCard({
  reference,
  text,
  verseParts,
  startVerse,
  onComplete,
  onBack,
}: ReadAloudModeCardProps) {
  const words = React.useMemo(() => splitIntoWords(text), [text]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);
  const [matchedWords, setMatchedWords] = React.useState<Set<number>>(new Set());
  const [skippedWords, setSkippedWords] = React.useState<Set<number>>(new Set());

  const {
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    resetTranscript,
  } = useSpeechRecognition();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const passageScrollRef = React.useRef<HTMLDivElement | null>(null);
  const wordRefs = React.useRef<Record<number, HTMLSpanElement | null>>({});
  
  // Track the number of words we've already processed from the transcript
  const processedWordCountRef = React.useRef(0);

  // Process transcript to match words
  React.useEffect(() => {
    if (!transcript && !interimTranscript) return;

    const fullTranscript = (transcript + " " + interimTranscript).trim();
    const allSpokenWords = fullTranscript.split(/\s+/).filter(Boolean);
    
    if (allSpokenWords.length === 0) return;

    // Only look at NEW words since our last processed position
    const newWords = allSpokenWords.slice(processedWordCountRef.current);
    if (newWords.length === 0) return;

    const expectedWord = words[currentIndex];
    if (!expectedWord) return;

    const normalizedExpected = normalizeForComparison(expectedWord);

    // Check each new word in order
    for (let i = 0; i < newWords.length; i++) {
      const spoken = newWords[i];
      const normalizedSpoken = normalizeForComparison(spoken);
      
      // Check for exact match
      const isExactMatch = normalizedSpoken === normalizedExpected;
      
      // Check for phonetic similarity (handles Zara/Sara, etc.)
      const isPhoneticMatch = !isExactMatch && arePhoneticallySimilar(normalizedSpoken, normalizedExpected);
      
      // Allow partial matches only for longer words (at least 4 chars matching)
      const isPartialMatch = 
        !isExactMatch && 
        !isPhoneticMatch &&
        normalizedExpected.length >= 5 && 
        normalizedSpoken.length >= 4 &&
        (normalizedSpoken.startsWith(normalizedExpected.slice(0, 4)) ||
         normalizedExpected.startsWith(normalizedSpoken.slice(0, 4)));

      if (isExactMatch || isPhoneticMatch || isPartialMatch) {
        // Update processed count to INCLUDE this matched word
        processedWordCountRef.current = processedWordCountRef.current + i + 1;
        
        setMatchedWords((prev) => new Set([...prev, currentIndex]));
        
        if (currentIndex < words.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          // Completed!
          setIsComplete(true);
          stopListening();
        }
        // Break after first match - process one word at a time
        return;
      }
    }
  }, [transcript, interimTranscript, currentIndex, words, stopListening]);

  const handleStart = React.useCallback(() => {
    processedWordCountRef.current = 0;
    resetTranscript();
    startListening();
  }, [resetTranscript, startListening]);

  const handleStop = React.useCallback(() => {
    stopListening();
  }, [stopListening]);

  const handleRestart = React.useCallback(() => {
    stopListening();
    resetTranscript();
    processedWordCountRef.current = 0;
    setCurrentIndex(0);
    setMatchedWords(new Set());
    setSkippedWords(new Set());
    setIsComplete(false);
  }, [stopListening, resetTranscript]);

  const handleSkipWord = React.useCallback(() => {
    setSkippedWords((prev) => new Set([...prev, currentIndex]));
    
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed (with skips)
      setIsComplete(true);
      stopListening();
    }
  }, [currentIndex, words.length, stopListening]);

  const handleToggle = React.useCallback(() => {
    if (isListening) {
      handleStop();
    } else {
      handleStart();
    }
  }, [isListening, handleStart, handleStop]);

  const displayVerses = React.useMemo(() => {
    const parts = verseParts && verseParts.length > 0 ? verseParts : [text];
    const baseVerse = Number.isFinite(startVerse) ? Number(startVerse) : undefined;
    let wordIndex = 0;
    return parts.map((part, idx) => {
      const tokens = splitIntoWords(part);
      const wordsForVerse = tokens.map((token) => ({
        text: token,
        index: wordIndex++,
      }));
      const verseNumber = parts.length > 1 ? (baseVerse ?? 1) + idx : baseVerse;
      return { verseNumber, words: wordsForVerse };
    });
  }, [verseParts, startVerse, text]);

  const transcriptPreview = React.useMemo(() => {
    const combined = `${transcript} ${interimTranscript}`.trim();
    if (!combined) return '';
    const tokens = combined.split(/\s+/).filter(Boolean);
    return tokens.slice(-6).join(' ');
  }, [transcript, interimTranscript]);

  React.useEffect(() => {
    const current = wordRefs.current[currentIndex];
    if (!current) return;
    try {
      current.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    } catch {
      // ignore
    }
  }, [currentIndex]);

  const progress = words.length > 0 ? Math.round((currentIndex / words.length) * 100) : 0;

  // Not supported fallback
  if (!isSupported) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500" />
          <div>
            <h3 className="text-lg font-semibold">Navegador no compatible</h3>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Tu navegador no soporta reconocimiento de voz. Prueba con Chrome, Edge o Safari.
            </p>
          </div>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Volver
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
            Leer en voz alta
          </p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {reference}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!isComplete && (
            <div className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              {currentIndex + 1} / {words.length}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestart}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reiniciar</span>
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {!isComplete && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main content area */}
      {!isComplete ? (
        <div
          ref={containerRef}
          className="mt-6 flex flex-1 flex-col rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/60 min-h-0"
        >
          {/* Passage display - scrollable area */}
          <div
            ref={passageScrollRef}
            className="flex-1 overflow-y-auto px-5 py-6 text-center min-h-0"
          >
            <div className="space-y-4 text-lg leading-relaxed text-neutral-400 dark:text-neutral-500">
              {displayVerses.map((verse, verseIdx) => (
                <p key={`verse-${verseIdx}`} className="flex flex-wrap justify-center gap-x-2 gap-y-2">
                  {verse.verseNumber ? (
                    <span className="mr-1 inline-flex items-start text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                      {verse.verseNumber}.
                    </span>
                  ) : null}
                  {verse.words.map((word) => {
                    const isCurrent = word.index === currentIndex;
                    const isPast = word.index < currentIndex;
                    const isSkipped = skippedWords.has(word.index);
                    return (
                      <span
                        key={`word-${word.index}`}
                        ref={(el) => {
                          wordRefs.current[word.index] = el;
                        }}
                        className={cn(
                          'transition-colors',
                          isCurrent && 'text-neutral-900 dark:text-neutral-50 font-semibold',
                          isSkipped && 'text-amber-400 dark:text-amber-300',
                          isPast && !isSkipped && 'text-neutral-400 dark:text-neutral-500',
                          !isPast && !isCurrent && !isSkipped && 'text-neutral-300 dark:text-neutral-600'
                        )}
                      >
                        {word.text}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
          </div>

          {/* Bottom controls section - fixed at bottom */}
          <div className="flex flex-col items-center gap-3 border-t border-neutral-200 bg-white/80 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900/80">
            {/* Listening indicator */}
            {isListening && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                </span>
                Escuchando...
              </div>
            )}

            {/* Transcript display - recent words */}
            {transcriptPreview && (
              <div className="text-sm italic text-neutral-400">
                {transcriptPreview}
              </div>
            )}

            {/* Error display - improved UX */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  {error === "no-speech" 
                    ? "No detectamos audio. Habla más fuerte."
                    : error === "audio-capture"
                    ? "No pudimos acceder al micrófono."
                    : error === "not-allowed"
                    ? "Permiso de micrófono denegado."
                    : `Error: ${error}`}
                </span>
              </div>
            )}

            {/* Mic button and Skip button */}
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                variant={isListening ? "destructive" : "default"}
                onClick={handleToggle}
                className={cn(
                  "flex items-center gap-2 px-8",
                  isListening && "animate-pulse"
                )}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-5 w-5" />
                    Detener
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    Empezar
                  </>
                )}
              </Button>

              {/* Skip button - shown when listening */}
            {isListening && (
              <Button
                size="icon"
                variant="outline"
                onClick={handleSkipWord}
                className="h-11 w-11"
                title="Saltar esta palabra"
                aria-label="Saltar esta palabra"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            )}
            </div>

            {/* Instructions */}
            {!isListening && currentIndex === 0 && (
              <p className="max-w-xs text-center text-sm text-neutral-500 dark:text-neutral-400">
                Presiona el botón y lee en voz alta.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Completion state */
          <div className="mt-6 flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-green-300 bg-green-50 px-4 py-8 text-center dark:border-green-800 dark:bg-green-900/20">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
              ¡Completado! 👍
            </h3>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              Lectura finalizada.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={handleRestart} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Leer de nuevo
            </Button>
            {onComplete && (
              <Button onClick={onComplete}>
                Continuar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
