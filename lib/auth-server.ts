import { getSupabaseServerClient } from './supabase/server-client';

export async function getUserIdFromRequest(): Promise<string | null> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
