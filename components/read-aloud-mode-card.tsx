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

  // Get display words: previous, current, next 2
  const displayWords = React.useMemo(() => {
    const prevWord = currentIndex > 0 ? words[currentIndex - 1] : null;
    const currWord = words[currentIndex] ?? null;
    const nextWord1 = words[currentIndex + 1] ?? null;
    const nextWord2 = words[currentIndex + 2] ?? null;

    return { prevWord, currWord, nextWord1, nextWord2 };
  }, [words, currentIndex]);

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
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
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
          className="mt-6 flex min-h-[200px] flex-col items-center justify-center gap-8 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 dark:border-neutral-700 dark:bg-neutral-900/60"
        >
          {/* Word display: A B CC format */}
          <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-2 text-center">
            {/* Previous word - faded/placeholder style */}
            {displayWords.prevWord && (
              <span className="text-lg text-neutral-400 dark:text-neutral-500">
                {displayWords.prevWord}
              </span>
            )}

            {/* Current word - bold and prominent */}
            {displayWords.currWord && (
              <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
                {displayWords.currWord}
              </span>
            )}

            {/* Next words - placeholder style, smaller */}
            <span className="flex items-baseline gap-2">
              {displayWords.nextWord1 && (
                <span className="text-base text-neutral-400/70 dark:text-neutral-500/70">
                  {displayWords.nextWord1}
                </span>
              )}
              {displayWords.nextWord2 && (
                <span className="text-base text-neutral-400/50 dark:text-neutral-500/50">
                  {displayWords.nextWord2}
                </span>
              )}
            </span>
          </div>

          {/* Listening indicator */}
          {isListening && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
              </span>
              Escuchando...
            </div>
          )}

          {/* Debug: show what was heard */}
          {(transcript || interimTranscript) && (
            <div className="max-w-sm text-center text-xs text-neutral-400">
              <span className="text-neutral-500">{transcript}</span>
              {interimTranscript && (
                <span className="italic text-neutral-400"> {interimTranscript}</span>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="text-sm text-red-500">
              Error: {error}
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

            {/* Skip button - shown when listening and stuck */}
            {isListening && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleSkipWord}
                className="flex items-center gap-2"
                title="Saltar esta palabra"
              >
                <SkipForward className="h-5 w-5" />
                <span className="hidden sm:inline">Saltar</span>
              </Button>
            )}
          </div>

          {/* Instructions */}
          {!isListening && currentIndex === 0 && (
            <p className="max-w-xs text-center text-sm text-neutral-500 dark:text-neutral-400">
              Presiona el botón y lee en voz alta. La palabra actual avanzará cuando la reconozcamos.
            </p>
          )}
        </div>
      ) : (
        /* Completion state */
        <div className={cn(
          "mt-6 flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-4 py-8 text-center",
          skippedWords.size === 0 
            ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
            : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
        )}>
          <CheckCircle2 className={cn(
            "h-12 w-12",
            skippedWords.size === 0 
              ? "text-green-600 dark:text-green-400"
              : "text-amber-600 dark:text-amber-400"
          )} />
          <div>
            <h3 className={cn(
              "text-lg font-semibold",
              skippedWords.size === 0 
                ? "text-green-800 dark:text-green-200"
                : "text-amber-800 dark:text-amber-200"
            )}>
              {skippedWords.size === 0 ? "¡Excelente! 🎉" : "¡Completado! 👍"}
            </h3>
            <p className={cn(
              "mt-1 text-sm",
              skippedWords.size === 0 
                ? "text-green-700 dark:text-green-300"
                : "text-amber-700 dark:text-amber-300"
            )}>
              {skippedWords.size === 0 
                ? "Has leído todo el pasaje correctamente."
                : `Leíste el pasaje con ${skippedWords.size} palabra${skippedWords.size > 1 ? 's' : ''} saltada${skippedWords.size > 1 ? 's' : ''}.`
              }
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
