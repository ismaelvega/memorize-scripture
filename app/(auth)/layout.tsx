import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(217,119,6,0.18),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(24,24,27,0.08),transparent_34%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.12),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(251,191,36,0.08),transparent_38%),linear-gradient(180deg,#09090b_0%,#111827_100%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-55 [background-size:26px_26px] [background-image:linear-gradient(to_right,rgba(113,113,122,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(113,113,122,0.12)_1px,transparent_1px)] dark:opacity-35"
      />

      <header className="relative px-4 pb-6 pt-8 md:pt-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-neutral-900 transition-colors hover:text-amber-800 dark:text-neutral-100 dark:hover:text-amber-300"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-neutral-300/80 bg-white/90 shadow-sm dark:border-neutral-700/80 dark:bg-neutral-900/90">
              <Image
                src="/logo_png.png"
                alt="Logo Memoriza Su Palabra"
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
                priority
              />
            </span>
            <span className="text-xl font-semibold tracking-tight md:text-2xl">
              Memoriza Su Palabra
            </span>
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-4 pb-10">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="relative px-4 pb-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-300 md:flex-row">
          <p>© {new Date().getFullYear()} Memoriza Su Palabra</p>
          <nav aria-label="Enlaces legales" className="flex items-center gap-4">
            <Link
              href="/politica-de-privacidad"
              className="underline-offset-4 transition-colors hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
            >
              Política de Privacidad
            </Link>
            <Link
              href="/terminos-de-servicio"
              className="underline-offset-4 transition-colors hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
            >
              Términos de Servicio
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
