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
  if (state === 'past-correct') {
    return (
      <span className="text-emerald-600 text-lg md:text-xl">
        {word}
      </span>
    );
  }

  if (state === 'past-incorrect') {
    return (
      <span className="text-destructive text-lg md:text-xl">
        {word}
      </span>
    );
  }

  if (state === 'upcoming') {
    return (
      <span className="text-muted-foreground/60 text-lg md:text-xl">
        {word}
      </span>
    );
  }

  // Active word - split into parts
  const firstErrorIdx = typed.split('').findIndex((char, i) => char !== word[i]);
  const hasError = firstErrorIdx >= 0;

  const correctPart = hasError ? typed.slice(0, firstErrorIdx) : typed;
  const errorPart = hasError ? typed.slice(firstErrorIdx) : '';
  const remaining = word.slice(typed.length);

  return (
    <span className="relative text-lg md:text-xl font-semibold scale-105 inline-block">
      {/* Correct part */}
      {correctPart && (
        <span className="text-foreground">
          {correctPart}
        </span>
      )}

      {/* Error part */}
      {errorPart && (
        <span className="text-destructive underline decoration-destructive/50 decoration-2 underline-offset-2">
          {errorPart}
        </span>
      )}

      {/* Caret */}
      {focused && (
        <span
          className="inline-block w-[2px] h-[1.5em] bg-foreground animate-blink absolute"
          style={{ left: `${(correctPart.length + errorPart.length) * 0.6}em` }}
        />
      )}

      {/* Remaining part */}
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
        console.log('[InlineInput] window.keydown → focusing hidden input', { key: e.key, isPrintable });
        input.focus();
        // Reflect focus state for caret immediately
        flushSync(() => setFocused(true));
        // Inject the first printable key so it is not dropped
        if (isPrintable && e.key !== ' ') {
          e.preventDefault();
          const next = (input.value || '') + e.key;
          flushSync(() => setTyped(next));
          input.value = next;
          console.log('[InlineInput] window.keydown → injected first printable key', { next });
        }
      }
    }
    window.addEventListener('keydown', onDocKeyDown);
    return () => window.removeEventListener('keydown', onDocKeyDown);
  }, [isComposing]);

  // Clear typed state when word changes (let browser manage input value)
  React.useEffect(() => {
    console.log('[InlineInput] index changed', { index, currentWord });
    setTyped('');
  }, [index]);

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

  const commitWord = React.useCallback((typedText: string) => {
    const correct = typedText === currentWord;
    console.log('[InlineInput] commitWord', { index, target: currentWord, typed: typedText, correct });

    // Update word state
    setWordStates(prev => {
      const newStates = [...prev];
      newStates[index] = correct ? 'past-correct' : 'past-incorrect';
      if (index + 1 < words.length) {
        newStates[index + 1] = 'active';
      }
      console.log('[InlineInput] wordStates updated', { at: index, next: index + 1, stateAt: newStates[index], stateNext: newStates[index + 1] });
      return newStates;
    });

    // Accessibility announcement
    setLiveRegionMessage(correct ? `Correct: ${currentWord}` : `Incorrect: expected ${currentWord}, typed ${typedText}`);

    // Callback
    onWordCommit?.({
      index,
      target: currentWord,
      typed: typedText,
      correct
    });

    // Clear input and advance or complete
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = '';
    }

    if (index + 1 >= words.length) {
      setLiveRegionMessage('Passage completed!');
      onDone?.();
      console.log('[InlineInput] passage completed');
    } else {
      setIndex(prev => {
        const next = prev + 1;
        console.log('[InlineInput] advance index', { prev, next });
        return next;
      });
      setTyped('');
    }
  }, [index, currentWord, words.length, onWordCommit, onDone]);

  const handleInput = React.useCallback((e: React.FormEvent<HTMLInputElement>) => {
    if (isComposing) return;

    const input = e.target as HTMLInputElement;
    const value = input.value;

    console.log('[InlineInput] input event', { value, currentTyped: typed });

    // Update typed state with immediate re-render
    flushSync(() => {
      setTyped(value);
    });

    // Don't clear the input - let it accumulate naturally
  }, [isComposing, typed]);

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isComposing) return;

    const input = e.target as HTMLInputElement;
    const value = input.value;

    console.log('[InlineInput] change event', { value, currentTyped: typed });

    // Update typed state with immediate re-render
    flushSync(() => {
      setTyped(value);
    });
  }, [isComposing, typed]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;

    const input = e.target as HTMLInputElement;

    console.log('[InlineInput] input.keydown', { key: e.key, inputValue: input.value, currentTyped: typed });

    if (e.key === ' ') {
      e.preventDefault();
      console.log('[InlineInput] input.space → commit');
      commitWord(typed);
    } else if (e.key === 'Backspace') {
      if (typed.length === 0 && !lockPastWords && index > 0) {
        e.preventDefault();
        // Move to previous word
        setIndex(prev => {
          const next = prev - 1;
          console.log('[InlineInput] backspace nav to previous', { prev, next });
          return next;
        });
        setWordStates(prev => {
          const newStates = [...prev];
          newStates[index] = 'upcoming';
          newStates[index - 1] = 'active';
          console.log('[InlineInput] wordStates backspace nav', { from: index, to: index - 1 });
          return newStates;
        });
        setTyped('');
        input.value = '';
      }
      // Let backspace work normally for removing characters
    }
    // Removed fallback letter handling - onInput/onChange with flushSync should handle it
  }, [typed, index, lockPastWords, commitWord, isComposing]);


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

            // Handle printable characters immediately so the first char isn't lost
            if (isPrintable && e.key !== ' ') {
              e.preventDefault();
              const next = (input.value || '') + e.key;
              flushSync(() => setTyped(next));
              input.value = next;
              console.log('[InlineInput] container.keydown → injected printable', { next });
              return;
            }

            // If the first key pressed is Backspace, allow navigation to previous word
            if (e.key === 'Backspace') {
              e.preventDefault();
              if (!lockPastWords && index > 0) {
                setIndex((prev) => prev - 1);
                setWordStates((prev) => {
                  const ns = [...prev];
                  ns[index] = 'upcoming';
                  ns[index - 1] = 'active';
                  return ns;
                });
                setTyped('');
                input.value = '';
                console.log('[InlineInput] container.keydown backspace (pre-focus) → navigate previous');
              }
              return;
            }

            // If space is the first key, just focus input and do not commit
            if (e.key === ' ') {
              e.preventDefault();
              // Do not commit here; require a second space once input is focused
              console.log('[InlineInput] container.keydown space (pre-focus) → focus only');
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
