"use client";
import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InlineInput } from '@/components/inline-input';
import type { Verse } from '../lib/types';

interface ChillModeCardProps {
  verse: Verse | null;
  onBrowseVerses?: () => void;
}

export const ChillModeCard: React.FC<ChillModeCardProps> = ({ verse, onBrowseVerses }) => {
  const [wordsArray, setWordsArray] = React.useState<string[]>([]);
  const [progress, setProgress] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [completedWords, setCompletedWords] = React.useState(0);

  // Process verse text into words with punctuation preservation
  React.useEffect(() => {
    if (!verse) return;

    // Split text into words while preserving punctuation attached to words
    const words = verse.text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordsArray(words);
    setProgress(0);
    setIsCompleted(false);
    setCompletedWords(0);
  }, [verse]);

  if (!verse) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-4xl mb-4">☕</div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Ready to Read & Chill?
            </h3>
            <p className="text-neutral-500 mb-6">
              Choose a verse to start your relaxed reading experience
            </p>
            {onBrowseVerses && (
              <Button
                onClick={onBrowseVerses}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Browse Verses
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleWordCommit = React.useCallback((args: {
    index: number;
    target: string;
    typed: string;
    correct: boolean;
  }) => {
    setCompletedWords(args.index + 1);
    setProgress(wordsArray.length > 0 ? ((args.index + 1) / wordsArray.length) * 100 : 0);
  }, [wordsArray.length]);

  const handleDone = React.useCallback(() => {
    setIsCompleted(true);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {verse.reference}
        </h3>
        <p className="text-sm text-neutral-500 mt-1">Progressive Reading Mode</p>
      </div>

      {/* Inline Input Section */}
      <div className="flex-1 mb-4">
        {isCompleted ? (
          // Show complete passage when finished
          <Card>
            <CardContent className="p-6">
              <div className="text-xl leading-relaxed text-neutral-900 dark:text-neutral-100">
                {verse.text}
              </div>
            </CardContent>
          </Card>
        ) : (
          // Show inline input
          <div className="space-y-4">
            <div className="text-center text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Type each word as it appears. Press space to move to the next word.
            </div>
            <InlineInput
              words={wordsArray}
              onWordCommit={handleWordCommit}
              onDone={handleDone}
              lockPastWords={false}
            />
          </div>
        )}
      </div>

      {/* Progress and Status */}
      <div className="space-y-4">
        {!isCompleted ? (
          <>
            {/* Progress */}
            <div className="text-center text-sm text-neutral-500">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span>{completedWords}</span>
                <span>/</span>
                <span>{wordsArray.length}</span>
                <span>words completed</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          // Completion State
          <div className="text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Passage Complete!
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              You've successfully read through the entire passage word by word.
            </p>
            {onBrowseVerses && (
              <Button
                onClick={onBrowseVerses}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Read Another Passage
              </Button>
            )}
          </div>
        )}

        {/* Helpful Tips */}
        <div className="text-center text-xs text-neutral-400 space-y-1">
          <p>✨ Correct characters appear in normal color, errors in red</p>
          <p>🌟 Use backspace to edit or go back to previous words</p>
        </div>
      </div>
    </div>
  );
};