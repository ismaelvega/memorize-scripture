"use client";

// Minimal IndexedDB helpers for client-side persistence

const DB_NAME = "bm_progress_db";
const DB_VERSION = 1;
const STORE = "kv";

type KVRecord<T = unknown> = { key: string; value: T };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB not available"));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open IndexedDB"));
  });
}

export async function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const rec = req.result as KVRecord<T> | undefined;
        resolve(rec?.value);
      };
      req.onerror = () => reject(req.error || new Error("IndexedDB get failed"));
    });
  } catch {
    return undefined;
  }
}

export async function idbSet<T = unknown>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.put({ key, value } as KVRecord<T>);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("IndexedDB put failed"));
    });
  } catch {
    // swallow - we still mirror to localStorage in callers
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("IndexedDB delete failed"));
    });
  } catch {
    // ignore
  }
}
