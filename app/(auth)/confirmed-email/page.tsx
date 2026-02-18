"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";

type ConfirmationStatus = "loading" | "success" | "error";

export default function ConfirmedEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ConfirmationStatus>("loading");

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = getSupabaseClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          setStatus("error");
          return;
        }

        if (session) {
          setStatus("success");
        } else {
          // User might have confirmed email but needs to log in
          setStatus("success");
        }
      } catch (err) {
        console.error("Confirmation check error:", err);
        setStatus("error");
      }
    }

    // Small delay to allow Supabase to process the confirmation
    const timer = setTimeout(checkSession, 500);
    return () => clearTimeout(timer);
  }, []);

  if (status === "loading") {
    return (
      <Card className="overflow-hidden border-neutral-200/70 bg-white/95 shadow-[0_26px_65px_-34px_rgba(15,23,42,0.65)] backdrop-blur-sm dark:border-neutral-700/70 dark:bg-neutral-900/95">
        <CardContent className="px-6 py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-100 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-500 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Verificando tu cuenta...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="overflow-hidden border-neutral-200/70 bg-white/95 shadow-[0_26px_65px_-34px_rgba(15,23,42,0.65)] backdrop-blur-sm dark:border-neutral-700/70 dark:bg-neutral-900/95">
        <CardHeader className="space-y-2 border-b border-neutral-200/80 bg-white/80 px-6 pb-5 pt-6 text-center dark:border-neutral-700/80 dark:bg-neutral-900/70">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-300" />
          </div>
          <CardTitle className="text-3xl tracking-tight">Error de verificación</CardTitle>
          <CardDescription className="text-sm text-neutral-600 dark:text-neutral-300">
            No pudimos verificar tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-6 pb-6 pt-5">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300">
            <p>
              El enlace puede haber expirado o ya fue utilizado. Si continúas teniendo problemas, intenta registrarte de nuevo.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild className="h-11 rounded-md bg-neutral-900 text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200">
              <Link href="/signup">Registrarse de nuevo</Link>
            </Button>
            <Button variant="outline" asChild className="h-11 border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800">
              <Link href="/login">Ir a inicio de sesión</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-neutral-200/70 bg-white/95 shadow-[0_26px_65px_-34px_rgba(15,23,42,0.65)] backdrop-blur-sm dark:border-neutral-700/70 dark:bg-neutral-900/95">
      <CardHeader className="space-y-2 border-b border-neutral-200/80 bg-white/80 px-6 pb-5 pt-6 text-center dark:border-neutral-700/80 dark:bg-neutral-900/70">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-900/20">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
        </div>
        <CardTitle className="text-3xl tracking-tight">¡Cuenta verificada!</CardTitle>
        <CardDescription className="text-sm text-neutral-600 dark:text-neutral-300">
          Tu correo ha sido confirmado exitosamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6 pt-5">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-300">
          <p>
            Ya puedes acceder a todas las funciones de la aplicación. Tu progreso se sincronizará automáticamente.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => router.push("/practice")}
            size="lg"
            className="h-11 w-full rounded-md bg-neutral-900 text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Comenzar a practicar
          </Button>
          <Button variant="outline" asChild className="h-11 border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800">
            <Link href="/login">Ir a inicio de sesión</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
