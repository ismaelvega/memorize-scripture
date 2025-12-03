"use client";

import * as React from 'react';
import { flushOutboxToServer, pullAndMergeProgress, isSyncEnabled } from './sync-service';
import { peekOutbox } from './sync-outbox';

const DEFAULT_THROTTLE_MS = 60_000; // 60s

export function useSyncOnEvents(params: { userId: string | null; throttleMs?: number }) {
  const { userId, throttleMs = DEFAULT_THROTTLE_MS } = params;
  const lastSyncRef = React.useRef<number>(0);
  const inFlightRef = React.useRef(false);

  const maybeSync = React.useCallback(async () => {
    if (!isSyncEnabled()) return;
    if (!userId) return;
    if (inFlightRef.current) return;

    const now = Date.now();
    if (now - lastSyncRef.current < throttleMs) return;

    const outbox = await peekOutbox();
    if (!outbox.length) return;

    inFlightRef.current = true;
    try {
      const flushed = await flushOutboxToServer(userId);
      if (flushed.ok) {
        const pulled = await pullAndMergeProgress(userId, lastSyncRef.current || undefined);
        if (pulled.ok) {
          lastSyncRef.current = Date.now();
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [userId, throttleMs]);

  React.useEffect(() => {
    if (!isSyncEnabled()) return;
    if (!userId) return;

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void maybeSync();
      }
    };
    const onOnline = () => void maybeSync();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [userId, maybeSync]);
}
