import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type ServerClient = ReturnType<typeof createServerClient>;

function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  };
}

export async function getSupabaseServerClient(): Promise<ServerClient> {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables.');
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // ignore if called in a context where cookies are read-only
        }
      },
    },
  });
}
