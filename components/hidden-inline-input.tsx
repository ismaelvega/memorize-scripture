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
  }) => void;
  onDone?: () => void;
  markers?: Array<{ index: number; label: string }>;
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

export const HiddenInlineInput: React.FC<HiddenInlineInputProps> = ({
  words,
  startIndex = 0,
  onWordCommit,
  onDone,
  markers = [],
}) => {
  const [index, setIndex] = React.useState(startIndex);
  const [typed, setTyped] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [isComposing, setIsComposing] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [liveRegionMessage, setLiveRegionMessage] = React.useState('');

  const hiddenInputRef = React.useRef<HTMLInputElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

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
  }, [words, startIndex]);

  React.useEffect(() => {
    resetInput();
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
      setLiveRegionMessage(`Correcto: ${currentWord}`);
      onWordCommit?.({ index, target: currentWord, typed: attempt, correct: true });
      if (index + 1 >= words.length) {
        setLiveRegionMessage('Pasaje completo. ¡Buen trabajo!');
        onDone?.();
      } else {
        setIndex(prev => prev + 1);
      }
      resetInput();
      return;
    }

    const partial = sanitizePartialWord(raw);
    if (input) input.value = partial;
    setTyped(partial);
    setError(true);
    setLiveRegionMessage('La palabra no coincide. Corrige antes de continuar.');
  }, [currentWord, index, normalizeForCommit, onDone, onWordCommit, resetInput, typed, words.length]);

  const appendChar = React.useCallback((ch: string) => {
    setTyped(prev => {
      const next = sanitizePartialWord(prev + ch);
      const input = hiddenInputRef.current;
      if (input) input.value = next;
      return next;
    });
    setError(false);
  }, []);

  const removeLastChar = React.useCallback(() => {
    setTyped(prev => {
      const trimmed = prev.slice(0, -1);
      const sanitized = sanitizePartialWord(trimmed);
      const input = hiddenInputRef.current;
      if (input) input.value = sanitized;
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
  }, []);

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

  const completedWords = React.useMemo(() => {
    if (index <= 0) return [] as Array<{ word: string; marker?: string }>;
    return words.slice(0, index).map((word, wordIndex) => ({ word, marker: markersMap.get(wordIndex) }));
  }, [index, markersMap, words]);

  const currentMarker = markersMap.get(index);

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
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
            {completedWords.length ? (
              <div className="flex flex-wrap gap-2 text-lg font-semibold leading-snug">
                {completedWords.map(({ word, marker }, wordIndex) => (
                  <span key={`${word}-${wordIndex}`} className="inline-flex items-baseline gap-1">
                    {marker && (
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 select-none align-top">
                        {marker}
                      </span>
                    )}
                    <span className="text-neutral-900 dark:text-neutral-100">{word}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Las palabras correctas aparecerán aquí a medida que avances.
              </div>
            )}
          </div>

          <div
            className={`rounded-lg border p-4 transition-colors duration-150 ${
              error
                ? 'border-red-500/60 bg-red-500/10 dark:border-red-900/60 dark:bg-red-900/20'
                : 'border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Siguiente palabra
            </p>
            <div className="mt-3 flex items-center gap-2 text-lg font-semibold">
              {currentMarker && (
                <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 select-none align-top">
                  {currentMarker}
                </span>
              )}
              <span className={error ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}>
                {typed || (
                  <span className="text-sm font-normal text-neutral-400 dark:text-neutral-500">
                    Escribe la siguiente palabra y presiona espacio…
                  </span>
                )}
              </span>
              {focused && (
                <span
                  aria-hidden
                  className={`ml-1 inline-block h-6 w-[2px] animate-blink ${
                    error ? 'bg-red-500 dark:bg-red-400' : 'bg-neutral-900 dark:bg-neutral-100'
                  }`}
                />
              )}
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                La palabra debe coincidir exactamente antes de continuar.
              </p>
            )}
          </div>
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
          }}
        />
      </div>
    </>
  );
};

