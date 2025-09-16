"use client";
import * as React from 'react';
import { AppMode } from '../lib/types';
import { EyeOff, Keyboard, Volume2 } from 'lucide-react';

interface ModeSelectorProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  disabled?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onModeChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
      <button
        onClick={() => onModeChange('type')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all
          ${mode === 'type' 
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' 
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Keyboard size={16} />
        Type Mode
      </button>
      
      <button
        onClick={() => onModeChange('speech')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all
          ${mode === 'speech'
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Volume2 size={16} />
        Speech Mode
      </button>

      <button
        onClick={() => onModeChange('stealth')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all
          ${mode === 'stealth'
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <EyeOff size={16} />
        Stealth Mode
      </button>
    </div>
  );
};
