"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { TypeModeCard } from "@/components/type-mode-card";
import { SpeechModeCard } from "@/components/speech-mode-card";
import { StealthModeCard } from "@/components/stealth-mode-card";
import { SequenceModeCard } from "@/components/sequence-mode-card";
import { useToast } from "@/components/ui/toast";
import type { AppMode, Attempt, Verse } from "@/lib/types";
import { loadProgress } from "@/lib/storage";
import { sanitizeVerseText } from "@/lib/sanitize";
import { RALLY_ORDER, getMemorizedPassages, isMemorizedPassage } from "@/lib/review";
import { BookOpen, Flag, RotateCcw, Trophy } from "lucide-react";

const MODE_LABEL: Record<AppMode, string> = {
  sequence: "Secuencia",
  stealth: "Sigilo",
  type: "Escritura",
  speech: "Voz",
};

function parseRangeFromId(id: string | null) {
  if (!id) return { bookKey: null as string | null, chapter: 1, start: 1, end: 1 };
  const parts = id.split("-");
  if (parts.length < 5) {
    return {
      bookKey: parts[0] ?? null,
      chapter: Number(parts[1]) || 1,
      start: 1,
      end: 1,
    };
  }
  const bookKey = parts[0] ?? null;
  const chapter = Number(parts[parts.length - 4]);
  const end = Number(parts[parts.length - 2]);
  const start = Number(parts[parts.length - 3]);
  return {
    bookKey,
    chapter: Number.isNaN(chapter) ? 1 : chapter,
    start: Number.isNaN(start) ? 1 : start,
    end: Number.isNaN(end) ? (Number.isNaN(start) ? 1 : start) : end,
  };
}

export default function RallyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const idParam = searchParams.get("id");
  const startParam = Number(searchParams.get("start") || "0");
  const endParam = Number(searchParams.get("end") || "0");
  const parsedFromId = React.useMemo(() => parseRangeFromId(idParam), [idParam]);
  const startValue = !Number.isNaN(startParam) && startParam > 0 ? startParam : parsedFromId.start || 1;
  const endValue = !Number.isNaN(endParam) && endParam > 0 ? endParam : parsedFromId.end || startValue;

  const [verse, setVerse] = React.useState<Verse | null>(null);
  const [verseParts, setVerseParts] = React.useState<string[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [finished, setFinished] = React.useState(false);

  React.useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      try {
        const progress = loadProgress();
        const memorized = getMemorizedPassages(progress);
        const target = memorized.find((p) => p.id === idParam);
        if (!idParam || !target || !isMemorizedPassage(target.entry)) {
          setVerse(null);
          return;
        }

        const sanitizedText = sanitizeVerseText(target.entry.text || "", true);
        setVerse({
          id: idParam,
          reference: target.entry.reference,
          translation: target.entry.translation,
          text: sanitizedText,
          source: target.entry.source || "built-in",
        });

        // Load verse parts for Stealth when we have chapter data
        if (parsedFromId.bookKey) {
          try {
            const res = await fetch(`/bible_data/${parsedFromId.bookKey}.json`);
            if (res.ok) {
              const data: string[][] = await res.json();
              const chapterData = data[(parsedFromId.chapter || 1) - 1] || [];
              const slice = chapterData.slice(startValue - 1, endValue ?? startValue);
              setVerseParts(slice);
            }
          } catch {
            // ignore fetch errors; stealth will still render without verseParts
          }
        }
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [idParam]);

  const mode = RALLY_ORDER[activeIndex];
  const progressPercent = Math.round(((activeIndex) / RALLY_ORDER.length) * 100);

  const handleResult = React.useCallback(
    (attempt: Attempt) => {
      if (attempt.accuracy === 100) {
        if (activeIndex >= RALLY_ORDER.length - 1) {
          setFinished(true);
          pushToast({ title: "Rally completado", description: "Completaste todos los modos con 100%." });
        } else {
          setActiveIndex((idx) => idx + 1);
          pushToast({ title: "Avanza al siguiente modo", description: MODE_LABEL[RALLY_ORDER[activeIndex + 1]] });
        }
      } else {
        pushToast({
          title: "Necesitas 100% para avanzar",
          description: "Reintenta este modo para seguir en el rally.",
          type: "error",
        });
      }
    },
    [activeIndex, pushToast]
  );

  const restart = React.useCallback(() => {
    setActiveIndex(0);
    setFinished(false);
  }, []);

  const header = (
    <header className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rally</p>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Completa los 4 modos al 100%</h1>
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
      {verse && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {verse.reference}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Progress value={progressPercent} className="h-2 flex-1" />
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
          {activeIndex + 1}/{RALLY_ORDER.length}
        </span>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Cargando pasaje...</div>
      </div>
    );
  }

  if (!verse) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center">
          <Flag className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
        </div>
        <div className="space-y-2">
          <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">No encontramos este rally</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[280px]">Verifica que el pasaje esté memorizado.</p>
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
      {header}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {finished ? (
            <div className="flex flex-col items-center justify-center gap-6 text-center min-h-full px-6">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Rally completado</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Todos los modos al 100%</p>
              </div>
              <div className="flex gap-2 w-full max-w-sm">
                <Button onClick={restart} variant="outline" className="flex-1 h-12 rounded-xl">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Reiniciar
                </Button>
                <Button onClick={() => router.push("/repaso")} className="flex-1 h-12 rounded-xl">
                  Volver
                </Button>
              </div>
            </div>
          ) : (
            <>
              {mode === "sequence" && (
                <SequenceModeCard
                  verse={verse}
                  onAttemptSaved={() => {}}
                  onAttemptStateChange={() => {}}
                  onPractice={() => {}}
                  trackingMode="review"
                  onAttemptResult={handleResult}
                />
              )}
              {mode === "stealth" && (
                <StealthModeCard
                  verse={verse}
                  verseParts={verseParts || undefined}
                  startVerse={startValue}
                  trackingMode="review"
                  onAttemptSaved={() => {}}
                  onAttemptStateChange={() => {}}
                  onAttemptResult={handleResult}
                />
              )}
              {mode === "type" && (
                <TypeModeCard
                  verse={verse}
                  onAttemptSaved={() => {}}
                  onFirstType={() => {}}
                  onAttemptStateChange={() => {}}
                  trackingMode="review"
                  onAttemptResult={handleResult}
                />
              )}
              {mode === "speech" && (
                <SpeechModeCard
                  verse={verse}
                  onAttemptSaved={() => {}}
                  onFirstRecord={() => {}}
                  onBlockNavigationChange={() => {}}
                  trackingMode="review"
                  onAttemptResult={handleResult}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
