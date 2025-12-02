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
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-neutral-400" />
            <p className="text-neutral-600 dark:text-neutral-400">
              Verificando tu cuenta...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Error de verificación</CardTitle>
          <CardDescription className="text-base">
            No pudimos verificar tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 p-4 text-sm text-neutral-700 dark:text-neutral-300">
            <p>
              El enlace puede haber expirado o ya fue utilizado. Si continúas teniendo problemas, intenta registrarte de nuevo.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/signup">Registrarse de nuevo</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Ir a inicio de sesión</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-2xl">¡Cuenta verificada!</CardTitle>
        <CardDescription className="text-base">
          Tu correo ha sido confirmado exitosamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-200">
          <p>
            Ya puedes acceder a todas las funciones de la aplicación. Tu progreso se sincronizará automáticamente.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={() => router.push("/practice")} size="lg" className="w-full">
            Comenzar a practicar
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Ir a inicio de sesión</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
