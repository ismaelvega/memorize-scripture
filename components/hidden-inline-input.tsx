"use client";
import * as React from 'react';

interface HiddenInlineInputProps {
  words: string[];
  startIndex?: number;
  onWordCommit?: (args: {
    index: number;
    target: string;
    typed: string;
    correct: boolean;
    mistakes: number;
    durationMs: number;
  }) => void;
  onDone?: () => void;
  markers?: Array<{ index: number; label: string }>;
  onFirstInteraction?: () => void;
}

function sanitizePartialWord(raw: string) {
  const spaceFixed = (raw || '').replace(/\u00A0/g, ' ');
  const noLeading = spaceFixed.replace(/^\s+/, '');
  const firstToken = noLeading.split(/\s/)[0] || '';
  return firstToken.normalize('NFC');
}

function isOnlyTrailingPunct(text: string) {
  return /^[^\p{L}\p{N}]+$/u.test(text);
}

function stripTrailingPunct(text: string) {
  return text.replace(/[^\p{L}\p{N}]+$/u, '');
}

export const HiddenInlineInput: React.FC<HiddenInlineInputProps> = ({
  words,
  startIndex = 0,
  onWordCommit,
  onDone,
  markers = [],
  onFirstInteraction,
}) => {
  const [index, setIndex] = React.useState(startIndex);
  const [typed, setTyped] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [isComposing, setIsComposing] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [liveRegionMessage, setLiveRegionMessage] = React.useState('');

  const hiddenInputRef = React.useRef<HTMLInputElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const currentMistakesRef = React.useRef(0);
  const wordStartRef = React.useRef<number | null>(null);
  const hasAnnouncedStartRef = React.useRef(false);

  const currentWord = words[index] ?? '';

  const markersMap = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const marker of markers) {
      map.set(marker.index, marker.label);
    }
    return map;
  }, [markers]);

  const resetInput = React.useCallback(() => {
    setTyped('');
    setError(false);
    const input = hiddenInputRef.current;
    if (input) input.value = '';
  }, []);

  React.useEffect(() => {
    const safeStart = Math.min(startIndex, Math.max(words.length - 1, 0));
    setIndex(safeStart);
    setTyped('');
    setError(false);
    const input = hiddenInputRef.current;
    if (input) input.value = '';
    currentMistakesRef.current = 0;
    wordStartRef.current = null;
    hasAnnouncedStartRef.current = false;
  }, [words, startIndex]);

  React.useEffect(() => {
    resetInput();
    currentMistakesRef.current = 0;
    wordStartRef.current = null;
  }, [index, resetInput]);

  React.useEffect(() => {
    const input = hiddenInputRef.current;
    if (input) {
      input.focus({ preventScroll: true });
      setFocused(true);
    }
  }, []);

  const normalizeForCommit = React.useCallback((raw: string) => {
    const candidate = sanitizePartialWord(raw);
    if (!candidate) return '';
    const target = currentWord.normalize('NFC');
    if (!target.startsWith(candidate)) {
      // If the candidate is longer than target prefix, just return candidate.
      return candidate;
    }
    const remainder = target.slice(candidate.length);
    if (remainder && isOnlyTrailingPunct(remainder)) {
      return target;
    }
    return candidate;
  }, [currentWord]);

  const commitWord = React.useCallback(() => {
    const input = hiddenInputRef.current;
    const raw = input?.value ?? typed;
    if (!raw.trim() || !currentWord) return;

    const normalized = normalizeForCommit(raw);
    const target = currentWord.normalize('NFC');
    const attempt = normalized.normalize('NFC');

    if (attempt === target) {
      const mistakesForWord = currentMistakesRef.current;
      const durationMs = wordStartRef.current ? Date.now() - wordStartRef.current : 0;
      setLiveRegionMessage(`Correcto: ${currentWord}`);
      onWordCommit?.({ index, target: currentWord, typed: attempt, correct: true, mistakes: mistakesForWord, durationMs });
      if (index + 1 >= words.length) {
        setLiveRegionMessage('Pasaje completo. ¡Buen trabajo!');
        onDone?.();
      } else {
        setIndex(prev => prev + 1);
      }
      currentMistakesRef.current = 0;
      wordStartRef.current = null;
      resetInput();
      return;
    }

    const partial = sanitizePartialWord(raw);
    if (input) input.value = partial;
    setTyped(partial);
    setError(true);
    setLiveRegionMessage('La palabra no coincide. Corrige antes de continuar.');
    currentMistakesRef.current += 1;
  }, [currentWord, index, normalizeForCommit, onDone, onWordCommit, resetInput, typed, words.length]);

  const ensureStartRegistered = React.useCallback(() => {
    if (!hasAnnouncedStartRef.current) {
      onFirstInteraction?.();
      hasAnnouncedStartRef.current = true;
    }
    if (wordStartRef.current === null) {
      wordStartRef.current = Date.now();
    }
  }, [onFirstInteraction]);

  const appendChar = React.useCallback((ch: string) => {
    const input = hiddenInputRef.current;
    const currentValue = input?.value ?? typed;
    const next = sanitizePartialWord(`${currentValue}${ch}`);
    if (input) input.value = next;
    setTyped(next);
    setError(false);
    ensureStartRegistered();

    if (currentWord) {
      const nextNormalized = next.normalize('NFC');
      const targetNormalized = currentWord.normalize('NFC');
      const targetWithoutPunct = stripTrailingPunct(targetNormalized);
      const matchesTarget = nextNormalized === targetNormalized;
      const matchesWithoutPunct = targetWithoutPunct && nextNormalized === targetWithoutPunct;
      if (nextNormalized && (matchesTarget || matchesWithoutPunct)) {
        commitWord();
      }
    }
  }, [typed, currentWord, commitWord, ensureStartRegistered]);

  const removeLastChar = React.useCallback(() => {
    setTyped(prev => {
      const trimmed = prev.slice(0, -1);
      const sanitized = sanitizePartialWord(trimmed);
      const input = hiddenInputRef.current;
      if (input) input.value = sanitized;
      if (!sanitized) {
        wordStartRef.current = null;
      }
      return sanitized;
    });
    setError(false);
  }, []);

  const handleInput = React.useCallback((event: React.FormEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const sanitized = sanitizePartialWord(input.value);
    input.value = sanitized;
    setTyped(sanitized);
    setError(false);
    ensureStartRegistered();
    if (currentWord) {
      const sanitizedNormalized = sanitized.normalize('NFC');
      const targetNormalized = currentWord.normalize('NFC');
      const targetWithoutPunct = stripTrailingPunct(targetNormalized);
      const matchesTarget = sanitizedNormalized === targetNormalized;
      const matchesWithoutPunct = targetWithoutPunct && sanitizedNormalized === targetWithoutPunct;
      if (sanitizedNormalized && (matchesTarget || matchesWithoutPunct)) {
        commitWord();
      }
    }
  }, [currentWord, commitWord, ensureStartRegistered]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;

    if (event.key === ' ') {
      event.preventDefault();
      commitWord();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      commitWord();
      return;
    }
  }, [commitWord, isComposing]);

  React.useEffect(() => {
    function onDocKeyDown(event: KeyboardEvent) {
      if (isComposing) return;
      const input = hiddenInputRef.current;
      if (!input) return;

      const target = event.target as HTMLElement | null;
      const tagName = (target?.tagName || '').toUpperCase();
      const isEditable = !!(target && (target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'));
      if (isEditable) return;

      if (document.activeElement !== input) {
        const isPrintable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
        if (isPrintable || event.key === ' ' || event.key === 'Backspace') {
          event.preventDefault();
          input.focus({ preventScroll: true });
          setFocused(true);
          if (isPrintable) appendChar(event.key);
          else if (event.key === ' ') commitWord();
          else removeLastChar();
        }
      }
    }

    window.addEventListener('keydown', onDocKeyDown);
    return () => window.removeEventListener('keydown', onDocKeyDown);
  }, [appendChar, commitWord, removeLastChar, isComposing]);

  return (
    <>
      <div className="sr-only" aria-live="polite">
        {liveRegionMessage}
      </div>

      <div
        ref={containerRef}
        role="group"
        aria-label={words.length ? `Escribe el pasaje palabra por palabra. Palabra ${index + 1} de ${words.length}` : 'No hay palabras para practicar.'}
        tabIndex={0}
        className="relative w-full overflow-hidden rounded-xl border bg-background px-4 py-5 focus:outline-none focus:ring-2 focus:ring-ring"
        onClick={() => {
          const input = hiddenInputRef.current;
          if (input) {
            input.focus({ preventScroll: true });
            setFocused(true);
          }
        }}
        onKeyDown={(event) => {
          const input = hiddenInputRef.current;
          if (!input) return;
          const activeIsInput = document.activeElement === input;
          const isPrintable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
          if (!activeIsInput && (isPrintable || event.key === ' ' || event.key === 'Backspace')) {
            event.preventDefault();
            input.focus({ preventScroll: true });
            setFocused(true);
            if (isPrintable) appendChar(event.key);
            else if (event.key === ' ') commitWord();
            else removeLastChar();
          }
        }}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-3 gap-y-3 text-lg font-semibold leading-snug">
            {words.length === 0 ? (
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                No hay palabras para practicar.
              </span>
            ) : (
              words.map((word, wordIndex) => {
                const marker = markersMap.get(wordIndex);
                const isCompleted = wordIndex < index;
                const isCurrent = wordIndex === index;

                if (isCompleted) {
                  return (
                    <span key={wordIndex} className="inline-flex items-baseline gap-1">
                      {marker && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 select-none align-top">
                          {marker}
                        </span>
                      )}
                      <span className="text-neutral-900 dark:text-neutral-100">{word}</span>
                    </span>
                  );
                }

                if (isCurrent) {
                  return (
                    <span key={wordIndex} className="inline-flex items-baseline gap-1">
                      {marker && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 select-none align-top">
                          {marker}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center text-neutral-900 dark:text-neutral-100 ${
                          error ? 'text-red-600 dark:text-red-400' : ''
                        }`}
                      >
                        {typed ? (
                          <span>{typed}</span>
                        ) : (
                          <span className="text-sm font-normal text-neutral-400 dark:text-neutral-500">
                            ....
                          </span>
                        )}
                        {focused && (
                          <span
                            aria-hidden
                            className={`ml-1 inline-block h-[1.4em] w-[2px] animate-blink ${
                              error ? 'bg-red-500 dark:bg-red-400' : 'bg-neutral-900 dark:bg-neutral-100'
                            }`}
                          />
                        )}
                      </span>
                      <span className="sr-only">
                        {error
                          ? 'Palabra actual con error. Corrige antes de continuar.'
                          : 'Palabra actual; escribe y presiona espacio para validar.'}
                      </span>
                    </span>
                  );
                }

                return (
                  <span key={wordIndex} className="inline-flex items-baseline gap-1">
                    <span aria-hidden className="tracking-widest text-neutral-300 dark:text-neutral-700 select-none">
                      ....
                    </span>
                  </span>
                );
              })
            )}
          </div>
          {error && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              La palabra debe coincidir exactamente antes de continuar.
            </p>
          )}
        </div>

        <input
          ref={hiddenInputRef}
          className="absolute left-0 top-0 h-px w-px opacity-0"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(event) => {
            setIsComposing(false);
            const input = event.currentTarget;
            const sanitized = sanitizePartialWord(input.value);
            input.value = sanitized;
            setTyped(sanitized);
            setError(false);
            ensureStartRegistered();
            if (currentWord) {
              const sanitizedNormalized = sanitized.normalize('NFC');
              const targetNormalized = currentWord.normalize('NFC');
              const targetWithoutPunct = stripTrailingPunct(targetNormalized);
              const matchesTarget = sanitizedNormalized === targetNormalized;
              const matchesWithoutPunct = targetWithoutPunct && sanitizedNormalized === targetWithoutPunct;
              if (sanitizedNormalized && (matchesTarget || matchesWithoutPunct)) {
                commitWord();
              }
            }
          }}
        />
      </div>
    </>
  );
};
