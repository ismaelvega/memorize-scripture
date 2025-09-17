"use client";
import * as React from 'react';
import { useReadingFlow } from './reading-flow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Coffee } from 'lucide-react';

interface ReadingBottomBarProps {
  buildVerse: () => void;
  canConfirmRange: boolean;
}

export const ReadingBottomBar: React.FC<ReadingBottomBarProps> = ({ buildVerse, canConfirmRange }) => {
  const { state, dispatch } = useReadingFlow();

  const showBackButton = state.step !== 'BOOK';
  const showConfirmButton = state.step === 'VERSE' && canConfirmRange;

  if (!showBackButton && !showConfirmButton) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {showBackButton ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: 'BACK' })}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        ) : (
          <div />
        )}

        {showConfirmButton && (
          <Button
            onClick={buildVerse}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Coffee size={16} />
            Start Reading
          </Button>
        )}
      </div>
    </div>
  );
};