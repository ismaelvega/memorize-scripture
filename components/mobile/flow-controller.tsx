"use client";
import * as React from 'react';
import { FlowProvider, useFlow } from './flow';
import { BookListMobile } from './book-list-mobile';
import { ChapterGridMobile } from './chapter-grid-mobile';
import { VerseRangeMobile } from './verse-range-mobile';
import { AttemptViewMobile } from './attempt-view-mobile';
import { Breadcrumbs } from './breadcrumbs';
import { BottomBar } from './bottom-bar';

const Inner: React.FC = () => {
  const { state, dispatch } = useFlow();
  const canConfirm = state.step==='VERSE' && state.verseStart!=null && state.verseEnd!=null;

  function buildPassage(){
    if (!canConfirm || !state.book || !state.chapter || !state.chapterVerses || state.verseStart==null || state.verseEnd==null) return;
    const { book, chapter, verseStart, verseEnd } = { book: state.book, chapter: state.chapter, verseStart: state.verseStart, verseEnd: state.verseEnd };
    const slice = state.chapterVerses.slice(verseStart-1, verseEnd);
    const text = slice.join(' ');
    const reference = `${book.shortTitle || book.title} ${chapter}:${verseStart}${verseEnd>verseStart? '-' + verseEnd: ''}`;
    const id = `${book.key}-${chapter}-${verseStart}-${verseEnd}-es`;
    dispatch({ type:'SET_PASSAGE', verse: { id, reference, translation:'ES', text, source:'built-in' }, start: verseStart, end: verseEnd });
  }

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <div className="px-3 pt-3 pb-2"><Breadcrumbs /></div>
      <div className="flex-1 px-3 flex flex-col gap-3">
        {state.step === 'BOOK' && <BookListMobile />}
        {state.step === 'CHAPTER' && <ChapterGridMobile />}
        {state.step === 'VERSE' && <VerseRangeMobile />}
        {state.step === 'ATTEMPT' && <AttemptViewMobile />}
      </div>
      <BottomBar buildPassage={buildPassage} canConfirmRange={!!canConfirm} />
    </div>
  );
};

export const MobileFlowController: React.FC = () => (
  <FlowProvider>
    <Inner />
  </FlowProvider>
);
