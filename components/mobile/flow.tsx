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

export type FlowSelectionMode = 'browse' | 'search';
export type FlowStep = 'ENTRY' | 'BOOK' | 'CHAPTER' | 'VERSE' | 'MODE' | 'SEARCH';

export interface FlowState {
  step: FlowStep;
  selectionMode?: FlowSelectionMode;
  book?: BookIndexEntry;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  passage?: Verse;
  chapterVerses?: string[];
}

type Action =
  | { type: 'RESET' }
  | { type: 'SET_SELECTION_MODE'; mode: FlowSelectionMode }
  | { type: 'SET_BOOK'; book: BookIndexEntry }
  | { type: 'SET_CHAPTER'; chapter: number }
  | { type: 'SET_RANGE'; start: number; end: number }
  | { type: 'CLEAR_RANGE' }
  | { type: 'SET_PASSAGE'; verse: Verse; start: number; end: number; book?: BookIndexEntry; chapter?: number }
  | { type: 'SET_CHAPTER_VERSES'; verses: string[] }
  | { type: 'BACK' };

const INITIAL_STATE: FlowState = { step: 'ENTRY' };

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'RESET':
      return { ...INITIAL_STATE };
    case 'SET_SELECTION_MODE':
      if (action.mode === 'browse') {
        return { step: 'BOOK', selectionMode: 'browse' };
      }
      return { step: 'SEARCH', selectionMode: 'search' };
    case 'SET_BOOK':
      return { step: 'CHAPTER', selectionMode: 'browse', book: action.book };
    case 'SET_CHAPTER':
      return {
        ...state,
        selectionMode: 'browse',
        step: 'VERSE',
        chapter: action.chapter,
        verseStart: undefined,
        verseEnd: undefined,
        chapterVerses: undefined,
      };
    case 'SET_RANGE':
      return { ...state, verseStart: action.start, verseEnd: action.end };
    case 'CLEAR_RANGE':
      return { ...state, verseStart: undefined, verseEnd: undefined };
    case 'SET_PASSAGE':
      return {
        ...state,
        book: action.book ?? state.book,
        chapter: action.chapter ?? state.chapter,
        passage: action.verse,
        verseStart: action.start,
        verseEnd: action.end,
        step: 'MODE',
        selectionMode: state.selectionMode ?? 'browse',
      };
    case 'SET_CHAPTER_VERSES':
      return { ...state, chapterVerses: action.verses };
    case 'BACK': {
      if (state.step === 'MODE') {
        if (state.selectionMode === 'search') {
          return { step: 'SEARCH', selectionMode: 'search' };
        }
        return { ...state, step: 'VERSE' };
      }
      if (state.step === 'VERSE') {
        return { ...state, step: 'CHAPTER', book: state.book, chapter: state.chapter };
      }
      if (state.step === 'CHAPTER') {
        return { step: 'BOOK', selectionMode: 'browse', book: state.book };
      }
      if (state.step === 'BOOK') {
        return { ...INITIAL_STATE };
      }
      if (state.step === 'SEARCH') {
        return { ...INITIAL_STATE };
      }
      return state;
    }
    default: return state;
  }
}

interface FlowContextValue { state: FlowState; dispatch: React.Dispatch<Action>; }
const FlowContext = React.createContext<FlowContextValue | undefined>(undefined);

export const FlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, INITIAL_STATE);
  return <FlowContext.Provider value={{ state, dispatch }}>{children}</FlowContext.Provider>;
};

export function useFlow() { const ctx = React.useContext(FlowContext); if (!ctx) throw new Error('useFlow must be used within FlowProvider'); return ctx; }
