"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      pushToast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Por favor ingresa tu correo electrónico.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        pushToast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo enviar el correo. Verifica tu dirección e intenta de nuevo.",
        });
        return;
      }

      setEmailSent(true);
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

  if (emailSent) {
    return (
      <Card className="overflow-hidden border-neutral-200/70 bg-white/95 shadow-[0_26px_65px_-34px_rgba(15,23,42,0.65)] backdrop-blur-sm dark:border-neutral-700/70 dark:bg-neutral-900/95">
        <CardHeader className="space-y-2 border-b border-neutral-200/80 bg-white/80 px-6 pb-5 pt-6 text-center dark:border-neutral-700/80 dark:bg-neutral-900/70">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20">
            <Mail className="h-8 w-8 text-amber-700 dark:text-amber-300" />
          </div>
          <CardTitle className="text-3xl tracking-tight">Revisa tu correo</CardTitle>
          <CardDescription className="text-sm text-neutral-600 dark:text-neutral-300">
            Te enviamos un enlace para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6 pt-5">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300">
            <p>
              Si existe una cuenta con el correo <strong className="text-neutral-900 dark:text-neutral-100">{email}</strong>, recibirás un enlace para crear una nueva contraseña.
            </p>
          </div>

          <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
            <p className="text-center text-sm text-neutral-600 dark:text-neutral-300">
              ¿No recibiste el correo?
            </p>
            <Button
              variant="outline"
              className="h-11 w-full border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => setEmailSent(false)}
            >
              Intentar con otro correo
            </Button>
          </div>

          <div>
            <Button variant="ghost" className="h-10 w-full text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800" asChild>
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-neutral-200/70 bg-white/95 shadow-[0_26px_65px_-34px_rgba(15,23,42,0.65)] backdrop-blur-sm dark:border-neutral-700/70 dark:bg-neutral-900/95">
      <CardHeader className="space-y-2 border-b border-neutral-200/80 bg-white/80 px-6 pb-5 pt-6 text-center dark:border-neutral-700/80 dark:bg-neutral-900/70">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
          Recuperación segura
        </p>
        <CardTitle className="text-3xl tracking-tight">¿Olvidaste tu contraseña?</CardTitle>
        <CardDescription className="text-sm text-neutral-600 dark:text-neutral-300">
          Ingresa tu correo y te enviaremos un enlace para restablecerla
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
              disabled={isLoading}
              className="h-11 border-neutral-300/90 bg-white dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-md bg-neutral-900 text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar enlace de recuperación"
            )}
          </Button>
        </form>

        <div className="border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
          <Button variant="ghost" className="h-10 w-full text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800" asChild>
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
