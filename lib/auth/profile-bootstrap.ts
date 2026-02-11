import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveDisplayName(user: User): string | null {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return (
    readString(metadata.full_name) ??
    readString(metadata.name) ??
    readString(user.email?.split('@')[0]) ??
    null
  );
}

function resolveAvatarUrl(user: User): string | null {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return readString(metadata.avatar_url) ?? readString(metadata.picture) ?? null;
}

export async function bootstrapProfileFromUser(
  supabase: SupabaseClient<Database>,
  user: User
): Promise<void> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, avatar_seed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) return;

    const hasMissingFields =
      !profile ||
      !profile.display_name ||
      !profile.avatar_url ||
      !profile.avatar_seed;

    if (!hasMissingFields) return;

    const nextDisplayName = profile?.display_name ?? resolveDisplayName(user);
    const nextAvatarUrl = profile?.avatar_url ?? resolveAvatarUrl(user);
    const nextAvatarSeed = profile?.avatar_seed ?? user.id ?? nextDisplayName ?? null;

    await supabase.from('profiles').upsert(
      {
        user_id: user.id,
        display_name: nextDisplayName,
        avatar_url: nextAvatarUrl,
        avatar_seed: nextAvatarSeed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch {
    // Ignore profile bootstrap failures so OAuth login can still complete.
  }
}
