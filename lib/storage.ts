"use client";
import { Attempt, ProgressState, StoredVerseProgress, Verse } from './types';
import { idbGet, idbSet } from './idb';

const KEY = 'bm_progress_v1';
export const PROGRESS_KEY = KEY;

function defaultState(): ProgressState { return { verses: {} }; }

// In-memory cache to keep the existing synchronous API
let memory: ProgressState = defaultState();
let hydrateStarted = false;

function readLocalStorage(): ProgressState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProgressState;
    if (!parsed || typeof parsed !== 'object' || !parsed.verses) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function hydrateFromIndexedDB() {
  if (hydrateStarted || typeof window === 'undefined') return;
  hydrateStarted = true;
  try {
    const fromIdb = await idbGet<ProgressState>(KEY);
    if (fromIdb && fromIdb.verses) {
      memory = fromIdb;
    } else {
      const fromLocal = readLocalStorage();
      if (fromLocal) {
        memory = fromLocal;
        // Seed IDB from existing localStorage
        await idbSet(KEY, fromLocal);
      }
    }
  } finally {
    // no-op; background hydration finished
  }
}

// Initialize cache synchronously from localStorage if present, then hydrate from IDB
if (typeof window !== 'undefined') {
  const local = readLocalStorage();
  if (local) memory = local;
  // fire-and-forget hydration
  // no await to keep module load sync
  void hydrateFromIndexedDB();
}

export function loadProgress(): ProgressState {
  // Always return in-memory snapshot synchronously
  return memory || defaultState();
}

function persistAsync(state: ProgressState) {
  // Mirror to localStorage for safety and existing expectations
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    }
  } catch {
    // ignore localStorage write errors
  }
  // Persist to IndexedDB (async)
  void idbSet(KEY, state);
}

export function saveProgress(state: ProgressState) {
  memory = state;
  persistAsync(state);
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
  existing.attempts = [...(existing.attempts || []), attempt];
  existing.reference = verse.reference;
  existing.translation = verse.translation;
  existing.text = verse.text;
  existing.source = verse.source;
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

export function removeVerse(verseId: string) {
  const state = loadProgress();
  if (state.verses[verseId]) {
    delete state.verses[verseId];
    if (state.lastSelectedVerseId === verseId) state.lastSelectedVerseId = undefined;
    saveProgress(state);
  }
  return state;
}
