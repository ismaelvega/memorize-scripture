"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, ChevronLeft, Eye, RotateCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { BookIndexEntry } from "@/components/mobile/flow";
import type { Verse } from "@/lib/types";
import { sanitizeVerseText } from "@/lib/sanitize";

// Haptic feedback helper for invalid input
function triggerHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(50);
  }
}

export type VerseSelection = {
  bookKey: string | null;
  chapter: number | null;
  start: number | null;
  end: number | null;
};

type Step = "book" | "chapter" | "verses" | "confirm";

interface CitasChallengeProps {
  verse: Verse;
  bookIndex: BookIndexEntry[];
  onComplete: (success: boolean) => void;
  onNext: () => void;
  className?: string;
}

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

export function CitasChallenge({ verse, bookIndex, onComplete, onNext, className }: CitasChallengeProps) {
  const { pushToast } = useToast();
  
  const [verseCounts, setVerseCounts] = React.useState<Record<string, number[]>>({});
  const [selection, setSelection] = React.useState<VerseSelection>({ bookKey: null, chapter: null, start: null, end: null });
  const [step, setStep] = React.useState<Step>("book");
  const [status, setStatus] = React.useState<"idle" | "correct" | "incorrect" | "revealed">("idle");
  const [attempts, setAttempts] = React.useState(0);
  
  const [bookFilter, setBookFilter] = React.useState("");
  const [chapterInput, setChapterInput] = React.useState("");
  const [startInput, setStartInput] = React.useState("");
  const [endInput, setEndInput] = React.useState("");

  // Reset state when verse changes
  React.useEffect(() => {
    setSelection({ bookKey: null, chapter: null, start: null, end: null });
    setStep("book");
    setStatus("idle");
    setAttempts(0);
    setBookFilter("");
    setChapterInput("");
    setStartInput("");
    setEndInput("");
  }, [verse.id]);

  const parsed = React.useMemo(() => parseRangeFromId(verse.id), [verse.id]);

  // Remove verse numbers (<sup> tags) for Citas mode display
  const cleanText = React.useMemo(() => {
    if (!verse?.text) return "";
    let text = verse.text;
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
    setStartInput("");
    setEndInput("");
    setStep("verses");
  }, []);

  const handleSelectStart = React.useCallback((start: number) => {
    setSelection((prev) => ({ ...prev, start, end: prev.end && prev.end >= start ? prev.end : null }));
  }, []);

  const handleSelectEnd = React.useCallback((end: number) => {
    setSelection((prev) => ({ ...prev, end }));
  }, []);

  const handleBack = React.useCallback(() => {
    if (step === "chapter") {
      setStep("book");
      setSelection({ bookKey: null, chapter: null, start: null, end: null });
      setChapterInput("");
    } else if (step === "verses") {
      setStep("chapter");
      setSelection((prev) => ({ ...prev, chapter: null, start: null, end: null }));
      setStartInput("");
      setEndInput("");
    } else if (step === "confirm") {
      setStep("verses");
      setSelection((prev) => ({ ...prev, start: null, end: null }));
      setStartInput("");
      setEndInput("");
    }
  }, [step]);

  const selectedBook = selection.bookKey ? bookIndex.find((b) => b.key === selection.bookKey) : null;
  const chaptersInBook = selectedBook?.chapters || 0;

  const filteredBooks = React.useMemo(() => {
    if (!bookFilter.trim()) return bookIndex;
    const query = bookFilter.toLowerCase().trim();
    return bookIndex.filter((book) => {
      const title = (book.shortTitle || book.title || book.key).toLowerCase();
      return title.includes(query) || book.key.toLowerCase().includes(query);
    });
  }, [bookIndex, bookFilter]);

  const currentCounts = selection.bookKey ? verseCounts[selection.bookKey] : undefined;
  const versesInChapter = selection.chapter && currentCounts ? currentCounts[selection.chapter - 1] || 0 : 0;

  const bookLabel = React.useCallback((entry: BookIndexEntry) => entry.shortTitle || entry.title || entry.key, []);

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
      onComplete(true);
    } else {
      setStatus("incorrect");
      setAttempts((prev) => prev + 1);
      onComplete(false);
    }
  }, [parsed, selection, pushToast, onComplete]);

  const handleReveal = React.useCallback(() => {
    setStatus("revealed");
    onComplete(false);
  }, [onComplete]);

  const restart = React.useCallback(() => {
    setSelection({ bookKey: null, chapter: null, start: null, end: null });
    setStep("book");
    setStatus("idle");
    setBookFilter("");
    setChapterInput("");
    setStartInput("");
    setEndInput("");
  }, []);

  return (
    <div className={cn("flex-1 overflow-hidden flex flex-col", className)}>
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
          <Button onClick={onNext} className="w-full h-14 rounded-xl text-lg font-semibold bg-green-600 hover:bg-green-700 active:bg-green-800">
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
          <Button onClick={restart} variant="default" className="w-full h-12 rounded-xl">
            <RotateCcw className="h-5 w-5 mr-2" />
            Intentar de nuevo
          </Button>
          {attempts >= 2 && (
            <Button 
              onClick={handleReveal} 
              variant="outline" 
              className="w-full h-12 rounded-xl text-neutral-600 dark:text-neutral-400"
            >
              <Eye className="h-5 w-5 mr-2" />
              Mostrar respuesta
            </Button>
          )}
        </div>
      )}

      {/* Revealed answer */}
      {status === "revealed" && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <Eye className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Respuesta</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">Después de {attempts} intentos</p>
              </div>
            </div>
            <p className="text-lg font-bold text-amber-900 dark:text-amber-100">{verse?.reference}</p>
          </div>
          <Button onClick={onNext} className="w-full h-14 rounded-xl text-lg font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800">
            <ArrowRight className="h-6 w-6 mr-2" />
            Siguiente
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

          {/* Step: Book selection with search */}
          {step === "book" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex-shrink-0">
                📖 ¿En qué libro está?
              </p>
              <div className="relative mb-3 flex-shrink-0 pl-1 pr-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Buscar libro..."
                  value={bookFilter}
                  onChange={(e) => setBookFilter(e.target.value)}
                  className="pl-10 h-12 rounded-xl focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto px-3">
                <div className="grid grid-cols-2 gap-2 pb-4">
                  {filteredBooks.map((book) => (
                    <button
                      key={book.key}
                      onClick={() => {
                        handleSelectBook(book.key);
                        setBookFilter("");
                      }}
                      className="h-14 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-base font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors text-left truncate"
                    >
                      {bookLabel(book)}
                    </button>
                  ))}
                  {filteredBooks.length === 0 && (
                    <p className="col-span-2 text-center text-sm text-neutral-500 py-4">No se encontraron libros</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step: Chapter selection with numeric input */}
          {step === "chapter" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex-shrink-0">
                📑 ¿Qué capítulo? <span className="text-neutral-400 font-normal">(1-{chaptersInBook})</span>
              </p>
              <div className="flex gap-2 mb-4 flex-shrink-0 pl-1 pr-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Capítulo"
                  value={chapterInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const v = parseInt(raw, 10);
                    if (!raw || Number.isNaN(v)) {
                      setChapterInput(raw);
                    } else if (v > chaptersInBook) {
                      setChapterInput(String(chaptersInBook));
                      triggerHaptic();
                    } else if (v < 1) {
                      setChapterInput("1");
                      triggerHaptic();
                    } else {
                      setChapterInput(raw);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const ch = parseInt(chapterInput, 10);
                      if (ch >= 1 && ch <= chaptersInBook) {
                        handleSelectChapter(ch);
                      }
                    }
                  }}
                  min={1}
                  max={chaptersInBook}
                  className="h-14 text-xl font-semibold text-center rounded-xl flex-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
                  autoFocus
                />
                <Button
                  onClick={() => {
                    const ch = parseInt(chapterInput, 10);
                    if (ch >= 1 && ch <= chaptersInBook) {
                      handleSelectChapter(ch);
                    }
                  }}
                  disabled={!chapterInput || parseInt(chapterInput, 10) < 1 || parseInt(chapterInput, 10) > chaptersInBook}
                  className="h-14 px-6 rounded-xl"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-neutral-500 mb-3 flex-shrink-0">O selecciona directamente:</p>
              <div className="flex-1 overflow-y-auto px-3">
                <div className="grid grid-cols-5 gap-2 pb-4">
                  {Array.from({ length: chaptersInBook }, (_, i) => i + 1).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => handleSelectChapter(ch)}
                      className="h-12 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-base font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Combined verse range selection */}
          {step === "verses" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <p className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex-shrink-0">
                🔢 Selecciona el rango de versículos <span className="text-neutral-400 font-normal">(1-{versesInChapter})</span>
              </p>
              
              {/* Numeric inputs for start-end */}
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <div className="flex-1 pl-1">
                  <label className="text-xs text-green-600 dark:text-green-400 font-medium mb-1 block">Inicio</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="-"
                    value={startInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const v = parseInt(raw, 10);
                      if (!raw || Number.isNaN(v)) {
                        setStartInput(raw);
                        setSelection((prev) => ({ ...prev, start: null }));
                      } else if (v > versesInChapter) {
                        setStartInput(String(versesInChapter));
                        handleSelectStart(versesInChapter);
                        triggerHaptic();
                      } else if (v < 1) {
                        setStartInput("1");
                        handleSelectStart(1);
                        triggerHaptic();
                      } else {
                        setStartInput(raw);
                        handleSelectStart(v);
                      }
                    }}
                    min={1}
                    max={versesInChapter}
                    className="h-14 text-xl font-semibold text-center rounded-xl border-green-300 dark:border-green-700 focus:border-green-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
                    autoFocus
                  />
                </div>
                <span className="text-2xl font-bold text-neutral-300 dark:text-neutral-600 pt-5">–</span>
                <div className="flex-1 pr-1">
                  <label className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 block">Fin</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder={startInput || "1"}
                    value={endInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const v = parseInt(raw, 10);
                      const minVal = selection.start || 1;
                      if (!raw || Number.isNaN(v)) {
                        setEndInput(raw);
                        setSelection((prev) => ({ ...prev, end: null }));
                      } else if (v > versesInChapter) {
                        setEndInput(String(versesInChapter));
                        handleSelectEnd(versesInChapter);
                        triggerHaptic();
                      } else if (v < minVal) {
                        setEndInput(String(minVal));
                        handleSelectEnd(minVal);
                        triggerHaptic();
                      } else {
                        setEndInput(raw);
                        handleSelectEnd(v);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && selection.start && selection.end) {
                        setStep("confirm");
                      }
                    }}
                    min={selection.start || 1}
                    max={versesInChapter}
                    className="h-14 text-xl font-semibold text-center rounded-xl border-blue-300 dark:border-blue-700 focus:border-blue-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
                  />
                </div>
                <Button
                  onClick={() => setStep("confirm")}
                  disabled={!selection.start || !selection.end}
                  className="h-14 px-6 rounded-xl mt-5"
                >
                  <Check className="h-5 w-5" />
                </Button>
              </div>

              <p className="text-xs text-neutral-500 mb-3 flex-shrink-0">O toca para seleccionar: <span className="text-green-600">inicio</span> → <span className="text-blue-600">fin</span></p>
              
              <div className="flex-1 overflow-y-auto px-3">
                <div className="grid grid-cols-5 gap-2 pb-4">
                  {Array.from({ length: versesInChapter }, (_, i) => i + 1).map((v) => {
                    const isStart = selection.start === v;
                    const isEnd = selection.end === v;
                    const isInRange = selection.start && selection.end && v > selection.start && v < selection.end;
                    const isBeforeStart = selection.start && !selection.end && v < selection.start;

                    return (
                      <button
                        key={v}
                        onClick={() => {
                          if (!selection.start) {
                            handleSelectStart(v);
                            setStartInput(String(v));
                          } else if (!selection.end) {
                            if (v >= selection.start) {
                              handleSelectEnd(v);
                              setEndInput(String(v));
                            } else {
                              // Clicked before start, reset start
                              handleSelectStart(v);
                              setStartInput(String(v));
                              setSelection((prev) => ({ ...prev, end: null }));
                              setEndInput("");
                            }
                          } else {
                            // Both set, reset and start over
                            handleSelectStart(v);
                            setStartInput(String(v));
                            setSelection((prev) => ({ ...prev, start: v, end: null }));
                            setEndInput("");
                          }
                        }}
                        className={cn(
                          "h-12 rounded-xl border-2 text-base font-semibold transition-colors",
                          isStart
                            ? "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : isEnd
                            ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : isInRange
                            ? "border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                            : isBeforeStart
                            ? "border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-300 dark:text-neutral-700"
                            : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                        )}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selection.start && selection.end && (
                <div className="pt-3 flex-shrink-0">
                  <Button onClick={() => setStep("confirm")} className="w-full h-12 rounded-xl">
                    <Check className="h-5 w-5 mr-2" />
                    Confirmar {getSelectionDisplay()}
                  </Button>
                </div>
              )}
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
  );
}
