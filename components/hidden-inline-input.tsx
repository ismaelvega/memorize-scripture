"use client";
import * as React from 'react';
import { normalizeForCompare } from '../lib/utils';

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
  onRequestCorrection?: (args: { index: number; target: string; typed: string; element: HTMLElement | null }) => void;
  canRequestCorrection?: (args: { index: number; target: string; typed: string }) => boolean;
}

export interface HiddenInlineInputHandle {
  applyCorrection: (args: {
    index: number;
    displayWord?: string;
    correctedManually?: boolean;
  }) => void;
}

type WordResult = { typed: string; correct: boolean; correctedManually?: boolean };

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

export const HiddenInlineInput = React.forwardRef<HiddenInlineInputHandle, HiddenInlineInputProps>(({
  words,
  startIndex = 0,
  onWordCommit,
  onDone,
  markers = [],
  onFirstInteraction,
  onRequestCorrection,
  canRequestCorrection,
}, ref) => {
  const [index, setIndex] = React.useState(startIndex);
  const [typed, setTyped] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [isComposing, setIsComposing] = React.useState(false);
  const [liveRegionMessage, setLiveRegionMessage] = React.useState('');
  const [results, setResults] = React.useState<WordResult[]>([]);

  const hiddenInputRef = React.useRef<HTMLInputElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const currentWordRef = React.useRef<HTMLSpanElement | null>(null);
  const focusCurrentInput = React.useCallback(() => {
    const input = hiddenInputRef.current;
    if (!input) return;
    try {
      input.focus({ preventScroll: true });
    } catch {
      // ignore focus errors
    }
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({
      applyCorrection: ({ index: targetIndex, displayWord, correctedManually = false }) => {
        if (typeof targetIndex !== 'number' || targetIndex < 0 || targetIndex >= words.length) {
          return;
        }
        setResults(prev => {
          const next = [...prev];
          const existing = next[targetIndex];
          const typedValue =
            displayWord ??
            existing?.typed ??
            words[targetIndex] ??
            '';
          next[targetIndex] = {
            typed: typedValue,
            correct: true,
            correctedManually,
          };
          return next;
        });
        focusCurrentInput();
      },
    }),
    [words, focusCurrentInput]
  );

  const updateHiddenInputPosition = React.useCallback(() => {
    const input = hiddenInputRef.current;
    if (!input) return;

    const container = containerRef.current;
    const word = currentWordRef.current;

    if (!container || !word || typeof window === 'undefined') {
      input.style.transform = 'translate3d(0px, 0px, 0px)';
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const wordRect = word.getBoundingClientRect();
    const offsetTop = wordRect.top - containerRect.top;
    const offsetLeft = wordRect.left - containerRect.left;

    input.style.transform = `translate3d(${Math.max(0, offsetLeft)}px, ${Math.max(0, offsetTop)}px, 0px)`;
  }, []);

  const wordStartRef = React.useRef<number | null>(null);
  const hasAnnouncedStartRef = React.useRef(false);
  const lastScrollIntentRef = React.useRef<'character' | 'backspace' | 'commit' | 'focus' | null>(null);

  const currentWord = words[index] ?? '';

  const markersMap = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const marker of markers) {
      map.set(marker.index, marker.label);
    }
    return map;
  }, [markers]);

  const setCurrentWordElement = React.useCallback((node: HTMLSpanElement | null) => {
    currentWordRef.current = node;
    updateHiddenInputPosition();
  }, [updateHiddenInputPosition]);

  const handleIncorrectWordClick = React.useCallback((wordIndex: number, typedWord: string, element: HTMLElement | null) => {
    if (!onRequestCorrection) return;
    const targetWord = words[wordIndex];
    if (!targetWord) return;
    if (canRequestCorrection && !canRequestCorrection({ index: wordIndex, target: targetWord, typed: typedWord })) {
      return;
    }
    onRequestCorrection({ index: wordIndex, target: targetWord, typed: typedWord, element });
  }, [onRequestCorrection, words, canRequestCorrection]);

  const resetInput = React.useCallback(() => {
    setTyped('');
    const input = hiddenInputRef.current;
    if (input) input.value = '';
  }, []);

  React.useEffect(() => {
    const safeStart = Math.min(startIndex, Math.max(words.length - 1, 0));
    setIndex(safeStart);
    setTyped('');
    const input = hiddenInputRef.current;
    if (input) input.value = '';
    wordStartRef.current = null;
    hasAnnouncedStartRef.current = false;
    setResults([]);
  }, [words, startIndex]);

  React.useEffect(() => {
    resetInput();
    wordStartRef.current = null;
  }, [index, resetInput]);

  React.useEffect(() => {
    updateHiddenInputPosition();
  }, [index, typed, words, updateHiddenInputPosition]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleViewportChange = () => {
      updateHiddenInputPosition();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', handleViewportChange);
    viewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      viewport?.removeEventListener('resize', handleViewportChange);
      viewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [updateHiddenInputPosition]);

  React.useEffect(() => {
    const input = hiddenInputRef.current;
    if (input) {
      lastScrollIntentRef.current = 'focus';
      input.focus({ preventScroll: true });
      setFocused(true);
    }
  }, [focusCurrentInput]);

  React.useEffect(() => {
    const node = currentWordRef.current;
    if (!node || typeof window === 'undefined') {
      lastScrollIntentRef.current = null;
      return;
    }

    const intent = lastScrollIntentRef.current;
    if (!intent) {
      return;
    }

    const viewport = window.visualViewport;
    const viewportHeight = viewport?.height ?? window.innerHeight ?? document.documentElement.clientHeight ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const safeTop = viewportTop + 48;
    const bufferRatio = intent === 'character' ? 0.32 : intent === 'focus' ? 0.28 : 0.24;
    const dynamicBuffer = viewportHeight ? Math.min(260, Math.max(140, viewportHeight * bufferRatio)) : 200;
    let safeBottom = viewportTop + viewportHeight - dynamicBuffer;
    if (!viewportHeight || safeBottom <= safeTop + 64) {
      safeBottom = viewportTop + viewportHeight - 96;
    }

    const rect = node.getBoundingClientRect();
    const isAboveSafe = rect.top < safeTop;
    const isBelowSafe = rect.bottom > safeBottom;

    const shouldScrollDown = isBelowSafe && intent !== 'backspace';
    const shouldScrollUp = isAboveSafe && intent === 'focus';

    if (!shouldScrollDown && !shouldScrollUp) {
      lastScrollIntentRef.current = null;
      return;
    }

    const mediaQueryList = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : undefined;
    const behavior: ScrollBehavior = mediaQueryList?.matches ? 'auto' : 'smooth';
    const block: ScrollLogicalPosition = shouldScrollDown ? 'end' : 'start';

    const rafId = window.requestAnimationFrame(() => {
      node.scrollIntoView({
        block,
        inline: 'nearest',
        behavior,
      });
    });

    lastScrollIntentRef.current = null;
    return () => window.cancelAnimationFrame(rafId);
  }, [index, focused, typed]);

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

  const commitWord = React.useCallback((reason: 'auto' | 'whitespace' | 'manual' = 'manual') => {
    const input = hiddenInputRef.current;
    const raw = input?.value ?? typed;
    if (!raw.trim() || !currentWord) return;

    lastScrollIntentRef.current = reason === 'auto' ? 'character' : 'commit';

    const normalized = normalizeForCommit(raw);
    const target = currentWord.normalize('NFC');
    const attempt = normalized.normalize('NFC');
    const targetWithoutPunct = stripTrailingPunct(target);
    const matchesTarget = attempt === target;
    const matchesWithoutPunct = targetWithoutPunct && attempt === targetWithoutPunct;
    const normalizedAttempt = normalizeForCompare(attempt);
    const normalizedTarget = normalizeForCompare(target);
    const success = Boolean(matchesTarget || matchesWithoutPunct || normalizedAttempt === normalizedTarget);
    const attemptDisplay = sanitizePartialWord(raw) || attempt || raw.trim();
    const durationMs = wordStartRef.current ? Date.now() - wordStartRef.current : 0;
    const mistakesForWord = success ? 0 : 1;

    setResults(prev => {
      const next = [...prev];
      next[index] = {
        typed: success ? currentWord : attemptDisplay,
        correct: success,
        correctedManually: false,
      };
      return next;
    });

    if (success) {
      setLiveRegionMessage(`Correcto: ${currentWord}`);
    } else {
      setLiveRegionMessage(`Incorrecto: ${attemptDisplay || 'sin palabra'}. Correcto: ${currentWord}.`);
    }

    onWordCommit?.({
      index,
      target: currentWord,
      typed: attemptDisplay,
      correct: success,
      mistakes: mistakesForWord,
      durationMs,
    });

    if (index + 1 >= words.length) {
      setLiveRegionMessage('Pasaje completo. ¡Buen trabajo!');
      onDone?.();
    } else {
      setIndex(prev => prev + 1);
    }
    wordStartRef.current = null;
    resetInput();
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
    lastScrollIntentRef.current = 'character';
    const input = hiddenInputRef.current;
    const currentValue = input?.value ?? typed;
    const next = sanitizePartialWord(`${currentValue}${ch}`);
    if (input) input.value = next;
    setTyped(next);
    ensureStartRegistered();

    if (currentWord) {
      const nextNormalized = next.normalize('NFC');
      const targetNormalized = currentWord.normalize('NFC');
      const targetWithoutPunct = stripTrailingPunct(targetNormalized);
      const matchesTarget = nextNormalized === targetNormalized;
      const matchesWithoutPunct = targetWithoutPunct && nextNormalized === targetWithoutPunct;
      const normalizedAttempt = normalizeForCompare(nextNormalized);
      const normalizedTarget = normalizeForCompare(targetNormalized);
      if (nextNormalized && (matchesTarget || matchesWithoutPunct || normalizedAttempt === normalizedTarget)) {
        commitWord('auto');
      }
    }
  }, [typed, currentWord, commitWord, ensureStartRegistered]);

  const removeLastChar = React.useCallback(() => {
    lastScrollIntentRef.current = 'backspace';
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
  }, []);

  const handleInput = React.useCallback((event: React.FormEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value || '';
    const sanitized = sanitizePartialWord(rawValue);
    const appendedWhitespace = /\s$/.test(rawValue);
    input.value = sanitized;
    if (!appendedWhitespace) {
      lastScrollIntentRef.current = 'character';
    }
    setTyped(sanitized);
    ensureStartRegistered();
    if (appendedWhitespace) {
      commitWord('whitespace');
      return;
    }
    if (currentWord) {
      const sanitizedNormalized = sanitized.normalize('NFC');
      const targetNormalized = currentWord.normalize('NFC');
      const targetWithoutPunct = stripTrailingPunct(targetNormalized);
      const matchesTarget = sanitizedNormalized === targetNormalized;
      const matchesWithoutPunct = targetWithoutPunct && sanitizedNormalized === targetWithoutPunct;
      // Accent- and case-insensitive comparison for auto-commit
      const normalizedAttempt = normalizeForCompare(sanitizedNormalized);
      const normalizedTarget = normalizeForCompare(targetNormalized);
      if (sanitizedNormalized && (matchesTarget || matchesWithoutPunct || normalizedAttempt === normalizedTarget)) {
        commitWord('auto');
      }
    }
  }, [currentWord, commitWord, ensureStartRegistered]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;

    if (event.key === ' ') {
      event.preventDefault();
      commitWord('whitespace');
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      commitWord('manual');
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
          lastScrollIntentRef.current = isPrintable ? 'character' : event.key === 'Backspace' ? 'backspace' : 'focus';
          input.focus({ preventScroll: true });
          setFocused(true);
          if (isPrintable) appendChar(event.key);
          else if (event.key === ' ') commitWord('whitespace');
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
            lastScrollIntentRef.current = 'focus';
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
            lastScrollIntentRef.current = isPrintable ? 'character' : event.key === 'Backspace' ? 'backspace' : 'focus';
            input.focus({ preventScroll: true });
            setFocused(true);
            if (isPrintable) appendChar(event.key);
            else if (event.key === ' ') commitWord('whitespace');
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
                const result = results[wordIndex];

                if (isCompleted) {
                  const isCorrect = result?.correct ?? true;
                  const typedWord = result?.typed ?? word;
                  const correctedManually = Boolean(result?.correctedManually);
                  const correctedLabel = correctedManually ? 'Corrección manual aplicada' : undefined;
                  const correctWordClass = correctedManually
                    ? 'text-neutral-900 dark:text-neutral-100 underline decoration-dotted decoration-amber-500 underline-offset-4'
                    : 'text-neutral-900 dark:text-neutral-100';
                  const allowCorrection = Boolean(
                    onRequestCorrection &&
                    (!canRequestCorrection || canRequestCorrection({ index: wordIndex, target: word, typed: typedWord }))
                  );
                  return (
                    <span key={wordIndex} className="inline-flex items-baseline gap-2">
                      {marker && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 select-none align-top">
                          {marker}
                        </span>
                      )}
                      {isCorrect ? (
                        <span className={correctWordClass} title={correctedLabel}>
                          {word}
                          {correctedManually && (
                            <span className="sr-only">Corregido con sugerencias</span>
                          )}
                        </span>
                      ) : allowCorrection ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleIncorrectWordClick(wordIndex, typedWord, event.currentTarget);
                          }}
                          className="inline-flex items-center gap-2 rounded-md border border-dashed border-red-300/70 px-1.5 py-0.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:border-red-500/50 dark:text-red-300 dark:hover:bg-red-900/30 dark:focus-visible:ring-offset-0"
                          title="Toca para corregir esta palabra"
                        >
                          <span className="text-red-600 dark:text-red-400 line-through">{typedWord}</span>
                          <span aria-hidden className="text-neutral-400 dark:text-neutral-500">→</span>
                          <span className="text-neutral-900 dark:text-neutral-100">{word}</span>
                          <span className="text-[10px] uppercase tracking-wide text-red-500 dark:text-red-300">
                            Corregir
                          </span>
                          <span className="sr-only">{`Incorrecto: ${typedWord}. Correcto: ${word}. Pulsa para corregir.`}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-red-600 dark:text-red-400 line-through">{typedWord}</span>
                          <span aria-hidden className="text-neutral-400 dark:text-neutral-500">→</span>
                          <span className="text-neutral-900 dark:text-neutral-100">{word}</span>
                          <span className="sr-only">{`Incorrecto: ${typedWord}. Correcto: ${word}.`}</span>
                        </span>
                      )}
                    </span>
                  );
                }

                if (isCurrent) {
                  return (
                    <span
                      key={wordIndex}
                      ref={setCurrentWordElement}
                      className="inline-flex items-baseline gap-1"
                    >
                      {marker && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 select-none align-top">
                          {marker}
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-1 border border-neutral-200 dark:border-neutral-700/80 rounded-md font-semibold text-neutral-900 dark:text-neutral-100 bg-white/60 dark:bg-neutral-900/40">
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
                            className="ml-1 inline-block h-[1.4em] w-[2px] animate-blink bg-neutral-900 dark:bg-neutral-100"
                          />
                        )}
                      </span>
                      <span className="sr-only">Palabra actual; escribe y presiona espacio para validar.</span>
                    </span>
                  );
                }

                return (
                  <span key={wordIndex} className="inline-flex items-baseline gap-1">
                    {marker && (
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 select-none align-top">
                        {marker}
                      </span>
                    )}
                    <span aria-hidden className="tracking-widest text-neutral-300 dark:text-neutral-700 select-none">
                      ....
                    </span>
                    <span className="sr-only">Palabra pendiente</span>
                  </span>
                );
              })
            )}
          </div>
        </div>

        <input
          ref={hiddenInputRef}
          className="absolute left-0 top-0 h-px w-px opacity-0 pointer-events-none"
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
            if (sanitized) {
              lastScrollIntentRef.current = 'character';
            }
            ensureStartRegistered();
            if (currentWord) {
              const sanitizedNormalized = sanitized.normalize('NFC');
              const targetNormalized = currentWord.normalize('NFC');
              const targetWithoutPunct = stripTrailingPunct(targetNormalized);
              const matchesTarget = sanitizedNormalized === targetNormalized;
              const matchesWithoutPunct = targetWithoutPunct && sanitizedNormalized === targetWithoutPunct;
              // Accent- and case-insensitive comparison for auto-commit after composition
              const normalizedAttempt = normalizeForCompare(sanitizedNormalized);
              const normalizedTarget = normalizeForCompare(targetNormalized);
              if (sanitizedNormalized && (matchesTarget || matchesWithoutPunct || normalizedAttempt === normalizedTarget)) {
                commitWord('auto');
              }
            }
          }}
        />
      </div>
    </>
  );
});

HiddenInlineInput.displayName = 'HiddenInlineInput';
