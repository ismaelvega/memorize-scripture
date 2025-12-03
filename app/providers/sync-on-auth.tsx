"use client";

import * as React from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { buildSnapshotForUser, flushOutboxToServer, isSyncEnabled } from '@/lib/sync-service';
import { consumeOutbox, peekOutbox } from '@/lib/sync-outbox';

export const SyncOnAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lastPushedUserRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isSyncEnabled()) return;
    const supabase = getSupabaseClient();

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

      await fetch('/api/sync-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, attempts: snapshot.attempts, savedPassages: snapshot.savedPassages }),
      }).catch(() => {});
      // Clear outbox after snapshot push to avoid duplicates
      await consumeOutbox();
      lastPushedUserRef.current = userId;
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await pushSnapshot(user.id);
      }
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id;
      if (userId) {
        void pushSnapshot(userId);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
};
