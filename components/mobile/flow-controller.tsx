"use client";
import * as React from 'react';
import { useFlow, type BookIndexEntry } from './flow';
import { BookListMobile } from './book-list-mobile';
import { ChapterGridMobile } from './chapter-grid-mobile';
import { VerseRangeMobile } from './verse-range-mobile';
import { ModeSelectionMobile } from './mode-selection-mobile';
import { Breadcrumbs } from './breadcrumbs';
import { BottomBar } from './bottom-bar';
import { loadProgress, saveProgress } from '../../lib/storage';
import { SelectionEntryMobile } from './selection-entry-mobile';
import { VerseSearchMobile, type VerseSearchSelection } from './verse-search-mobile';
import type { Verse } from '../../lib/types';

interface Props {
  onSelectionSaved?: () => void;
}

const Inner: React.FC<Props> = ({ onSelectionSaved }) => {
  const { state, dispatch } = useFlow();
  const canConfirm = state.selectionMode === 'browse' && state.step==='VERSE' && state.verseStart!=null && state.verseEnd!=null;

  const persistPassage = React.useCallback((selection: { verse: Verse; start: number; end: number; book?: BookIndexEntry; chapter?: number }) => {
    const { verse, start, end, book, chapter } = selection;
    const progress = loadProgress();
    const existing = progress.verses[verse.id] || {
      reference: verse.reference,
      translation: verse.translation,
      attempts: [],
      source: verse.source,
    };
    existing.reference = verse.reference;
    existing.translation = verse.translation;
    existing.text = verse.text;
    existing.source = verse.source;
    progress.verses[verse.id] = existing;
    progress.lastSelectedVerseId = verse.id;
    saveProgress(progress);
    dispatch({ type:'SET_PASSAGE', verse, start, end, book, chapter });
    onSelectionSaved?.();
  }, [dispatch, onSelectionSaved]);

  function buildPassage(){
    if (!canConfirm || !state.book || !state.chapter || !state.chapterVerses || state.verseStart==null || state.verseEnd==null) return;
    const { book, chapter, verseStart, verseEnd } = { book: state.book, chapter: state.chapter, verseStart: state.verseStart, verseEnd: state.verseEnd };
    const slice = state.chapterVerses.slice(verseStart-1, verseEnd);
    const text = slice.join(' ');
    const reference = `${book.shortTitle || book.title} ${chapter}:${verseStart}${verseEnd>verseStart? '-' + verseEnd: ''}`;
    const id = `${book.key}-${chapter}-${verseStart}-${verseEnd}-es`;
    const verse: Verse = { id, reference, translation:'ES', text, source:'built-in' };
    persistPassage({ verse, start: verseStart, end: verseEnd, book, chapter });
  }

  const handleSearchSelect = React.useCallback((selection: VerseSearchSelection) => {
    persistPassage({
      verse: selection.verse,
      start: selection.start,
      end: selection.end,
      book: selection.book,
      chapter: selection.chapter,
    });
  }, [persistPassage]);

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <div className="px-3 pt-3 pb-2"><Breadcrumbs /></div>
      <div className="flex-1 px-3 flex flex-col gap-3 rounded-xl transition-colors duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-900/30">
        {state.step === 'ENTRY' && <SelectionEntryMobile />}
        {state.step === 'BOOK' && <BookListMobile />}
        {state.step === 'CHAPTER' && <ChapterGridMobile />}
        {state.step === 'VERSE' && <VerseRangeMobile />}
        {state.step === 'SEARCH' && <VerseSearchMobile onSelect={handleSearchSelect} />}
        {state.step === 'MODE' && <ModeSelectionMobile />}
      </div>
      <BottomBar buildPassage={buildPassage} canConfirmRange={!!canConfirm} />
    </div>
  );
};

export const MobileFlowController: React.FC<Props> = (props) => (
  <Inner {...props} />
);
