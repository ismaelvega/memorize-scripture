"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, Loader2, RotateCcw, Trophy, X } from "lucide-react";
import type { BookIndexEntry } from "@/components/mobile/flow";
import { loadProgress } from "@/lib/storage";
import { sanitizeVerseText } from "@/lib/sanitize";
import { getMemorizedPassages, shuffleArray, type MemorizedPassage } from "@/lib/review";
import { useToast } from "@/components/ui/toast";
import type { Verse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CitasChallenge } from "@/components/citas-challenge";

export default function RepasoCitasPage() {
  const router = useRouter();
  const { pushToast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [passages, setPassages] = React.useState<MemorizedPassage[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [completed, setCompleted] = React.useState<Set<string>>(new Set());
  const [bookIndex, setBookIndex] = React.useState<BookIndexEntry[]>([]);

  // Bootstrap: load passages & shuffle
  React.useEffect(() => {
    async function bootstrap() {
      try {
        const progress = loadProgress();
        const memorized = getMemorizedPassages(progress);
        if (memorized.length === 0) {
          setPassages([]);
          return;
        }
        const shuffled = shuffleArray(memorized);
        setPassages(shuffled);
        setCurrentIndex(0);
        setCompleted(new Set());
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  // Load book index
  React.useEffect(() => {
    let active = true;
    async function loadIndex() {
      try {
        const res = await fetch("/bible_data/_index.json");
        if (!res.ok) throw new Error("No se pudo cargar el índice");
        const data: BookIndexEntry[] = await res.json();
        if (!active) return;
        setBookIndex(data);
      } catch (err) {
        console.error("Error cargando índice de libros", err);
        if (active) setBookIndex([]);
      }
    }
    loadIndex();
    return () => { active = false; };
  }, []);

  const currentPassage = passages[currentIndex] ?? null;
  const verse: Verse | null = currentPassage ? {
    id: currentPassage.id,
    reference: currentPassage.entry.reference,
    text: currentPassage.entry.text || "",
    translation: "RV1909",
    source: "built-in",
  } : null;

  const handleComplete = React.useCallback((success: boolean) => {
    if (success && currentPassage) {
      setCompleted((prev) => new Set([...prev, currentPassage.id]));
    }
  }, [currentPassage]);

  const goToNext = React.useCallback(() => {
    if (currentIndex < passages.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, passages.length]);

  const progressPct = passages.length > 0 ? Math.round((completed.size / passages.length) * 100) : 0;
  const allDone = passages.length > 0 && completed.size === passages.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (passages.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center">
          <X className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
        </div>
        <div className="space-y-2">
          <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Sin pasajes memorizados</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[280px]">
            Completa al menos un pasaje con 3 intentos perfectos para usar Citas.
          </p>
        </div>
        <div className="flex gap-2 w-full max-w-sm">
          <Button onClick={() => router.push("/repaso")} className="flex-1 rounded-full">Volver a repaso</Button>
          <Button variant="outline" onClick={() => router.push("/practice")} className="flex-1 rounded-full">Ir a práctica</Button>
        </div>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-xl">
          <Trophy className="h-10 w-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">¡Citas completas!</h1>
          <p className="text-base text-neutral-600 dark:text-neutral-400">
            Identificaste los {passages.length} pasajes correctamente.
          </p>
        </div>
        <div className="flex gap-2 w-full max-w-sm">
          <Button onClick={() => router.push("/repaso")} className="flex-1 rounded-full h-12">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver a repaso
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Citas</p>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">¿Dónde está este pasaje?</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/repaso")}
            className="h-10 w-10 rounded-full"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Pasaje {currentIndex + 1} de {passages.length}</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-4 pb-4 flex flex-col">
        {verse && (
          <CitasChallenge
            verse={verse}
            bookIndex={bookIndex}
            onComplete={handleComplete}
            onNext={goToNext}
          />
        )}
      </div>
    </div>
  );
}
