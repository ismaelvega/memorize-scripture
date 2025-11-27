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

type VerseSelection = {
  bookKey: string | null;
  chapter: number | null;
  start: number | null;
  end: number | null;
};

type Step = "book" | "chapter" | "start" | "end" | "confirm";

function parseRangeFromId(id: string | null) {
  if (!id) return { bookKey: null as string | null, chapter: 1, start: 1, end: 1 };
  const parts = id.split("-");
  if (parts.length < 5) {
    return { bookKey: parts[0] ?? null, chapter: Number(parts[1]) || 1, start: 1, end: 1 };
  }
  const end = Number(parts[parts.length - 2]);
  const start = Number(parts[parts.length - 3]);
  const chapter = Number(parts[parts.length - 4]);
  const bookKey = parts.slice(0, parts.length - 4).join("-");
  return {
    bookKey: bookKey || null,
    chapter: Number.isNaN(chapter) ? 1 : chapter,
    start: Number.isNaN(start) ? 1 : start,
    end: Number.isNaN(end) ? (Number.isNaN(start) ? 1 : start) : end,
  };
}

export default function RepasoCitasPage() {
  const router = useRouter();
  const { pushToast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [passages, setPassages] = React.useState<MemorizedPassage[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [completed, setCompleted] = React.useState<Set<string>>(new Set());
  const [bookIndex, setBookIndex] = React.useState<BookIndexEntry[]>([]);
  const [verseCounts, setVerseCounts] = React.useState<Record<string, number[]>>({});
  const [selection, setSelection] = React.useState<VerseSelection>({ bookKey: null, chapter: null, start: null, end: null });
  const [step, setStep] = React.useState<Step>("book");
  const [status, setStatus] = React.useState<"idle" | "correct" | "incorrect">("idle");

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
  const parsed = currentPassage ? parseRangeFromId(currentPassage.id) : null;
  const verse: Verse | null = currentPassage ? {
    id: currentPassage.id,
    reference: currentPassage.entry.reference,
    text: currentPassage.entry.text || "",
    translation: "RV1909",
    source: "built-in",
  } : null;
  
  // Remove verse numbers (<sup> tags) for Citas mode display
  const cleanText = React.useMemo(() => {
    if (!verse?.text) return "";
    let text = verse.text;
    // Remove <sup>N</sup> tags and their content completely
    text = text.replace(/<sup>\s*\d+\s*<\/sup>\s*(?:&nbsp;)?/gi, "");
    return sanitizeVerseText(text, false);
  }, [verse?.text]);

  const loadBookData = React.useCallback(async (bookKey: string) => {
    if (verseCounts[bookKey]) return;
    try {
      const res = await fetch(`/bible_data/${bookKey}.json`);
      if (!res.ok) throw new Error("No se pudo cargar el libro");
      const data: string[][] = await res.json();
      const counts = data.map((chapter) => chapter.length);
      setVerseCounts((prev) => ({ ...prev, [bookKey]: counts }));
    } catch (err) {
      console.error("Error cargando capítulos", err);
      pushToast({ title: "No se pudo cargar el libro", description: "Intenta nuevamente." });
    }
  }, [pushToast, verseCounts]);

  const handleSelectBook = React.useCallback((bookKey: string) => {
    setSelection({ bookKey, chapter: null, start: null, end: null });
    loadBookData(bookKey);
    setStep("chapter");
    setStatus("idle");
  }, [loadBookData]);

  const handleSelectChapter = React.useCallback((chapter: number) => {
    setSelection((prev) => ({ ...prev, chapter, start: null, end: null }));
    setStep("start");
  }, []);

  const handleSelectStart = React.useCallback((start: number) => {
    setSelection((prev) => ({ ...prev, start, end: null }));
    setStep("end");
  }, []);

  const handleSelectEnd = React.useCallback((end: number) => {
    setSelection((prev) => ({ ...prev, end }));
    setStep("confirm");
  }, []);

  const handleBack = React.useCallback(() => {
    if (step === "chapter") {
      setStep("book");
      setSelection({ bookKey: null, chapter: null, start: null, end: null });
    } else if (step === "start") {
      setStep("chapter");
      setSelection((prev) => ({ ...prev, chapter: null, start: null, end: null }));
    } else if (step === "end") {
      setStep("start");
      setSelection((prev) => ({ ...prev, start: null, end: null }));
    } else if (step === "confirm") {
      setStep("end");
      setSelection((prev) => ({ ...prev, end: null }));
    }
  }, [step]);

  const selectedBook = selection.bookKey ? bookIndex.find((b) => b.key === selection.bookKey) : null;
  const chaptersInBook = selectedBook?.chapters || 0;
  const currentCounts = selection.bookKey ? verseCounts[selection.bookKey] : undefined;
  const versesInChapter = selection.chapter && currentCounts ? currentCounts[selection.chapter - 1] || 0 : 0;

  const handleSubmit = React.useCallback(() => {
    if (!parsed || !selection.bookKey || !selection.chapter || !selection.start || !selection.end) {
      pushToast({ title: "Completa la selección", description: "Elige libro, capítulo y rango." });
      return;
    }
    const match =
      parsed.bookKey === selection.bookKey &&
      parsed.chapter === selection.chapter &&
      parsed.start === selection.start &&
      parsed.end === selection.end;

    if (match) {
      setStatus("correct");
      setCompleted((prev) => new Set([...prev, currentPassage!.id]));
    } else {
      setStatus("incorrect");
    }
  }, [currentPassage, parsed, pushToast, selection.bookKey, selection.chapter, selection.end, selection.start]);

  const goToNext = React.useCallback(() => {
    if (currentIndex < passages.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelection({ bookKey: null, chapter: null, start: null, end: null });
      setStep("book");
      setStatus("idle");
    }
  }, [currentIndex, passages.length]);

  const restart = React.useCallback(() => {
    setSelection({ bookKey: null, chapter: null, start: null, end: null });
    setStep("book");
    setStatus("idle");
  }, []);

  const bookLabel = React.useCallback((entry: BookIndexEntry) => entry.shortTitle || entry.title || entry.key, []);

  // Build selection summary for display
  const getSelectionDisplay = React.useCallback(() => {
    if (!selectedBook) return "";
    let display = bookLabel(selectedBook);
    if (selection.chapter) {
      display += ` ${selection.chapter}`;
      if (selection.start) {
        display += `:${selection.start}`;
        if (selection.end && selection.end !== selection.start) {
          display += `-${selection.end}`;
        }
      }
    }
    return display;
  }, [selectedBook, selection.chapter, selection.start, selection.end, bookLabel]);

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
        {/* Verse text - always visible */}
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 mb-4 flex-shrink-0">
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {cleanText || "Texto no disponible"}
          </p>
        </div>

        {/* Correct feedback */}
        {status === "correct" && (
          <div className="flex-1 flex flex-col space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center flex-shrink-0">
                <Check className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">¡Correcto!</p>
                <p className="text-xs text-green-700 dark:text-green-300">{verse?.reference}</p>
              </div>
            </div>
            <Button onClick={goToNext} className="w-full h-14 rounded-xl text-lg font-semibold">
              <ArrowRight className="h-6 w-6 mr-2" />
              Siguiente
            </Button>
          </div>
        )}

        {/* Incorrect feedback */}
        {status === "incorrect" && (
          <div className="flex-1 flex flex-col space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                <X className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">Incorrecto</p>
                <p className="text-xs text-red-700 dark:text-red-300">Tu respuesta: {getSelectionDisplay()}</p>
              </div>
            </div>
            <Button onClick={restart} variant="outline" className="w-full h-12 rounded-xl">
              <RotateCcw className="h-5 w-5 mr-2" />
              Intentar de nuevo
            </Button>
          </div>
        )}

        {/* Step-based selection flow */}
        {status === "idle" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Back button and current selection */}
            {step !== "book" && (
              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <button
                  onClick={handleBack}
                  className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex-shrink-0"
                  aria-label="Volver"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {getSelectionDisplay() || "..."}
                  </p>
                </div>
              </div>
            )}

            {/* Step: Book selection */}
            {step === "book" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex-shrink-0">
                  📖 ¿En qué libro está?
                </p>
                <div className="flex-1 overflow-y-auto -mx-4 px-4">
                  <div className="grid grid-cols-2 gap-2 pb-4">
                    {bookIndex.map((book) => (
                      <button
                        key={book.key}
                        onClick={() => handleSelectBook(book.key)}
                        className="h-14 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-base font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors text-left truncate"
                      >
                        {bookLabel(book)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Chapter selection */}
            {step === "chapter" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex-shrink-0">
                  📑 ¿Qué capítulo?
                </p>
                <div className="flex-1 overflow-y-auto -mx-4 px-4">
                  <div className="grid grid-cols-5 gap-2 pb-4">
                    {Array.from({ length: chaptersInBook }, (_, i) => i + 1).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => handleSelectChapter(ch)}
                        className="h-14 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-lg font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors"
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Start verse selection */}
            {step === "start" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex-shrink-0">
                  🔢 ¿En qué versículo <span className="text-green-600 dark:text-green-400">comienza</span>?
                </p>
                <div className="flex-1 overflow-y-auto -mx-4 px-4">
                  <div className="grid grid-cols-5 gap-2 pb-4">
                    {Array.from({ length: versesInChapter }, (_, i) => i + 1).map((v) => (
                      <button
                        key={v}
                        onClick={() => handleSelectStart(v)}
                        className="h-14 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-lg font-semibold text-neutral-900 dark:text-neutral-100 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 active:bg-green-100 dark:active:bg-green-900/40 transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step: End verse selection */}
            {step === "end" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex-shrink-0">
                  🔢 ¿En qué versículo <span className="text-blue-600 dark:text-blue-400">termina</span>?
                </p>
                <div className="flex-1 overflow-y-auto -mx-4 px-4">
                  <div className="grid grid-cols-5 gap-2 pb-4">
                    {Array.from({ length: versesInChapter }, (_, i) => i + 1).map((v) => {
                      const isBeforeStart = selection.start && v < selection.start;
                      const isStart = selection.start === v;

                      return (
                        <button
                          key={v}
                          onClick={() => !isBeforeStart && handleSelectEnd(v)}
                          disabled={!!isBeforeStart}
                          className={cn(
                            "h-14 rounded-xl border-2 text-lg font-semibold transition-colors",
                            isBeforeStart
                              ? "border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                              : isStart
                              ? "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/40"
                          )}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 py-2 flex-shrink-0">
                  💡 Si es un solo versículo, toca el <span className="font-semibold text-green-600 dark:text-green-400">{selection.start}</span> otra vez
                </p>
              </div>
            )}

            {/* Step: Confirm */}
            {step === "confirm" && (
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center space-y-3 py-6">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Tu respuesta es:</p>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                    {getSelectionDisplay()}
                  </p>
                </div>
                <div className="space-y-3 pt-4">
                  <Button onClick={handleSubmit} className="w-full h-14 rounded-xl text-lg font-semibold">
                    <Check className="h-6 w-6 mr-2" />
                    Verificar
                  </Button>
                  <Button variant="outline" onClick={restart} className="w-full h-12 rounded-xl">
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Volver a la selección
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
