"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildOAuthCallbackRedirect } from "@/lib/auth/oauth";
import { useToast } from "@/components/ui/toast";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const shownAuthErrorRef = useRef<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const authError = searchParams.get("error");

  useEffect(() => {
    if (!authError) return;
    if (shownAuthErrorRef.current === authError) return;
    shownAuthErrorRef.current = authError;

    if (authError === "oauth_failed") {
      pushToast({
        variant: "destructive",
        title: "No se pudo iniciar con Google",
        description: "Intenta de nuevo o usa correo y contraseña.",
      });
    }
  }, [authError, pushToast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      pushToast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor ingresa tu correo y contraseña.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let message = "No se pudo iniciar sesión. Verifica tus credenciales.";
        if (error.message.includes("Invalid login credentials")) {
          message = "Correo o contraseña incorrectos.";
        } else if (error.message.includes("Email not confirmed")) {
          message = "Confirma tu correo electrónico antes de iniciar sesión.";
        }
        pushToast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: message,
        });
        return;
      }

      pushToast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente.",
      });

      router.push("/practice");
      router.refresh();
    } catch {
      pushToast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);

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
          description: "Intenta de nuevo en unos segundos.",
        });
      }
    } catch {
      pushToast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado. Intenta de nuevo.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden border-neutral-200/70 bg-white/95 shadow-[0_26px_65px_-34px_rgba(15,23,42,0.65)] backdrop-blur-sm dark:border-neutral-700/70 dark:bg-neutral-900/95">
      <CardHeader className="space-y-2 border-b border-neutral-200/80 bg-white/80 px-6 pb-5 pt-6 text-center dark:border-neutral-700/80 dark:bg-neutral-900/70">
        <CardTitle className="text-3xl tracking-tight">Iniciar Sesión</CardTitle>
        <CardDescription className="text-sm text-neutral-600 dark:text-neutral-300">
          Accede a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6 pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Correo electrónico
            </label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isLoading || isGoogleLoading}
              className="h-11 border-neutral-300/90 bg-white dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-amber-800 underline-offset-4 transition-colors hover:text-amber-700 hover:underline dark:text-amber-300 dark:hover:text-amber-200"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading || isGoogleLoading}
                className="h-11 border-neutral-300/90 bg-white pr-10 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-md bg-neutral-900 text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            size="lg"
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            <span>o</span>
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirigiendo...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="mr-2 h-4 w-4">
                  <path fill="#EA4335" d="M12 10.1v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6.1-2.7-6.1-6.1S8.7 5.5 12 5.5c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3 14.6 2 12 2 6.8 2 2.6 6.2 2.6 11.4S6.8 20.8 12 20.8c6.9 0 9.2-4.8 9.2-7.3 0-.5 0-.9-.1-1.3z" />
                  <path fill="#34A853" d="M3.2 7.3 6.2 9.5C7 7.8 9.3 5.5 12 5.5c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3 14.6 2 12 2 8.2 2 4.9 4.1 3.2 7.3z" />
                  <path fill="#FBBC05" d="M12 20.8c2.5 0 4.7-.8 6.3-2.3L15.4 16c-.8.6-1.9 1.1-3.4 1.1-4 0-5.3-2.5-5.5-3.8L3.4 15.6C5.1 18.8 8.3 20.8 12 20.8z" />
                  <path fill="#4285F4" d="M21.2 13.5c0-.5 0-.9-.1-1.3H12v3.9h5.5c-.3 1.4-1.1 2.4-2 3l2.9 2.3c1.7-1.6 2.8-4 2.8-7.9z" />
                </svg>
                Continuar con Google
              </>
            )}
          </Button>
        </form>

        <div className="border-t border-neutral-200/80 pt-5 text-center text-sm text-neutral-600 dark:border-neutral-800/80 dark:text-neutral-300">
          ¿No tienes una cuenta?{" "}
          <Link
            href="/signup"
            className="font-semibold text-neutral-900 underline-offset-4 transition-colors hover:text-amber-800 hover:underline dark:text-neutral-100 dark:hover:text-amber-300"
          >
            Regístrate
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
