"use client";

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import type { AppSupabaseClient } from '@/lib/supabase/types';

type BrowserClient = AppSupabaseClient;

let client: BrowserClient | null = null;

export function getSupabaseClient(): BrowserClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  client = createBrowserClient<Database>(url, anonKey) as unknown as BrowserClient;

  return client;
}
