"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, RotateCcw, X } from "lucide-react";
import type { BookIndexEntry } from "@/components/mobile/flow";
import type { Verse } from "@/lib/types";
import { sanitizeVerseText } from "@/lib/sanitize";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface CitasRoundProps {
  verse: Verse;
  parsed: {
    bookKey: string | null;
    chapter: number;
    start: number;
    end: number;
  };
  bookIndex: BookIndexEntry[];
  onResult: (correct: boolean) => void;
}

type Step = "book" | "chapter" | "start" | "end" | "confirm";

export function CitasRound({ verse, parsed, bookIndex, onResult }: CitasRoundProps) {
  const { pushToast } = useToast();
  const [step, setStep] = React.useState<Step>("book");
  const [selection, setSelection] = React.useState<{
    bookKey: string | null;
    chapter: number | null;
    start: number | null;
    end: number | null;
  }>({ bookKey: null, chapter: null, start: null, end: null });
  const [verseCounts, setVerseCounts] = React.useState<Record<string, number[]>>({});
  const [status, setStatus] = React.useState<"idle" | "correct" | "incorrect">("idle");

  // Reset on verse change
  React.useEffect(() => {
    setSelection({ bookKey: null, chapter: null, start: null, end: null });
    setStep("book");
    setStatus("idle");
  }, [verse.id]);

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

  const handleSubmit = React.useCallback(() => {
    if (!selection.bookKey || !selection.chapter || !selection.start || !selection.end) {
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
      onResult(true);
    } else {
      setStatus("incorrect");
      onResult(false);
    }
  }, [onResult, parsed.bookKey, parsed.chapter, parsed.end, parsed.start, selection.bookKey, selection.chapter, selection.end, selection.start, pushToast]);

  const restart = React.useCallback(() => {
    setSelection({ bookKey: null, chapter: null, start: null, end: null });
    setStep("book");
    setStatus("idle");
  }, []);

  const bookLabel = React.useCallback((entry: BookIndexEntry) => entry.shortTitle || entry.title || entry.key, []);
  const selectedBook = selection.bookKey ? bookIndex.find((b) => b.key === selection.bookKey) : null;
  const chaptersInBook = selectedBook?.chapters || 0;
  const currentCounts = selection.bookKey ? verseCounts[selection.bookKey] : undefined;
  const versesInChapter = selection.chapter && currentCounts ? currentCounts[selection.chapter - 1] || 0 : 0;

  // Remove verse numbers (<sup> tags and their content) for Citas mode display
  const cleanText = React.useMemo(() => {
    let text = verse.text || "";
    // Remove <sup>N</sup> tags and their content completely
    text = text.replace(/<sup>\s*\d+\s*<\/sup>\s*(?:&nbsp;)?/gi, "");
    return sanitizeVerseText(text, false);
  }, [verse.text]);

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

  // Correct/Incorrect feedback
  if (status === "correct") {
    return (
      <div className="space-y-4">
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {cleanText || "Texto no disponible"}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">¡Correcto!</p>
            <p className="text-xs text-green-700 dark:text-green-300">{verse.reference}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "incorrect") {
    return (
      <div className="space-y-4">
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {cleanText || "Texto no disponible"}
          </p>
        </div>
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
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Verse text - always visible */}
      <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 mb-4">
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {cleanText || "Texto no disponible"}
        </p>
      </div>

      {/* Header with back button and current selection */}
      {step !== "book" && (
        <div className="flex items-center gap-3 mb-4">
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
          <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
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
          <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
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
          <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
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
          <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            🔢 ¿En qué versículo <span className="text-blue-600 dark:text-blue-400">termina</span>?
          </p>
          <div className="flex-1 overflow-y-auto -mx-4 px-4">
            <div className="grid grid-cols-5 gap-2 pb-4">
              {Array.from({ length: versesInChapter }, (_, i) => i + 1)
                .filter((v) => !selection.start || v >= selection.start)
                .map((v) => {
                const isStart = selection.start === v;

                return (
                  <button
                    key={v}
                    onClick={() => handleSelectEnd(v)}
                    className={cn(
                      "h-14 rounded-xl border-2 text-lg font-semibold transition-colors",
                      isStart
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
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 py-2">
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
  );
}
