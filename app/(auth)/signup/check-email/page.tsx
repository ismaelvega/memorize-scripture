import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Mail className="h-8 w-8 text-neutral-600 dark:text-neutral-300" />
        </div>
        <CardTitle className="text-2xl">Revisa tu correo</CardTitle>
        <CardDescription className="text-base">
          Te hemos enviado un enlace de confirmación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-neutral-100 dark:bg-neutral-800 p-4 text-sm text-neutral-700 dark:text-neutral-300">
          <p>
            Haz clic en el enlace que te enviamos para activar tu cuenta. Si no lo ves en tu bandeja de entrada, revisa la carpeta de spam.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-center text-neutral-600 dark:text-neutral-400">
            ¿No recibiste el correo?
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/signup">
              Intenta registrarte de nuevo
            </Link>
          </Button>
        </div>

        <div className="pt-2">
          <Button variant="ghost" className="w-full" asChild>
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
