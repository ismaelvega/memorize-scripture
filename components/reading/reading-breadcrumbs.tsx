"use client";
import * as React from 'react';
import { useReadingFlow } from './reading-flow';
import { ChevronRight } from 'lucide-react';

export const ReadingBreadcrumbs: React.FC = () => {
  const { state } = useReadingFlow();

  const items = [];

  if (state.step === 'BOOK') {
    items.push('Choose a book');
  } else {
    if (state.book) {
      items.push(state.book.shortTitle || state.book.title);
    }

    if (state.step === 'CHAPTER') {
      items.push('Choose chapter');
    } else if (state.chapter) {
      items.push(`Chapter ${state.chapter}`);

      if (state.step === 'VERSE') {
        items.push('Choose verses');
      } else if (state.verseStart && state.verseEnd) {
        if (state.verseStart === state.verseEnd) {
          items.push(`Verse ${state.verseStart}`);
        } else {
          items.push(`Verses ${state.verseStart}-${state.verseEnd}`);
        }

        if (state.step === 'READ') {
          items.push('Reading');
        }
      }
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
      <span className="text-amber-600 dark:text-amber-400 font-medium">☕ Read & Chill</span>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-neutral-400" />
          <span className={index === items.length - 1 ? 'text-neutral-900 dark:text-neutral-100 font-medium' : ''}>
            {item}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};