"use client";

import { idbGet, idbSet } from './idb';

const SYNC_META_KEY = 'bm_sync_meta_v1';

export type SyncMeta = {
  lastPullAt?: number;
  lastPushAt?: number;
  lastPullUserId?: string;
  lastPushUserId?: string;
};

function readLocalStorage(): SyncMeta {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SYNC_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SyncMeta;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

async function readMeta(): Promise<SyncMeta> {
  if (typeof window === 'undefined') return {};
  const fromIdb = await idbGet<SyncMeta>(SYNC_META_KEY);
  if (fromIdb && typeof fromIdb === 'object') return fromIdb;
  return readLocalStorage();
}

async function persistMeta(meta: SyncMeta) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch {
    // ignore localStorage write errors
  }
  await idbSet(SYNC_META_KEY, meta);
}

export async function getSyncMeta(): Promise<SyncMeta> {
  return readMeta();
}

export async function setSyncMeta(patch: SyncMeta): Promise<SyncMeta> {
  const current = await readMeta();
  const next = { ...current, ...patch };
  await persistMeta(next);
  return next;
}

export async function clearSyncMeta() {
  await persistMeta({});
}
