import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-transparent">
      <Card className="max-w-xl w-full text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-3">
            <span className="text-3xl">Página no encontrada</span>
          </CardTitle>
          <CardDescription>
            Lo sentimos — no pudimos encontrar la página que buscas.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div className="text-6xl leading-none">🔎</div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-lg">
              Puede que la dirección sea incorrecta o que la página haya sido movida. Puedes ir directamente a práctica o volver al inicio.
            </p>

            <div className="flex gap-3 mt-4">
              <Link href="/practice">
                <Button>Ir a Práctica</Button>
              </Link>

              <Link href="/">
                <Button variant="outline">Volver al inicio</Button>
              </Link>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-4">
              Si crees que esto es un error, revisa la URL o vuelve a la página principal.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
