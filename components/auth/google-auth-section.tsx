"use client";

import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildOAuthCallbackRedirect } from "@/lib/auth/oauth";
import { getGoogleAuthErrorCopy, signInWithGoogleIdToken } from "@/lib/auth/google-auth";
import { getSupabaseClient } from "@/lib/supabase/client";

type GoogleAuthMode = "login" | "signup";

const googleClientIdConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim());

interface GoogleAuthSectionProps {
  mode: GoogleAuthMode;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSignedIn: () => void;
}

export function GoogleAuthSection({
  mode,
  disabled = false,
  onBusyChange,
  onSignedIn,
}: GoogleAuthSectionProps) {
  const { pushToast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showRedirectFallback, setShowRedirectFallback] = useState(!googleClientIdConfigured);

  function setBusy(nextBusy: boolean) {
    setIsGoogleLoading(nextBusy);
    onBusyChange?.(nextBusy);
  }

  async function handleCredentialSuccess(credentialResponse: CredentialResponse) {
    setBusy(true);

    const result = await signInWithGoogleIdToken(credentialResponse.credential);

    if (result.ok) {
      pushToast({
        title: mode === "login" ? "¡Bienvenido!" : "¡Cuenta lista!",
        description:
          mode === "login"
            ? "Has iniciado sesión correctamente con Google."
            : "Tu cuenta de Google se conectó correctamente.",
      });
      setBusy(false);
      onSignedIn();
      return;
    }

    const code = result.code ?? "google_auth_failed";
    pushToast({
      variant: "destructive",
      ...getGoogleAuthErrorCopy(code),
    });
    setShowRedirectFallback(true);
    setBusy(false);
  }

  function handleCredentialError() {
    setBusy(false);
    pushToast({
      variant: "destructive",
      title: "No se pudo abrir Google",
      description: "Permite popups o usa el método de redirección.",
    });
    setShowRedirectFallback(true);
  }

  async function handleRedirectFallback() {
    setBusy(true);

    try {
      const supabase = getSupabaseClient();
      const redirectTo = buildOAuthCallbackRedirect("/", window.location.origin);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        pushToast({
          variant: "destructive",
          title: "No se pudo iniciar con Google",
          description: "Intenta nuevamente en unos segundos.",
        });
      }
    } catch {
      pushToast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado. Intenta de nuevo.",
      });
    } finally {
      setBusy(false);
    }
  }

  const isDisabled = disabled || isGoogleLoading;

  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
        O continúa con tu cuenta de Google.
      </p>

      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        <span>o</span>
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      {!googleClientIdConfigured ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200">
          Google popup no está configurado. Usaremos acceso por redirección.
        </p>
      ) : isDisabled ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full border-neutral-300 bg-white text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          disabled
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Procesando Google...
        </Button>
      ) : (
        <div className="flex justify-center rounded-md border border-neutral-300 bg-white px-2 py-2 dark:border-neutral-700 dark:bg-neutral-900">
          <GoogleLogin
            onSuccess={handleCredentialSuccess}
            onError={handleCredentialError}
            text="continue_with"
            theme="outline"
            size="large"
            shape="pill"
            logo_alignment="left"
            locale="es"
          />
        </div>
      )}

      {showRedirectFallback && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          onClick={handleRedirectFallback}
          disabled={isDisabled}
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirigiendo...
            </>
          ) : (
            "Continuar con Google (redirección)"
          )}
        </Button>
      )}
    </div>
  );
}
