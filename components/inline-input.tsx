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
      hiddenInputRef.current.focus();
    }
  }, []);

  // Clear typed state when word changes (let browser manage input value)
  React.useEffect(() => {
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

    // Update word state
    setWordStates(prev => {
      const newStates = [...prev];
      newStates[index] = correct ? 'past-correct' : 'past-incorrect';
      if (index + 1 < words.length) {
        newStates[index + 1] = 'active';
      }
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
    } else {
      setIndex(prev => prev + 1);
      setTyped('');
    }
  }, [index, currentWord, words.length, onWordCommit, onDone]);

  const handleInput = React.useCallback((e: React.FormEvent<HTMLInputElement>) => {
    if (isComposing) return;

    const input = e.target as HTMLInputElement;
    const value = input.value;

    console.log('🔍 handleInput fired:', { value, currentTyped: typed, eventType: 'input' });

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

    console.log('📝 handleChange fired:', { value, currentTyped: typed, eventType: 'change' });

    // Update typed state with immediate re-render
    flushSync(() => {
      setTyped(value);
    });
  }, [isComposing, typed]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;

    const input = e.target as HTMLInputElement;

    console.log('⌨️ handleKeyDown fired:', { key: e.key, inputValue: input.value, currentTyped: typed });

    if (e.key === ' ') {
      e.preventDefault();
      commitWord(typed);
    } else if (e.key === 'Backspace') {
      if (typed.length === 0 && !lockPastWords && index > 0) {
        e.preventDefault();
        // Move to previous word
        setIndex(prev => prev - 1);
        setWordStates(prev => {
          const newStates = [...prev];
          newStates[index] = 'upcoming';
          newStates[index - 1] = 'active';
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
          }
        }}
        onKeyDown={(e) => {
          // Fallback: if hidden input doesn't work, try to handle directly
          if (!focused && hiddenInputRef.current) {
            hiddenInputRef.current.focus();
          }
        }}
      >
      {/* Hidden input for mobile keyboard */}
      <input
        ref={hiddenInputRef}
        className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onInput={handleInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
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