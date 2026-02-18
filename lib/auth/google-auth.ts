"use client";

import { bootstrapProfileFromUser } from "@/lib/auth/profile-bootstrap";
import { getSupabaseClient } from "@/lib/supabase/client";

export type GoogleAuthErrorCode =
  | "google_token_missing"
  | "google_auth_failed"
  | "google_user_missing";

export interface GoogleAuthResult {
  ok: boolean;
  code?: GoogleAuthErrorCode;
}

export function getGoogleAuthErrorCopy(code: GoogleAuthErrorCode): {
  title: string;
  description: string;
} {
  switch (code) {
    case "google_token_missing":
      return {
        title: "No se pudo validar Google",
        description: "No recibimos un token válido de Google. Intenta nuevamente.",
      };
    case "google_user_missing":
      return {
        title: "No se pudo iniciar con Google",
        description: "No obtuvimos datos de usuario. Vuelve a intentarlo.",
      };
    case "google_auth_failed":
    default:
      return {
        title: "No se pudo iniciar con Google",
        description: "Hubo un problema al autenticar tu cuenta. Intenta otra vez.",
      };
  }
}

export async function signInWithGoogleIdToken(idToken: string | null | undefined): Promise<GoogleAuthResult> {
  const trimmed = idToken?.trim();
  if (!trimmed) {
    return { ok: false, code: "google_token_missing" };
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: trimmed,
    });

    if (error) {
      return { ok: false, code: "google_auth_failed" };
    }

    if (!data.user) {
      return { ok: false, code: "google_user_missing" };
    }

    await bootstrapProfileFromUser(supabase, data.user);

    return { ok: true };
  } catch {
    return { ok: false, code: "google_auth_failed" };
  }
}
