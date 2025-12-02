"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2, Check, X, CheckCircle2 } from "lucide-react";
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

export default function ChangePasswordPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const allRequirementsMet = passwordRequirements.every((req) => req.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

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

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/profile">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Cambiar contraseña
            </h1>
          </div>
        </header>

        <main className="px-4 py-6 max-w-lg mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">¡Contraseña actualizada!</CardTitle>
              <CardDescription className="text-base">
                Tu contraseña ha sido cambiada exitosamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/profile")} size="lg" className="w-full">
                Volver al perfil
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Cambiar contraseña
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Nueva contraseña</CardTitle>
            <CardDescription>
              Ingresa tu nueva contraseña para tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
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
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password requirements */}
                {showRequirements && password.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {passwordRequirements.map((req, idx) => {
                      const met = req.test(password);
                      return (
                        <li
                          key={idx}
                          className={`flex items-center gap-2 text-xs ${
                            met ? "text-green-600 dark:text-green-400" : "text-neutral-500 dark:text-neutral-400"
                          }`}
                        >
                          {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {req.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
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
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-xs flex items-center gap-1 ${passwordsMatch ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                    {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
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
      </main>
    </div>
  );
}
