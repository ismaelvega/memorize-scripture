import * as React from 'react';
import { RotateCcw, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModeActionButtonsProps {
  isCompleted: boolean;
  onRetry: () => void;
  onChangeMode?: () => void;
  retryLabel?: string;
  changeModeLabel?: string;
  className?: string;
}

export const ModeActionButtons: React.FC<ModeActionButtonsProps> = ({
  isCompleted,
  onRetry,
  onChangeMode,
  retryLabel = 'Repetir intento',
  changeModeLabel = 'Cambiar modo',
  className,
}) => {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {!isCompleted ? (
        // Not completed: left = cambiar modo (secondary), right = repetir intento (primary)
        <>
          {onChangeMode && (
            <Button onClick={onChangeMode} variant="secondary">
              <BookOpen className="mr-2 h-4 w-4" />
              {changeModeLabel}
            </Button>
          )}
          <Button onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {retryLabel}
          </Button>
        </>
      ) : (
        // Completed: left = repetir intento (secondary), right = cambiar modo (primary)
        <>
          <Button onClick={onRetry} variant="secondary">
            <RotateCcw className="mr-2 h-4 w-4" />
            {retryLabel}
          </Button>
          {onChangeMode && (
            <Button onClick={onChangeMode}>
              <BookOpen className="mr-2 h-4 w-4" />
              {changeModeLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
};
