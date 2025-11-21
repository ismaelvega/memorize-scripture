"use client";
import * as React from 'react';
import { shallow } from 'zustand/shallow';
import { useFlowStore, type BookIndexEntry } from './flow';
import { BookListMobile } from './book-list-mobile';
import { ChapterGridMobile } from './chapter-grid-mobile';
import { VerseRangeMobile } from './verse-range-mobile';
import { ModeSelectionMobile } from './mode-selection-mobile';
import { BottomBar } from './bottom-bar';
import { loadProgress, saveProgress, savePassageForLater } from '../../lib/storage';
import { SelectionEntryMobile } from './selection-entry-mobile';
import { VerseSearchMobile, type VerseSearchSelection } from './verse-search-mobile';
import type { Verse } from '../../lib/types';
import { useToast } from '../ui/toast';

interface Props {
  onSelectionSaved?: () => void;
  onSavedForLater?: () => void;
}

const Inner: React.FC<Props> = ({ onSelectionSaved, onSavedForLater }) => {
  const {
    step,
    selectionMode,
    book,
    chapter,
    chapterVerses,
    verseStart,
    verseEnd,
    setPassage,
  } = useFlowStore(
    (state) => ({
      step: state.step,
      selectionMode: state.selectionMode,
      book: state.book,
      chapter: state.chapter,
      chapterVerses: state.chapterVerses,
      verseStart: state.verseStart,
      verseEnd: state.verseEnd,
      setPassage: state.setPassage,
    }),
    shallow,
  );
  const canConfirm = selectionMode === 'browse' && step === 'VERSE' && verseStart != null && verseEnd != null;

  const buildCurrentSelection = React.useCallback(() => {
    if (!canConfirm || !book || !chapter || !chapterVerses || verseStart == null || verseEnd == null) return null;
    const slice = chapterVerses.slice(verseStart - 1, verseEnd);
    const text = slice.join(' ');
    const reference = `${book.shortTitle || book.title} ${chapter}:${verseStart}${verseEnd > verseStart ? '-' + verseEnd : ''}`;
    const id = `${book.key}-${chapter}-${verseStart}-${verseEnd}-es`;
    const verse: Verse = { id, reference, translation: 'ES', text, source: 'built-in' };
    return { verse, start: verseStart, end: verseEnd, book, chapter };
  }, [book, canConfirm, chapter, chapterVerses, verseEnd, verseStart]);

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
    setPassage({ verse, start, end, book, chapter });
    onSelectionSaved?.();
  }, [onSelectionSaved, setPassage]);

  const buildPassage = React.useCallback(() => {
    const selection = buildCurrentSelection();
    if (!selection) return;
    persistPassage(selection);
  }, [buildCurrentSelection, persistPassage]);

  const { pushToast } = useToast();

  const handleSaveForLater = React.useCallback(() => {
    const selection = buildCurrentSelection();
    if (!selection) {
      return false;
    }
    try {
      savePassageForLater(selection);
      onSavedForLater?.();
      return true;
    } catch (error) {
      console.error('Error guardando pasaje para después', error);
      pushToast({
        title: 'No se pudo guardar',
        description: 'Inténtalo de nuevo.',
      });
      return false;
    }
  }, [buildCurrentSelection, onSavedForLater, pushToast]);

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
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {step === 'ENTRY' && (
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            <SelectionEntryMobile />
          </div>
        )}
        {step === 'BOOK' && <BookListMobile />}
        {step === 'CHAPTER' && <ChapterGridMobile />}
        {step === 'VERSE' && <VerseRangeMobile />}
        {step === 'SEARCH' && <VerseSearchMobile onSelect={handleSearchSelect} onSavedForLater={onSavedForLater} />}
        {step === 'MODE' && (
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            <ModeSelectionMobile />
          </div>
        )}
      </div>
      <BottomBar
        buildPassage={buildPassage}
        canConfirmRange={!!canConfirm}
        onSaveForLater={handleSaveForLater}
      />
    </div>
  );
};

export const MobileFlowController: React.FC<Props> = (props) => (
  <Inner {...props} />
);
