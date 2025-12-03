"use client";
import { Attempt, ProgressState, SavedPassage, StoredVerseProgress, Verse } from './types';
import { idbGet, idbSet } from './idb';
import { rebuildModeCompletions, updateModeCompletion } from './completion';
import { enqueueAttemptForSync, flushOutboxToServer } from './sync-service';

const KEY = 'bm_progress_v1';
export const PROGRESS_KEY = KEY;

/**
 * Migrate a progress state: rebuild modeCompletions if missing
 */
function migrateProgressState(state: ProgressState): ProgressState {
  let hasChanges = false;

  // Migrate verse ids from -es to -rv1960 and update translation
  const migratedVerses: ProgressState['verses'] = {};
  for (const verseId in state.verses) {
    const entry = state.verses[verseId];
    const isEs = verseId.endsWith('-es');
    const newId = isEs ? `${verseId.slice(0, -3)}rv1960` : verseId;
    if (isEs) {
      hasChanges = true;
    }
    migratedVerses[newId] = {
      ...entry,
      translation: entry.translation === 'ES' ? 'RVR1960' : (entry.translation || 'RVR1960'),
    };
  }
  if (Object.keys(migratedVerses).length && migratedVerses !== state.verses) {
    state.verses = migratedVerses;
  }

  for (const verseId in state.verses) {
    const verse = state.verses[verseId];
    if (!verse.modeCompletions && verse.attempts && verse.attempts.length > 0) {
      verse.modeCompletions = rebuildModeCompletions(verse.attempts);
      hasChanges = true;
    }
  }

  if (!state.saved) {
    state.saved = {};
    hasChanges = true;
  } else {
    // migrate saved passage keys and translations
    const newSaved: Record<string, SavedPassage> = {};
    for (const key in state.saved) {
      const saved = state.saved[key];
      const isEs = key.endsWith('-es');
      const newKey = isEs ? `${key.slice(0, -3)}rv1960` : key;
      if (isEs) hasChanges = true;
      newSaved[newKey] = {
        ...saved,
        verse: {
          ...saved.verse,
          id: newKey,
          translation: saved.verse.translation === 'ES' ? 'RVR1960' : saved.verse.translation,
        },
        savedAt: saved.savedAt,
      };
    }
    state.saved = newSaved;
  }

  if (state.lastSelectedVerseId?.endsWith('-es')) {
    state.lastSelectedVerseId = `${state.lastSelectedVerseId.slice(0, -3)}rv1960`;
    hasChanges = true;
  }

  return hasChanges ? { ...state } : state;
}

function defaultState(): ProgressState { return { verses: {}, saved: {} }; }

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
      const migrated = migrateProgressState(fromIdb);
      memory = migrated;
      // Re-persist if migration occurred
      if (migrated !== fromIdb) {
        await idbSet(KEY, migrated);
      }
    } else {
      const fromLocal = readLocalStorage();
      if (fromLocal) {
        const migrated = migrateProgressState(fromLocal);
        memory = migrated;
        // Seed IDB from existing localStorage with migration
        await idbSet(KEY, migrated);
      }
    }
  } finally {
    // no-op; background hydration finished
  }
}

// Initialize cache synchronously from localStorage if present, then hydrate from IDB
if (typeof window !== 'undefined') {
  const local = readLocalStorage();
  if (local) {
    const migrated = migrateProgressState(local);
    memory = migrated;
  }
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

export function appendAttempt(verse: Verse, attempt: Attempt, opts?: { userId?: string }) {
  const state = loadProgress();
  const existing: StoredVerseProgress = state.verses[verse.id] || {
    reference: verse.reference,
    translation: verse.translation,
    text: verse.text,
    attempts: [],
    source: verse.source,
    modeCompletions: {
      type: { perfectCount: 0 },
      speech: { perfectCount: 0 },
      stealth: { perfectCount: 0 },
      sequence: { perfectCount: 0 },
    },
  };
  existing.attempts = [...(existing.attempts || []), attempt];
  existing.reference = verse.reference;
  existing.translation = verse.translation;
  existing.text = verse.text;
  existing.source = verse.source;

  // Update mode completion counters
  if (!existing.modeCompletions) {
    existing.modeCompletions = {
      type: { perfectCount: 0 },
      speech: { perfectCount: 0 },
      stealth: { perfectCount: 0 },
      sequence: { perfectCount: 0 },
    };
  }
  existing.modeCompletions[attempt.mode] = updateModeCompletion(
    existing.modeCompletions[attempt.mode],
    attempt
  );

  state.verses[verse.id] = existing;
  state.lastSelectedVerseId = verse.id;
  saveProgress(state);

  // Non-blocking sync enqueue
  if (opts?.userId) {
    const userId = opts.userId;
    void enqueueAttemptForSync({ verse, attempt, userId }).catch(() => {});
    // Try to flush immediately so practice routes sync without needing to revisit home
    void flushOutboxToServer(userId).catch(() => {});
  } else {
    void enqueueAttemptForSync({ verse, attempt }).catch(() => {});
  }

  return state;
}

export function clearVerseHistory(verseId: string) {
  const state = loadProgress();
  if (state.verses[verseId]) {
    state.verses[verseId].attempts = [];
    // Reset mode completions when clearing history
    state.verses[verseId].modeCompletions = {
      type: { perfectCount: 0 },
      speech: { perfectCount: 0 },
      stealth: { perfectCount: 0 },
      sequence: { perfectCount: 0 },
    };
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

export function savePassageForLater(params: { verse: Verse; start: number; end: number }) {
  const state = loadProgress();
  if (!state.saved) state.saved = {};
  const { verse, start, end } = params;
  const existing: SavedPassage = state.saved[verse.id] || {
    verse,
    start,
    end,
    savedAt: Date.now(),
  };
  existing.verse = { ...verse };
  existing.start = start;
  existing.end = end;
  existing.savedAt = existing.savedAt || Date.now();
  state.saved[verse.id] = existing;
  saveProgress(state);
  return state;
}

export function removeSavedPassage(verseId: string) {
  const state = loadProgress();
  if (state.saved && state.saved[verseId]) {
    delete state.saved[verseId];
    saveProgress(state);
  }
  return state;
}

export function getSavedPassages(): SavedPassage[] {
  const state = loadProgress();
  const saved = state.saved || {};
  return Object.values(saved).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}
