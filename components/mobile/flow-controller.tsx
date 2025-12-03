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
import { useRouter, useSearchParams } from 'next/navigation';

interface Props {
  onSelectionSaved?: () => void;
  onSavedForLater?: () => void;
  onClose?: () => void;
}

const Inner: React.FC<Props> = ({ onSelectionSaved, onSavedForLater, onClose }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  
  const back = useFlowStore((state) => state.back);
  const isBackRef = React.useRef(false);

  React.useEffect(() => {
    const onPopState = () => {
      isBackRef.current = true;
      
      if (step === 'MODE') {
        const fromSaved = searchParams.get('fromSaved') === 'true';
        const fromProgress = searchParams.get('fromProgress') === 'true';
        const fromMode = searchParams.get('fromMode') === 'true';

        if (fromSaved) {
          router.push('/practice/saved');
          onClose?.();
          return;
        }
        if (fromProgress || fromMode) {
          router.replace('/practice');
          onClose?.();
          return;
        }
      }

      back();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [back, step, searchParams, router, onClose]);

  React.useEffect(() => {
    if (step === 'ENTRY') return;
    if (isBackRef.current) {
      isBackRef.current = false;
      return;
    }
    window.history.pushState({ step }, '', '');
  }, [step]);

  const canConfirm = selectionMode === 'browse' && step === 'VERSE' && verseStart != null && verseEnd != null;

  const buildCurrentSelection = React.useCallback(() => {
    if (!canConfirm || !book || !chapter || !chapterVerses || verseStart == null || verseEnd == null) return null;
    const slice = chapterVerses.slice(verseStart - 1, verseEnd);
    const text = slice.join(' ');
    const reference = `${book.shortTitle || book.title} ${chapter}:${verseStart}${verseEnd > verseStart ? '-' + verseEnd : ''}`;
    const id = `${book.key}-${chapter}-${verseStart}-${verseEnd}-rv1960`;
    const verse: Verse = { id, reference, translation: 'RVR1960', text, source: 'built-in' };
    return { verse, start: verseStart, end: verseEnd, book, chapter };
  }, [book, canConfirm, chapter, chapterVerses, verseEnd, verseStart]);

  const persistPassage = React.useCallback((selection: { verse: Verse; start: number; end: number; book?: BookIndexEntry; chapter?: number }) => {
    const { verse, start, end, book, chapter } = selection;
    
    // Rebuild the ID to ensure it reflects the correct range
    // The verse.id from search might be for a single verse, but we need the range ID
    let correctedId = verse.id;
    if (book && chapter && start && end) {
      correctedId = `${book.key}-${chapter}-${start}-${end}-rv1960`;
    }
    
    // Also update the reference to reflect the range
    let correctedReference = verse.reference;
    if (book && chapter && start && end) {
      const bookName = book.shortTitle || book.title || book.key;
      correctedReference = start === end 
        ? `${bookName} ${chapter}:${start}`
        : `${bookName} ${chapter}:${start}-${end}`;
    }

    const correctedVerse: Verse = {
      ...verse,
      id: correctedId,
      reference: correctedReference,
      translation: verse.translation || 'RVR1960',
    };
    
    const progress = loadProgress();
    const existing = progress.verses[correctedId] || {
      reference: correctedReference,
      translation: correctedVerse.translation,
      attempts: [],
      source: correctedVerse.source,
    };
    existing.reference = correctedReference;
    existing.translation = correctedVerse.translation;
    existing.text = correctedVerse.text;
    existing.source = correctedVerse.source;
    progress.verses[correctedId] = existing;
    progress.lastSelectedVerseId = correctedId;
    saveProgress(progress);
    setPassage({ verse: correctedVerse, start, end, book, chapter });
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
