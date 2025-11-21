"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Check, Loader2, RotateCcw, X } from "lucide-react";
import type { BookIndexEntry } from "@/components/mobile/flow";
import { loadProgress } from "@/lib/storage";
import { sanitizeVerseText } from "@/lib/sanitize";
import { getMemorizedPassages, isMemorizedPassage } from "@/lib/review";
import { useToast } from "@/components/ui/toast";

type VerseSelection = {
  bookKey: string | null;
  chapter: number | null;
  start: number | null;
  end: number | null;
};

type VerseAnswer = {
  bookKey: string;
  chapter: number;
  start: number;
  end: number;
  text: string;
  reference: string;
};

function parseRangeFromId(id: string | null): VerseSelection {
  if (!id) return { bookKey: null, chapter: null, start: null, end: null };
  const parts = id.split("-");
  if (parts.length < 5) {
    return { bookKey: parts[0] ?? null, chapter: Number(parts[1]) || null, start: 1, end: 1 };
  }
  const translation = parts[parts.length - 1];
  const end = Number(parts[parts.length - 2]);
  const start = Number(parts[parts.length - 3]);
  const chapter = Number(parts[parts.length - 4]);
  const bookKey = parts.slice(0, parts.length - 4).join("-");
  return {
    bookKey: bookKey || null,
    chapter: Number.isNaN(chapter) ? null : chapter,
    start: Number.isNaN(start) ? null : start,
    end: Number.isNaN(end) ? (Number.isNaN(start) ? null : start) : end,
  };
}

export default function RepasoCitasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [bookIndex, setBookIndex] = React.useState<BookIndexEntry[]>([]);
  const [verseAnswer, setVerseAnswer] = React.useState<VerseAnswer | null>(null);
  const [selection, setSelection] = React.useState<VerseSelection>({ bookKey: null, chapter: null, start: null, end: null });
  const [verseCounts, setVerseCounts] = React.useState<Record<string, number[]>>({});
  const [status, setStatus] = React.useState<"idle" | "correct" | "incorrect">("idle");

  const idParam = searchParams.get("id");

  React.useEffect(() => {
    async function bootstrap() {
      try {
        // Load memorized passage
        const progress = loadProgress();
        const memorized = getMemorizedPassages(progress);
        const target = memorized.find((p) => p.id === idParam);
        if (!idParam || !target || !isMemorizedPassage(target.entry)) {
          setVerseAnswer(null);
          return;
        }

        const parsed = parseRangeFromId(idParam);
        if (!parsed.bookKey || !parsed.chapter || !parsed.start || !parsed.end) {
          setVerseAnswer(null);
          return;
        }

        const cleanText = sanitizeVerseText(target.entry.text || "", false);
        setVerseAnswer({
          bookKey: parsed.bookKey,
          chapter: parsed.chapter,
          start: parsed.start,
          end: parsed.end,
          text: cleanText,
          reference: target.entry.reference,
        });
        setSelection({
          bookKey: null,
          chapter: null,
          start: null,
          end: null,
        });
        setStatus("idle");
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [idParam]);

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
    return () => {
      active = false;
    };
  }, []);

  const handleBookChange = React.useCallback(async (bookKey: string) => {
    setSelection({ bookKey, chapter: null, start: null, end: null });
    setStatus("idle");
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

  const currentCounts = selection.bookKey ? verseCounts[selection.bookKey] : undefined;
  const chaptersInBook = selection.bookKey ? (bookIndex.find((b) => b.key === selection.bookKey)?.chapters || 0) : 0;
  const versesInChapter = selection.chapter && currentCounts ? currentCounts[selection.chapter - 1] || 0 : 0;

  const handleSubmit = React.useCallback(() => {
    if (!verseAnswer || !selection.bookKey || !selection.chapter || !selection.start || !selection.end) {
      pushToast({ title: "Completa la selección", description: "Elige libro, capítulo y rango." });
      return;
    }
    const match =
      verseAnswer.bookKey === selection.bookKey &&
      verseAnswer.chapter === selection.chapter &&
      verseAnswer.start === selection.start &&
      verseAnswer.end === selection.end;

    if (match) {
      setStatus("correct");
      pushToast({ title: "Correcto", description: verseAnswer.reference, type: "success" });
    } else {
      setStatus("incorrect");
      pushToast({ title: "Respuesta incorrecta", description: "Revisa el libro, capítulo y rango.", type: "error" });
    }
  }, [pushToast, selection.bookKey, selection.chapter, selection.end, selection.start, verseAnswer]);

  const restart = React.useCallback(() => {
    setSelection({ bookKey: null, chapter: null, start: null, end: null });
    setStatus("idle");
  }, []);

  const bookLabel = React.useCallback((entry: BookIndexEntry) => entry.shortTitle || entry.title || entry.key, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!verseAnswer) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center">
          <X className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
        </div>
        <div className="space-y-2">
          <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">No encontramos este repaso</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[280px]">El pasaje no está memorizado o el id no es válido.</p>
        </div>
        <div className="flex gap-2 w-full max-w-sm">
          <Button onClick={() => router.push("/repaso")} className="flex-1 rounded-full">Volver a repaso</Button>
          <Button variant="outline" onClick={() => router.push("/practice")} className="flex-1 rounded-full">Ir a práctica</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
      <header className="flex-shrink-0 px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Citas</p>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">¿Dónde está esta cita?</h1>
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
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800">
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {verseAnswer.text || "Texto no disponible"}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Libro</label>
              <select
                className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                value={selection.bookKey ?? ""}
                onChange={(e) => handleBookChange(e.target.value)}
              >
                <option value="" disabled>Selecciona libro</option>
                {bookIndex.map((book) => (
                  <option key={book.key} value={book.key}>{bookLabel(book)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Cap.</label>
                <select
                  className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  value={selection.chapter ?? ""}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelection((prev) => ({ ...prev, chapter: Number.isNaN(val) ? null : val, start: null, end: null }));
                    setStatus("idle");
                  }}
                  disabled={!selection.bookKey}
                >
                  <option value="" disabled>—</option>
                  {Array.from({ length: chaptersInBook || 0 }, (_, i) => i + 1).map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Inicio</label>
                <select
                  className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  value={selection.start ?? ""}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelection((prev) => {
                      const start = Number.isNaN(val) ? null : val;
                      const end = prev.end && start && prev.end < start ? start : prev.end;
                      return { ...prev, start, end };
                    });
                    setStatus("idle");
                  }}
                  disabled={!selection.chapter || !versesInChapter}
                >
                  <option value="" disabled>—</option>
                  {Array.from({ length: versesInChapter || 0 }, (_, i) => i + 1).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Fin</label>
                <select
                  className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  value={selection.end ?? ""}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelection((prev) => ({ ...prev, end: Number.isNaN(val) ? null : val }));
                    setStatus("idle");
                  }}
                  disabled={!selection.start}
                >
                  <option value="" disabled>—</option>
                  {Array.from({ length: versesInChapter || 0 }, (_, i) => i + 1)
                    .filter((v) => !selection.start || v >= selection.start)
                    .map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {status === "correct" && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center flex-shrink-0">
                <Check className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">¡Correcto!</p>
                <p className="text-xs text-green-700 dark:text-green-300">{verseAnswer.reference}</p>
              </div>
            </div>
          )}
          {status === "incorrect" && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                <X className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">Incorrecto</p>
                <p className="text-xs text-red-700 dark:text-red-300">Intenta de nuevo</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSubmit} className="flex-1 h-12 rounded-xl font-medium">
              <Check className="h-5 w-5 mr-2" />
              Validar
            </Button>
            <Button variant="outline" onClick={restart} className="h-12 rounded-xl">
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
