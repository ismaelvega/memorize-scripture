"use client";
import { Attempt, ProgressState, StoredVerseProgress, Verse } from './types';

const KEY = 'bm_progress_v1';

function defaultState(): ProgressState { return { verses: {} }; }

export function loadProgress(): ProgressState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as ProgressState;
    if (!parsed.verses) return defaultState();
    return parsed;
  } catch (e) {
    console.warn('Failed to parse progress, resetting', e);
    return defaultState();
  }
}

export function saveProgress(state: ProgressState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save progress', e);
  }
}

export function appendAttempt(verse: Verse, attempt: Attempt) {
  const state = loadProgress();
  const existing: StoredVerseProgress = state.verses[verse.id] || {
    reference: verse.reference,
    translation: verse.translation,
    text: verse.text,
    attempts: [],
    source: verse.source,
  };
  existing.attempts = [...existing.attempts, attempt];
  state.verses[verse.id] = existing;
  state.lastSelectedVerseId = verse.id;
  saveProgress(state);
  return state;
}

export function clearVerseHistory(verseId: string) {
  const state = loadProgress();
  if (state.verses[verseId]) {
    state.verses[verseId].attempts = [];
    saveProgress(state);
  }
  return state;
}
