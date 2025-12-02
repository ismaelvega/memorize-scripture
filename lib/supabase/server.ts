import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';

type GenericClient = SupabaseClient<any, 'public', any>;

function assertServerSide() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase server client should only be used on the server.');
  }
}

function getEnv() {
  return {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getSupabaseEnvStatus() {
  const { url, anonKey, serviceRoleKey } = getEnv();
  return {
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey),
    hasServiceRoleKey: Boolean(serviceRoleKey),
  };
}

function createSupabaseClient(key: string): GenericClient {
  const { url } = getEnv();
  if (!url) {
    throw new Error('SUPABASE_URL is not configured.');
  }
  if (!key) {
    throw new Error('Supabase key is not configured.');
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Server-only client using the service role key. Never expose this to the client.
 */
export function getSupabaseServiceRoleClient(): GenericClient {
  assertServerSide();
  const { serviceRoleKey } = getEnv();
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }
  return createSupabaseClient(serviceRoleKey);
}

/**
 * Server-only client using the anon key. Useful for read-only checks.
 */
export function getSupabaseAnonClient(): GenericClient {
  assertServerSide();
  const { anonKey } = getEnv();
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is not configured.');
  }
  return createSupabaseClient(anonKey);
}

export function isSchemaMissing(error: PostgrestError | null | undefined) {
  return Boolean(error && (error as PostgrestError).code === '42P01');
}
