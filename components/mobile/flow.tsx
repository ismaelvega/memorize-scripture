"use client";
import { create } from 'zustand';
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

export interface FlowActions {
  reset: () => void;
  setSelectionMode: (mode: FlowSelectionMode) => void;
  setBook: (book: BookIndexEntry) => void;
  setChapter: (chapter: number) => void;
  setRange: (start: number, end: number) => void;
  clearRange: () => void;
  setPassage: (params: { verse: Verse; start: number; end: number; book?: BookIndexEntry; chapter?: number }) => void;
  setChapterVerses: (verses: string[]) => void;
  back: () => void;
}

export type FlowStore = FlowState & FlowActions;

const INITIAL_STATE: FlowState = { step: 'ENTRY' };

export const useFlowStore = create<FlowStore>((set, get) => ({
  ...INITIAL_STATE,
  selectionMode: undefined,
  reset: () => set(() => ({ ...INITIAL_STATE, selectionMode: undefined, book: undefined, chapter: undefined, verseStart: undefined, verseEnd: undefined, passage: undefined, chapterVerses: undefined })),
  setSelectionMode: (mode) => set(() => {
    if (mode === 'browse') {
      return {
        step: 'BOOK',
        selectionMode: 'browse',
        book: undefined,
        chapter: undefined,
        verseStart: undefined,
        verseEnd: undefined,
        passage: undefined,
        chapterVerses: undefined,
      };
    }
    return {
      step: 'SEARCH',
      selectionMode: 'search',
      book: undefined,
      chapter: undefined,
      verseStart: undefined,
      verseEnd: undefined,
      passage: undefined,
      chapterVerses: undefined,
    };
  }),
  setBook: (book) => set(() => ({
    step: 'CHAPTER',
    selectionMode: 'browse',
    book,
    chapter: undefined,
    verseStart: undefined,
    verseEnd: undefined,
    passage: undefined,
    chapterVerses: undefined,
  })),
  setChapter: (chapter) => set((state) => ({
    ...state,
    selectionMode: 'browse',
    step: 'VERSE',
    chapter,
    verseStart: undefined,
    verseEnd: undefined,
    passage: undefined,
    chapterVerses: undefined,
  })),
  setRange: (start, end) => set(() => ({
    verseStart: start,
    verseEnd: end,
  })),
  clearRange: () => set(() => ({
    verseStart: undefined,
    verseEnd: undefined,
  })),
  setPassage: ({ verse, start, end, book, chapter }) => set((state) => ({
    ...state,
    book: book ?? state.book,
    chapter: chapter ?? state.chapter,
    passage: verse,
    verseStart: start,
    verseEnd: end,
    step: 'MODE',
    selectionMode: state.selectionMode ?? (book ? 'browse' : 'search'),
  })),
  setChapterVerses: (verses) => set(() => ({
    chapterVerses: verses,
  })),
  back: () => {
    const state = get();
    if (state.step === 'MODE') {
      if (state.selectionMode === 'search') {
        set(() => ({
          step: 'SEARCH',
          selectionMode: 'search',
          passage: undefined,
          verseStart: undefined,
          verseEnd: undefined,
        }));
        return;
      }
      set(() => ({
        step: 'VERSE',
        passage: undefined,
      }));
      return;
    }
    if (state.step === 'VERSE') {
      set(() => ({
        step: 'CHAPTER',
      }));
      return;
    }
    if (state.step === 'CHAPTER') {
      set(() => ({
        step: 'BOOK',
        selectionMode: 'browse',
        chapter: undefined,
        verseStart: undefined,
        verseEnd: undefined,
      }));
      return;
    }
    if (state.step === 'BOOK') {
      set(() => ({ ...INITIAL_STATE }));
      return;
    }
    if (state.step === 'SEARCH') {
      set(() => ({ ...INITIAL_STATE }));
    }
  },
}));
