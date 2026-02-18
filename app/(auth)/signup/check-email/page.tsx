import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <Card className="overflow-hidden border-neutral-200/70 bg-white/95 shadow-[0_26px_65px_-34px_rgba(15,23,42,0.65)] backdrop-blur-sm dark:border-neutral-700/70 dark:bg-neutral-900/95">
      <CardHeader className="space-y-2 border-b border-neutral-200/80 bg-white/80 px-6 pb-5 pt-6 text-center dark:border-neutral-700/80 dark:bg-neutral-900/70">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20">
          <Mail className="h-8 w-8 text-amber-700 dark:text-amber-300" />
        </div>
        <CardTitle className="text-3xl tracking-tight">Revisa tu correo</CardTitle>
        <CardDescription className="text-sm text-neutral-600 dark:text-neutral-300">
          Te hemos enviado un enlace de confirmación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6 pt-5">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300">
          <p>
            Haz clic en el enlace que te enviamos para activar tu cuenta. Si no lo ves en tu bandeja de entrada, revisa la carpeta de spam.
          </p>
        </div>

        <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
          <p className="text-center text-sm text-neutral-600 dark:text-neutral-300">
            ¿No recibiste el correo?
          </p>
          <Button variant="outline" className="h-11 w-full border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800" asChild>
            <Link href="/signup">
              Intenta registrarte de nuevo
            </Link>
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
