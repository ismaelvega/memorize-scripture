"use client";

import * as React from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { buildSnapshotForUser, flushOutboxToServer, isSyncEnabled } from '@/lib/sync-service';
import { peekOutbox } from '@/lib/sync-outbox';
import { mergeRemoteProgress } from '@/lib/sync-merge';
import { getSyncMeta, setSyncMeta } from '@/lib/sync-meta';

export const SyncOnAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lastPushedUserRef = React.useRef<string | null>(null);
  const lastPulledUserRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isSyncEnabled()) return;
    const supabase = getSupabaseClient();

    async function pullRemote(userId: string) {
      if (lastPulledUserRef.current === userId) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      try {
        const meta = await getSyncMeta();
        const url = new URL('/api/pull-progress', window.location.origin);
        if (meta.lastPullAt && meta.lastPullUserId === userId) {
          url.searchParams.set('since', String(meta.lastPullAt));
        }
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data?.ok) return;
        mergeRemoteProgress({
          progressRows: Array.isArray(data.progress) ? data.progress : [],
          savedRows: Array.isArray(data.savedPassages) ? data.savedPassages : [],
        });
        await setSyncMeta({ lastPullAt: Date.now(), lastPullUserId: userId });
        lastPulledUserRef.current = userId;
      } catch {
        // ignore pull failures
      }
    }

    async function pushSnapshot(userId: string) {
      if (lastPushedUserRef.current === userId) return;
      // First, upgrade any existing outbox entries with the userId
      const outbox = await peekOutbox();
      if (outbox.length) {
        await flushOutboxToServer(userId);
      }

      // Build and push a full snapshot (idempotent)
      const snapshot = await buildSnapshotForUser(userId);
      if (!snapshot.attempts.length && !(snapshot.savedPassages || []).length) return;

      const res = await fetch('/api/sync-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, attempts: snapshot.attempts, savedPassages: snapshot.savedPassages }),
      }).catch(() => null);
      if (res?.ok) {
        await setSyncMeta({ lastPushAt: Date.now(), lastPushUserId: userId });
      }
      lastPushedUserRef.current = userId;
    }

    async function syncOnLogin(userId: string) {
      await pushSnapshot(userId);
      await pullRemote(userId);
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await syncOnLogin(user.id);
      }
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id;
      if (userId) {
        void syncOnLogin(userId);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
};
