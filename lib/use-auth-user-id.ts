"use client";

import * as React from 'react';
import { getSupabaseClient } from './supabase/client';
import { flushOutboxToServer, isSyncEnabled } from './sync-service';
import { peekOutbox } from './sync-outbox';

/**
 * Returns the current Supabase user id (client-side), or null if not authenticated.
 */
export function useAuthUserId() {
  const [userId, setUserId] = React.useState<string | null>(null);
  const lastFlushedUserRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    }).catch(() => setUserId(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // If auth resolves after an attempt was queued without userId, flush once per user.
  React.useEffect(() => {
    if (!isSyncEnabled()) return;
    if (!userId) return;
    if (lastFlushedUserRef.current === userId) return;
    void (async () => {
      const outbox = await peekOutbox();
      if (!outbox.length) return;
      await flushOutboxToServer(userId);
      lastFlushedUserRef.current = userId;
    })();
  }, [userId]);

  return userId;
}
