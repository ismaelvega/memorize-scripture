"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Check, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { getSupabaseClient } from "@/lib/supabase/client";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "Al menos 8 caracteres", test: (p) => p.length >= 8 },
  { label: "Una letra mayúscula", test: (p) => /[A-Z]/.test(p) },
  { label: "Una letra minúscula", test: (p) => /[a-z]/.test(p) },
  { label: "Un número", test: (p) => /[0-9]/.test(p) },
];

const shellCardClass = "overflow-hidden border-neutral-200/70 bg-white/95 shadow-[0_26px_65px_-34px_rgba(15,23,42,0.65)] backdrop-blur-sm dark:border-neutral-700/70 dark:bg-neutral-900/95";
const shellHeaderClass = "space-y-2 border-b border-neutral-200/80 bg-white/80 px-6 pb-5 pt-6 text-center dark:border-neutral-700/80 dark:bg-neutral-900/70";

function ResetPasswordPageInner() {
  const router = useRouter();
  const { pushToast } = useToast();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const allRequirementsMet = passwordRequirements.every((req) => req.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      try {
        const supabase = getSupabaseClient();
        const accessToken = searchParams?.get("access_token");
        const refreshToken = searchParams?.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error || !data.session) {
            if (isMounted) {
              setIsValidSession(false);
            }
            return;
          }

          if (isMounted) {
            setIsValidSession(true);
            router.replace("/reset-password");
          }
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (isMounted) {
          setIsValidSession(!!session);
        }
      } catch {
        if (isMounted) {
          setIsValidSession(false);
        }
      }
    }

    hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [router, searchParamsString]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!password || !confirmPassword) {
      pushToast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor completa todos los campos.",
      });
      return;
    }

    if (!allRequirementsMet) {
      pushToast({
        variant: "destructive",
        title: "Contraseña débil",
        description: "Tu contraseña no cumple con los requisitos mínimos.",
      });
      return;
    }

    if (password !== confirmPassword) {
      pushToast({
        variant: "destructive",
        title: "Contraseñas no coinciden",
        description: "Verifica que las contraseñas sean iguales.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        pushToast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar la contraseña. Intenta de nuevo.",
        });
        return;
      }

      setIsSuccess(true);
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

  if (isValidSession === null) {
    return (
      <Card className={shellCardClass}>
        <CardContent className="px-6 py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-100 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-500 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Verificando enlace...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isValidSession) {
    return (
      <Card className={shellCardClass}>
        <CardHeader className={shellHeaderClass}>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20">
            <X className="h-8 w-8 text-red-600 dark:text-red-300" />
          </div>
          <CardTitle className="text-3xl tracking-tight">Enlace inválido</CardTitle>
          <CardDescription className="text-sm text-neutral-600 dark:text-neutral-300">
            Este enlace ha expirado o ya fue utilizado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-6 pb-6 pt-5">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300">
            Los enlaces de recuperación tienen vigencia limitada por seguridad. Solicita uno nuevo para continuar.
          </div>

          <div className="grid gap-3">
            <Button
              asChild
              className="h-11 rounded-md bg-neutral-900 text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <Link href="/forgot-password">Solicitar nuevo enlace</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-11 border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              <Link href="/login">Ir a inicio de sesión</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className={shellCardClass}>
        <CardHeader className={shellHeaderClass}>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-900/20">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
          </div>
          <CardTitle className="text-3xl tracking-tight">¡Contraseña actualizada!</CardTitle>
          <CardDescription className="text-sm text-neutral-600 dark:text-neutral-300">
            Tu nueva contraseña ya está activa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-6 pb-6 pt-5">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-300">
            Ya puedes iniciar sesión con tu nueva contraseña y seguir practicando.
          </div>

          <div className="grid gap-3">
            <Button
              onClick={() => router.push("/practice")}
              size="lg"
              className="h-11 rounded-md bg-neutral-900 text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Ir a practicar
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-11 border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              <Link href="/login">Ir a inicio de sesión</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={shellCardClass}>
      <CardHeader className={shellHeaderClass}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
          Restablece tu acceso
        </p>
        <CardTitle className="text-3xl tracking-tight">Nueva contraseña</CardTitle>
        <CardDescription className="text-sm text-neutral-600 dark:text-neutral-300">
          Elige una contraseña segura para proteger tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Nueva contraseña
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowRequirements(true)}
                autoComplete="new-password"
                disabled={isLoading}
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

            {showRequirements && password.length > 0 && (
              <ul className="mt-2 grid gap-1.5">
                {passwordRequirements.map((req, idx) => {
                  const met = req.test(password);
                  return (
                    <li
                      key={idx}
                      className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${
                        met
                          ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                      }`}
                    >
                      {met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      {req.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Confirmar contraseña
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
                className="h-11 border-neutral-300/90 bg-white pr-10 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                  passwordsMatch
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                    : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                }`}
              >
                {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-md bg-neutral-900 text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            size="lg"
            disabled={isLoading || !allRequirementsMet || !passwordsMatch}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar contraseña"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">Cargando...</div>}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
