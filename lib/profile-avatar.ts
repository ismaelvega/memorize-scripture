import type { User } from "@supabase/supabase-js";

export type AvatarPreference = "photo" | "avatar";

type ProfileAvatarData = {
  avatar_seed?: string | null;
  avatar_url?: string | null;
  avatar_preference?: string | null;
  display_name?: string | null;
} | null;

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readAvatarPreference(value: unknown): AvatarPreference | null {
  return value === "photo" || value === "avatar" ? value : null;
}

export function resolveDefaultAvatarPreference(avatarUrl: string | null): AvatarPreference {
  return avatarUrl ? "photo" : "avatar";
}

export function resolveUserAvatarPresentation({
  profile,
  user,
}: {
  profile: ProfileAvatarData;
  user: User | null;
}) {
  const displayName =
    readString(profile?.display_name) ??
    readString(user?.user_metadata?.full_name) ??
    readString(user?.user_metadata?.name) ??
    readString(user?.email?.split("@")[0]) ??
    "Usuario";

  const avatarUrl =
    readString(profile?.avatar_url) ??
    readString(user?.user_metadata?.avatar_url) ??
    readString(user?.user_metadata?.picture) ??
    null;

  const avatarSeed =
    readString(profile?.avatar_seed) ??
    readString(user?.user_metadata?.avatar_seed) ??
    readString(user?.id) ??
    displayName;

  const avatarPreference =
    readAvatarPreference(profile?.avatar_preference) ??
    readAvatarPreference(user?.user_metadata?.avatar_preference) ??
    resolveDefaultAvatarPreference(avatarUrl);

  const shouldUsePhoto = avatarPreference === "photo" && Boolean(avatarUrl);

  return {
    displayName,
    avatarUrl,
    avatarSeed,
    avatarPreference,
    shouldUsePhoto,
    hasPhoto: Boolean(avatarUrl),
  };
}
