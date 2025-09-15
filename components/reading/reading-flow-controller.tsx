"use client";
import * as React from 'react';
import { useReadingFlow } from './reading-flow';
import { BookListReading } from './book-list-reading';
import { ChapterGridReading } from './chapter-grid-reading';
import { VerseRangeReading } from './verse-range-reading';
import { ChillModeCard } from '../chill-mode-card';
import { ReadingBreadcrumbs } from './reading-breadcrumbs';
import { ReadingBottomBar } from './reading-bottom-bar';

const Inner: React.FC = () => {
  const { state, dispatch } = useReadingFlow();
  const canConfirm = state.step === 'VERSE' && state.verseStart != null && state.verseEnd != null;

  function buildVerse() {
    if (!canConfirm || !state.book || !state.chapter || !state.chapterVerses || state.verseStart == null || state.verseEnd == null) return;

    const { book, chapter, verseStart, verseEnd } = {
      book: state.book,
      chapter: state.chapter,
      verseStart: state.verseStart,
      verseEnd: state.verseEnd
    };

    const slice = state.chapterVerses.slice(verseStart - 1, verseEnd);
    const text = slice.join(' ');
    const reference = `${book.shortTitle || book.title} ${chapter}:${verseStart}${verseEnd > verseStart ? '-' + verseEnd : ''}`;
    const id = `${book.key}-${chapter}-${verseStart}-${verseEnd}-es`;

    dispatch({
      type: 'SET_VERSE',
      verse: { id, reference, translation: 'ES', text, source: 'built-in' },
      start: verseStart,
      end: verseEnd
    });
  }

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <div className="px-3 pt-3 pb-2">
        <ReadingBreadcrumbs />
      </div>
      <div className="flex-1 px-3 flex flex-col gap-3">
        {state.step === 'BOOK' && <BookListReading />}
        {state.step === 'CHAPTER' && <ChapterGridReading />}
        {state.step === 'VERSE' && <VerseRangeReading />}
        {state.step === 'READ' && (
          <ChillModeCard
            verse={state.selectedVerse || null}
            onBrowseVerses={() => dispatch({ type: 'RESET' })}
          />
        )}
      </div>
      <ReadingBottomBar buildVerse={buildVerse} canConfirmRange={!!canConfirm} />
    </div>
  );
};

export const ReadingFlowController: React.FC = () => (
  <Inner />
);