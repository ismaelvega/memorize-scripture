"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { ReadModeCard } from "@/components/read-mode-card";
import { loadProgress } from "@/lib/storage";
import type { Verse } from "@/lib/types";
import { splitVerseByPunctuation } from "@/lib/utils";
import { ArrowLeft, BookOpen, Home } from "lucide-react";

interface ReadModePageProps {}

function parseSelectionFromId(id: string | null) {
  if (!id) return null;
  const parts = id.split("-");
  if (parts.length < 5) return null;
  const translation = parts[parts.length - 1];
  const end = Number(parts[parts.length - 2]);
  const start = Number(parts[parts.length - 3]);
  const chapter = Number(parts[parts.length - 4]);
  const bookKey = parts.slice(0, parts.length - 4).join("-");
  if (!bookKey || Number.isNaN(chapter) || Number.isNaN(start) || Number.isNaN(end)) return null;
  return { bookKey, chapter, start, end, translation };
}

export default function ReadModePage(_: ReadModePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const selectionFromId = React.useMemo(() => parseSelectionFromId(idParam), [idParam]);
  const startParam = Number(searchParams.get("start") || selectionFromId?.start || 1);
  const endParam = Number(searchParams.get("end") || selectionFromId?.end || startParam);
  const progress = loadProgress();
  const entry = idParam ? progress.verses[idParam] : undefined;

  const verse: Verse | null = React.useMemo(() => {
    if (!idParam || !entry) return null;
    const { reference, translation, text, source } = entry;
    return {
      id: idParam,
      reference,
      translation,
      text: text || "",
      source: source || "built-in",
    };
  }, [entry, idParam]);

  const [chapterVerses, setChapterVerses] = React.useState<string[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectionFromId || verse?.source === "custom") {
      setChapterVerses(null);
      return;
    }

    // Capture values to avoid selectionFromId being considered possibly null inside the async closure
    const bookKey = selectionFromId.bookKey;
    const chapter = selectionFromId.chapter;

    let active = true;
    async function loadChapter() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const res = await fetch(`/bible_data/${bookKey}.json`);
        if (!res.ok) throw new Error("No se pudo cargar el libro.");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Formato inesperado de datos.");
        const chapterData: string[] = data[chapter - 1] || [];
        if (!active) return;
        setChapterVerses(chapterData);
      } catch (error: any) {
        if (!active) return;
        setFetchError(error?.message || "Error al cargar los versículos.");
        setChapterVerses(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadChapter();
    return () => {
      active = false;
    };
  }, [selectionFromId, verse?.source]);

  const verseParts = React.useMemo(() => {
    if (!chapterVerses || Number.isNaN(startParam) || Number.isNaN(endParam)) {
      return undefined;
    }
    return chapterVerses.slice(startParam - 1, endParam);
  }, [chapterVerses, startParam, endParam]);

  const plainText = React.useMemo(() => {
    if (!verse) return "";
    if (verse.source === "custom") {
      return verse.text || "";
    }
    if (verseParts && verseParts.length > 0) {
      return verseParts
        .map((part, idx) => `${startParam + idx} ${part}`.trim())
        .join(" ");
    }
    return verse.text || "";
  }, [verse, verseParts, startParam]);

  const chunks = React.useMemo(() => splitVerseByPunctuation(plainText), [plainText]);

  const handleHome = React.useCallback(() => {
    router.push("/");
  }, [router]);

  const handleChangeVerse = React.useCallback(() => {
    router.push("/practice");
  }, [router]);

  const handleBackToModes = React.useCallback(() => {
    if (!idParam) {
      router.push("/practice");
      return;
    }
    const params = new URLSearchParams();
    params.set("id", idParam);
    if (!Number.isNaN(startParam)) {
      params.set("start", String(startParam));
    }
    if (!Number.isNaN(endParam)) {
      params.set("end", String(endParam));
    }
    router.push(`/practice/type?${params.toString()}`);
  }, [endParam, idParam, router, startParam]);

  const referenceLabel = verse?.reference ?? "Paso seleccionado";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex w-full flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
              Lectura
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              {referenceLabel}
            </h1>
            {verse?.translation && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Traducción: {verse.translation.toUpperCase?.() ?? verse.translation}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToModes}
              className="gap-1"
            >
              <BookOpen className="h-4 w-4" />
              Practicar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleChangeVerse}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Cambiar versículos
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleHome}
              className="gap-1"
            >
              <Home className="h-4 w-4" />
              Inicio
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {!verse && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
              <p>No encontramos un pasaje seleccionado para abrir el modo lectura.</p>
              <Button onClick={handleChangeVerse}>Elegir un pasaje</Button>
            </div>
          )}

          {verse && fetchError && (
            <div className="rounded-lg border border-red-200 bg-red-100/40 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200">
              {fetchError}
            </div>
          )}

          {verse && !fetchError && (
            <>
              {isLoading && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Cargando pasaje…
                </div>
              )}
              <ReadModeCard
                reference={referenceLabel}
                translation={verse.translation}
                chunks={chunks}
                onPractice={handleBackToModes}
              />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
