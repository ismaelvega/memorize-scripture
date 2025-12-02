"use client";

import * as React from 'react';
import { getSupabaseClient } from './supabase/client';

/**
 * Returns the current Supabase user id (client-side), or null if not authenticated.
 */
export function useAuthUserId() {
  const [userId, setUserId] = React.useState<string | null>(null);

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

  return userId;
}
