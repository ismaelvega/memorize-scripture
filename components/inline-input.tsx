"use client";
import * as React from 'react';
import { flushSync } from 'react-dom';

type WordState = 'past-correct' | 'past-incorrect' | 'active' | 'upcoming';

interface InlineInputProps {
  words: string[];
  startIndex?: number;
  onWordCommit?: (args: {
    index: number;
    target: string;
    typed: string;
    correct: boolean;
  }) => void;
  onDone?: () => void;
  lockPastWords?: boolean;
}

interface WordTokenProps {
  word: string;
  state: WordState;
  typed?: string;
  focused?: boolean;
}

const WordToken: React.FC<WordTokenProps> = ({ word, state, typed = '', focused = false }) => {
  // Past words: show normal foreground, bold. No red/green grading.
  if (state === 'past-correct' || state === 'past-incorrect') {
    return (
      <span className="text-foreground text-lg md:text-xl font-semibold">
        {word}
      </span>
    );
  }

  // Upcoming words: gray placeholder style
  if (state === 'upcoming') {
    return (
      <span className="text-muted-foreground/60 text-lg md:text-xl">
        {word}
      </span>
    );
  }

  // Active word: typed part in bold, remaining in gray. No error styling.
  const correctPart = typed;
  const remaining = word.slice(typed.length);

  return (
    <span className="relative text-lg md:text-xl font-semibold inline-block">
      {correctPart && (
        <span className="text-foreground">
          {correctPart}
        </span>
      )}
      {focused && (
        <span
          className="inline-block w-[2px] h-[1.5em] bg-foreground animate-blink absolute"
          style={{ left: `${correctPart.length * 0.6}em` }}
        />
      )}
      {remaining && (
        <span className="text-muted-foreground/50">
          {remaining}
        </span>
      )}
    </span>
  );
};

export const InlineInput: React.FC<InlineInputProps> = ({
  words,
  startIndex = 0,
  onWordCommit,
  onDone,
  lockPastWords = false
}) => {
  const [index, setIndex] = React.useState(startIndex);
  const [typed, setTyped] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [isComposing, setIsComposing] = React.useState(false);
  const [wordStates, setWordStates] = React.useState<WordState[]>(
    words.map((_, i) => i < startIndex ? 'past-correct' : i === startIndex ? 'active' : 'upcoming')
  );
  const [liveRegionMessage, setLiveRegionMessage] = React.useState('');

  const containerRef = React.useRef<HTMLDivElement>(null);
  const hiddenInputRef = React.useRef<HTMLInputElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const activeWordRef = React.useRef<HTMLSpanElement>(null);

  const currentWord = words[index] || '';

  // Accent- and case-insensitive folding (hardcoded: accent-sensitive off)
  const fold = React.useCallback((s: string) => s.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase(), []);

  // Sync internal state when words arrive or change length
  React.useEffect(() => {
    if (words.length === 0) return;
    const hasActive = wordStates.includes('active');
    const lengthsDiffer = wordStates.length !== words.length;
    if (lengthsDiffer || !hasActive) {
      const safeStart = Math.min(startIndex, Math.max(0, words.length - 1));
      setIndex(safeStart);
      setTyped('');
      setWordStates(
        words.map((_, i) => (i < safeStart ? 'past-correct' : i === safeStart ? 'active' : 'upcoming'))
      );
      // Debug log to understand initialization timing
      console.log('[InlineInput] sync from words change', { wordsLen: words.length, safeStart });
    }
  }, [words, startIndex]);

  // Auto-scroll active word to center
  React.useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeElement = activeWordRef.current;

      requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();
        const containerCenter = containerRect.width / 2;
        const activeCenter = activeRect.left - containerRect.left + activeRect.width / 2;
        const offset = containerCenter - activeCenter;

        if (trackRef.current) {
          const currentTransform = trackRef.current.style.transform;
          const currentX = currentTransform.includes('translateX')
            ? parseFloat(currentTransform.match(/translateX\(([^)]+)\)/)?.[1] || '0')
            : 0;

          trackRef.current.style.transform = `translateX(${currentX + offset}px)`;
          trackRef.current.style.transition = 'transform 0.3s ease-out';
        }
      });
    }
  }, [index]);

  // Focus input on mount
  React.useEffect(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus({ preventScroll: true });
      // Ensure caret shows immediately even if the browser delays focus events
      setFocused(true);
      console.log('[InlineInput] mount → focused hidden input, caret visible');
    } else {
      console.log('[InlineInput] mount → hidden input ref missing');
    }
  }, []);

  // Commit current word when fully and correctly typed
  const commitWord = React.useCallback((typedText: string) => {
    const correct = typedText.normalize('NFC') === currentWord.normalize('NFC');
    console.log('[InlineInput] commitWord', { index, target: currentWord, typed: typedText, correct });

    setWordStates(prev => {
      const newStates = [...prev];
      newStates[index] = 'past-correct';
      if (index + 1 < words.length) newStates[index + 1] = 'active';
      return newStates;
    });

    setLiveRegionMessage(`OK: ${currentWord}`);

    onWordCommit?.({ index, target: currentWord, typed: typedText, correct });

    if (hiddenInputRef.current) hiddenInputRef.current.value = '';

    if (index + 1 >= words.length) {
      setLiveRegionMessage('Passage completed!');
      onDone?.();
    } else {
      setIndex(prev => prev + 1);
      setTyped('');
    }
  }, [currentWord, index, onDone, onWordCommit, words.length]);

  // If the remaining characters are only punctuation/symbols, auto-append them.
  const autoCompleteTrailingPunct = React.useCallback((next: string) => {
    const remainder = currentWord.slice(next.length);
    if (!remainder) return next;
    // Treat all non-letter/non-digit characters as trailing punctuation we can auto-append
    const isOnlyPunct = /^[^\p{L}\p{N}]+$/u.test(remainder);
    return isOnlyPunct ? currentWord : next;
  }, [currentWord]);

  // Normalize raw keyboard text (including suggestions) for comparison
  // - Convert NBSP to space
  // - Trim leading spaces
  // - Take only the first token before any whitespace (mobile often adds a space)
  // - Auto-complete trailing punctuation
  const normalizeToWord = React.useCallback((raw: string) => {
    const spaceFixed = (raw || '').replace(/\u00A0/g, ' ');
    const noLeading = spaceFixed.replace(/^\s+/, '');
    const firstToken = noLeading.split(/\s/)[0] || '';
    const nfc = firstToken.normalize('NFC');
    return autoCompleteTrailingPunct(nfc);
  }, [autoCompleteTrailingPunct]);

  // Insert a single character only if it matches the next expected char
  const insertChar = React.useCallback((ch: string) => {
    if (isComposing) return;
    const input = hiddenInputRef.current;
    const expected = currentWord[typed.length] || '';
    // Accent- and case-insensitive match for the next character
    if (fold(ch) === fold(expected)) {
      // Always use the canonical character from currentWord
      let next = currentWord.slice(0, typed.length + 1);
      // Auto-complete any trailing punctuation after the last letter
      next = autoCompleteTrailingPunct(next);
      flushSync(() => setTyped(next));
      if (input) input.value = next;
      if (next.length === currentWord.length) commitWord(next);
    } else {
      console.log('[InlineInput] blocked incorrect char', { ch, expected });
    }
  }, [currentWord, typed, commitWord, isComposing, autoCompleteTrailingPunct, fold]);

  // Ensure first keystroke anywhere focuses the hidden input and is not lost.
  React.useEffect(() => {
    function onDocKeyDown(e: KeyboardEvent) {
      if (isComposing) return;
      const input = hiddenInputRef.current;
      if (!input) return;

      // Ignore if the user is typing in another editable control
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || '').toUpperCase();
      const isEditable = !!(target && (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'));
      if (isEditable) {
        console.log('[InlineInput] window.keydown ignored (editable target)', { key: e.key, tag });
      }
      if (isEditable) return;

      const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

      if (document.activeElement !== input) {
        input.focus();
        // Reflect focus state for caret immediately
        flushSync(() => setFocused(true));
        // Process first key under forced-correct rules
        if (isPrintable) {
          e.preventDefault();
          insertChar(e.key);
        } else if (e.key === ' ') {
          e.preventDefault();
          // Only commit if complete
          if (typed.length === currentWord.length) {
            commitWord(typed);
          }
        } else if (e.key === 'Backspace') {
          // Do not navigate to previous word; just focus input.
          e.preventDefault();
        }
      }
    }
    window.addEventListener('keydown', onDocKeyDown);
    return () => window.removeEventListener('keydown', onDocKeyDown);
  }, [isComposing, insertChar, typed, currentWord, commitWord, lockPastWords, index]);

  // Clear typed state when word changes (let browser manage input value)
  React.useEffect(() => {
    console.log('[InlineInput] index changed', { index, currentWord });
    setTyped('');
  }, [index]);

  // (moved commitWord and insertChar above the keydown window effect)

  // Handle viewport resize and orientation changes
  React.useEffect(() => {
    const handleResize = () => {
      // Recenter active word after resize
      if (activeWordRef.current && containerRef.current && trackRef.current) {
        requestAnimationFrame(() => {
          const container = containerRef.current!;
          const activeElement = activeWordRef.current!;
          const containerRect = container.getBoundingClientRect();
          const activeRect = activeElement.getBoundingClientRect();
          const containerCenter = containerRect.width / 2;
          const activeCenter = activeRect.left - containerRect.left + activeRect.width / 2;
          const offset = containerCenter - activeCenter;

          trackRef.current!.style.transform = `translateX(${offset}px)`;
        });
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [index]);

  const handleInput = React.useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    const raw = input.value || '';
    const expanded = normalizeToWord(raw);
    const cwN = currentWord.normalize('NFC');
    const cwFold = fold(cwN);
    const expFold = fold(expanded);

    if (cwFold.startsWith(expFold)) {
      const canonical = cwN.slice(0, expFold.length);
      flushSync(() => setTyped(canonical));
      input.value = canonical;
      if (expFold.length === cwFold.length) {
        commitWord(canonical);
      }
    } else {
      input.value = typed;
    }
  }, [normalizeToWord, currentWord, typed, commitWord, fold]);

  // No-op change handler; Android keyboards primarily emit input events we handle above.
  const handleChange = React.useCallback((_e: React.ChangeEvent<HTMLInputElement>) => {
    // Intentionally empty. We rely on onInput to process text.
  }, []);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;

    const input = e.target as HTMLInputElement;
    const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

    if (e.key === ' ') {
      // Only allow commit if the word is complete; otherwise block.
      e.preventDefault();
      // Attempt to auto-complete trailing punctuation and normalize suggestions before commit
      const inputVal = input.value || typed;
      const expanded = normalizeToWord(inputVal);
      const cwN = currentWord.normalize('NFC');
      const cwFold = fold(cwN);
      const expFold = fold(expanded);
      if (expFold.length === cwFold.length) {
        commitWord(cwN);
      }
      return;
    }

    if (isPrintable) {
      e.preventDefault();
      insertChar(e.key);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (typed.length > 0) {
        const next = typed.slice(0, -1);
        flushSync(() => setTyped(next));
        if (input) input.value = next;
      }
      // Do not navigate to previous word when at start.
      return;
    }
  }, [typed, currentWord, insertChar, commitWord, lockPastWords, index, isComposing]);

  


  const tokenStateFor = React.useCallback((i: number): WordState => {
    return wordStates[i] || 'upcoming';
  }, [wordStates]);

  return (
    <>
      {/* Live region for accessibility announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveRegionMessage}
      </div>

      <div
        ref={containerRef}
        role="textbox"
        aria-multiline="false"
        aria-label={`Type the passage word by word. Currently on word ${index + 1} of ${words.length}: ${currentWord}`}
        aria-description={focused ? `Typing position: ${typed.length} of ${currentWord.length} characters` : 'Tap to focus and start typing'}
        tabIndex={0}
        className="relative w-full overflow-hidden rounded-xl border bg-background px-4 py-6 focus:outline-none focus:ring-2 focus:ring-ring"
        onClick={() => {
          if (hiddenInputRef.current) {
            hiddenInputRef.current.focus();
            setFocused(true);
            console.log('[InlineInput] container.click → focus hidden input');
          }
        }}
        onKeyDown={(e) => {
          // Ensure the hidden input receives the first keystroke and handle
          // initial actions when it isn't focused yet (Chrome/Windows).
          const input = hiddenInputRef.current;
          if (!input) return;

          const activeIsInput = document.activeElement === input;
          const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
          console.log('[InlineInput] container.keydown', { key: e.key, activeIsInput, isPrintable, typed, inputValue: input.value });

          if (!activeIsInput) {
            input.focus();
            // Show caret immediately
            flushSync(() => setFocused(true));

            // Handle first keys with forced-correct rules
            if (isPrintable) {
              e.preventDefault();
              insertChar(e.key);
              return;
            }
            if (e.key === 'Backspace') {
              // Do not navigate to previous word anymore.
              e.preventDefault();
              return;
            }
            if (e.key === ' ') {
              e.preventDefault();
              if (typed.length === currentWord.length) {
                commitWord(typed);
              }
              return;
            }
          }
        }}
      >
      {/* Hidden input for mobile keyboard */}
      <input
        ref={hiddenInputRef}
        className="absolute left-0 top-0 w-px h-px opacity-0 pointer-events-none"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        onBlur={() => {
          setFocused(false);
          console.log('[InlineInput] hidden input blur');
        }}
        onFocus={() => {
          setFocused(true);
          console.log('[InlineInput] hidden input focus');
        }}
        onInput={handleInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => {
          setIsComposing(true);
          console.log('[InlineInput] compositionstart');
        }}
        onCompositionEnd={() => {
          setIsComposing(false);
          console.log('[InlineInput] compositionend');
          // Validate IME result as a correct prefix; otherwise rollback.
          const input = hiddenInputRef.current;
          if (input) {
            const val = input.value;
            const expanded = normalizeToWord(val);
            const cwN = currentWord.normalize('NFC');
            const cwFold = fold(cwN);
            const expFold = fold(expanded);
            if (cwFold.startsWith(expFold)) {
              const canonical = cwN.slice(0, expFold.length);
              flushSync(() => setTyped(canonical));
              if (expFold.length === cwFold.length) {
                commitWord(cwN);
              } else {
                input.value = canonical;
              }
            } else {
              input.value = typed;
            }
          }
        }}
      />

      {/* Scrolling track */}
      <div
        ref={trackRef}
        className="inline-flex whitespace-nowrap gap-3 items-baseline will-change-transform"
      >
        {words.map((word, i) => (
          <span
            key={i}
            ref={i === index ? activeWordRef : undefined}
          >
            <WordToken
              word={word}
              state={tokenStateFor(i)}
              typed={i === index ? typed : undefined}
              focused={i === index && focused}
            />
          </span>
        ))}
      </div>
    </div>
    </>
  );
};
