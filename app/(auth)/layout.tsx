import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="flex items-center justify-center py-8 px-4">
        <Link href="/" className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
          <BookOpen className="h-8 w-8" />
          <span className="text-xl font-semibold">Memoriza Su Palabra</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
        <p>© {new Date().getFullYear()} Memoriza Su Palabra</p>
      </footer>
    </div>
  );
}
