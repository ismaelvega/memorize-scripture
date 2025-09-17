"use client";
import * as React from 'react';
import { Verse } from '../../lib/types';

export interface BookIndexEntry {
  testament: string;
  title: string;
  shortTitle: string;
  abbr: string;
  category: string;
  key: string;
  number: number;
  chapters: number;
  verses: number;
}

export type ReadingFlowStep = 'BOOK' | 'CHAPTER' | 'VERSE' | 'READ';

export interface ReadingFlowState {
  step: ReadingFlowStep;
  book?: BookIndexEntry;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  selectedVerse?: Verse;
  chapterVerses?: string[];
}

type ReadingAction =
  | { type: 'RESET' }
  | { type: 'SET_BOOK'; book: BookIndexEntry }
  | { type: 'SET_CHAPTER'; chapter: number }
  | { type: 'SET_RANGE'; start: number; end: number }
  | { type: 'CLEAR_RANGE' }
  | { type: 'SET_VERSE'; verse: Verse; start: number; end: number }
  | { type: 'SET_CHAPTER_VERSES'; verses: string[] }
  | { type: 'BACK' };

function readingReducer(state: ReadingFlowState, action: ReadingAction): ReadingFlowState {
  switch (action.type) {
    case 'RESET':
      return { step: 'BOOK' };
    case 'SET_BOOK':
      return { ...state, step: 'CHAPTER', book: action.book };
    case 'SET_CHAPTER':
      return {
        ...state,
        step: 'VERSE',
        chapter: action.chapter,
        verseStart: undefined,
        verseEnd: undefined,
        chapterVerses: undefined
      };
    case 'SET_RANGE':
      return { ...state, verseStart: action.start, verseEnd: action.end };
    case 'CLEAR_RANGE':
      return { ...state, verseStart: undefined, verseEnd: undefined };
    case 'SET_VERSE':
      return {
        ...state,
        selectedVerse: action.verse,
        verseStart: action.start,
        verseEnd: action.end,
        step: 'READ'
      };
    case 'SET_CHAPTER_VERSES':
      return { ...state, chapterVerses: action.verses };
    case 'BACK': {
      if (state.step === 'READ') {
        // If we don't have book/chapter context (e.g., deep link), go back to BOOK
        if (state.book && state.chapter) return { ...state, step: 'VERSE' };
        return { ...state, step: 'BOOK', selectedVerse: undefined, verseStart: undefined, verseEnd: undefined };
      }
      if (state.step === 'VERSE') return { ...state, step: 'CHAPTER', book: state.book, chapter: state.chapter };
      if (state.step === 'CHAPTER') return { ...state, step: 'BOOK' };
      return state;
    }
    default:
      return state;
  }
}

interface ReadingFlowContextValue {
  state: ReadingFlowState;
  dispatch: React.Dispatch<ReadingAction>;
}

const ReadingFlowContext = React.createContext<ReadingFlowContextValue | undefined>(undefined);

export const ReadingFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = React.useReducer(readingReducer, { step: 'BOOK' } as ReadingFlowState);
  return (
    <ReadingFlowContext.Provider value={{ state, dispatch }}>
      {children}
    </ReadingFlowContext.Provider>
  );
};

export function useReadingFlow() {
  const ctx = React.useContext(ReadingFlowContext);
  if (!ctx) throw new Error('useReadingFlow must be used within ReadingFlowProvider');
  return ctx;
}