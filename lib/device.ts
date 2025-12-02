"use client";

const DEVICE_ID_KEY = 'bm_device_id';

function generateId() {
  // Simple UUID v4-ish generation for device tracking
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0x0f) >> 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a stable device id. Stored in localStorage.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown-device';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length > 0) return existing;
    const id = generateId();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return 'unknown-device';
  }
}

export function clearDeviceId() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DEVICE_ID_KEY);
  } catch {
    // ignore
  }
}
