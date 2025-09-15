"use client";
import * as React from 'react';
import { Verse, AppMode } from '../../lib/types';

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

export type FlowStep = 'BOOK' | 'CHAPTER' | 'VERSE' | 'ATTEMPT';

export interface FlowState {
  step: FlowStep;
  book?: BookIndexEntry;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  passage?: Verse;
  chapterVerses?: string[];
  mode: AppMode;
}

type Action =
  | { type: 'RESET' }
  | { type: 'SET_BOOK'; book: BookIndexEntry }
  | { type: 'SET_CHAPTER'; chapter: number }
  | { type: 'SET_RANGE'; start: number; end: number }
  | { type: 'CLEAR_RANGE' }
  | { type: 'SET_PASSAGE'; verse: Verse; start: number; end: number; mode?: AppMode }
  | { type: 'SET_CHAPTER_VERSES'; verses: string[] }
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'BACK' };

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'RESET': return { step: 'BOOK', mode: 'type' };
    case 'SET_BOOK': return { ...state, step: 'CHAPTER', book: action.book };
  case 'SET_CHAPTER': return { ...state, step: 'VERSE', chapter: action.chapter, verseStart: undefined, verseEnd: undefined, chapterVerses: undefined };
    case 'SET_RANGE': return { ...state, verseStart: action.start, verseEnd: action.end };
  case 'CLEAR_RANGE': return { ...state, verseStart: undefined, verseEnd: undefined };
    case 'SET_PASSAGE': return { ...state, passage: action.verse, verseStart: action.start, verseEnd: action.end, step: 'ATTEMPT', mode: action.mode || state.mode };
  case 'SET_CHAPTER_VERSES': return { ...state, chapterVerses: action.verses };
    case 'SET_MODE': return { ...state, mode: action.mode };
    case 'BACK': {
      if (state.step === 'ATTEMPT') {
        // If we don't have book/chapter context (e.g., deep link straight to attempt), go back to BOOK.
        if (state.book && state.chapter) return { ...state, step: 'VERSE' };
        return { ...state, step: 'BOOK', passage: undefined, verseStart: undefined, verseEnd: undefined };
      }
      if (state.step === 'VERSE') return { ...state, step: 'CHAPTER', book: state.book, chapter: state.chapter };
      if (state.step === 'CHAPTER') return { ...state, step: 'BOOK' };
      return state;
    }
    default: return state;
  }
}

interface FlowContextValue { state: FlowState; dispatch: React.Dispatch<Action>; }
const FlowContext = React.createContext<FlowContextValue | undefined>(undefined);

export const FlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, { step: 'BOOK', mode: 'type' } as FlowState);
  return <FlowContext.Provider value={{ state, dispatch }}>{children}</FlowContext.Provider>;
};

export function useFlow() { const ctx = React.useContext(FlowContext); if (!ctx) throw new Error('useFlow must be used within FlowProvider'); return ctx; }
