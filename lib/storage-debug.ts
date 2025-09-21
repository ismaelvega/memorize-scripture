"use client";

import type { ProgressState } from "./types";
import { loadProgress, saveProgress, PROGRESS_KEY } from "./storage";
import { idbGet, idbSet, idbDelete } from "./idb";

function cloneState(state: ProgressState): ProgressState {
  try {
    return structuredClone(state);
  } catch {
    return JSON.parse(JSON.stringify(state)) as ProgressState;
  }
}

function readLocalStorage(): ProgressState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as ProgressState;
    return parsed && typeof parsed === "object" && parsed.verses ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function dump() {
  const memory = cloneState(loadProgress());
  const idb = (await idbGet<ProgressState>(PROGRESS_KEY)) ?? undefined;
  const local = readLocalStorage();
  return { memory, idb, local };
}

async function clear() {
  const empty: ProgressState = { verses: {} };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(PROGRESS_KEY);
    } catch {}
  }
  await idbDelete(PROGRESS_KEY);
  saveProgress(empty);
  return empty;
}

async function seed(state: ProgressState) {
  saveProgress(state);
  return cloneState(loadProgress());
}

async function reloadFromIndexedDB() {
  const snapshot = (await idbGet<ProgressState>(PROGRESS_KEY)) ?? { verses: {} };
  saveProgress(snapshot);
  return cloneState(loadProgress());
}

async function syncLocalToIndexedDB() {
  const local = readLocalStorage();
  if (!local) return null;
  await idbSet(PROGRESS_KEY, local);
  saveProgress(local);
  return cloneState(local);
}

type StorageTools = {
  dump: () => Promise<{ memory: ProgressState; idb?: ProgressState; local?: ProgressState }>;
  clear: () => Promise<ProgressState>;
  seed: (state: ProgressState) => Promise<ProgressState>;
  reloadFromIndexedDB: () => Promise<ProgressState>;
  syncLocalToIndexedDB: () => Promise<ProgressState | null>;
};

declare global {
  interface Window {
    __bmStorageTools?: StorageTools;
  }
}

if (typeof window !== "undefined") {
  const tools: StorageTools = {
    dump,
    clear,
    seed,
    reloadFromIndexedDB,
    syncLocalToIndexedDB,
  };
  window.__bmStorageTools = tools;
  if (process.env.NODE_ENV !== "production") {
    console.info("[bm] storage debug tools attached to window.__bmStorageTools");
  }
}

export type { StorageTools };
