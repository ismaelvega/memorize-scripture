"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TypeModeCard } from "@/components/type-mode-card";
import { SpeechModeCard } from "@/components/speech-mode-card";
import { StealthModeCard } from "@/components/stealth-mode-card";
import { SequenceModeCard } from "@/components/sequence-mode-card";
import { useToast } from "@/components/ui/toast";
import type { AppMode, Attempt, Verse } from "@/lib/types";
import { loadProgress } from "@/lib/storage";
import { sanitizeVerseText } from "@/lib/sanitize";
import { getMemorizedPassages, generateRallyRounds, type MemorizedPassage, type RallyRound } from "@/lib/review";
import { ArrowLeft, Check, Flag, MicOff, Play, RotateCcw, Square, Trophy, Zap } from "lucide-react";
import type { BookIndexEntry } from "@/components/mobile/flow";
import { CitasRound } from "./citas-round";

const MODE_LABEL: Record<AppMode | 'citas', string> = {
  sequence: "Secuencia",
  stealth: "Sigilo",
  type: "Escritura",
  speech: "Voz",
  citas: "Citas",
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
  const { pushToast } = useToast();

  // Setup state
  const [passages, setPassages] = React.useState<MemorizedPassage[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);

  // Session state
  const [sessionActive, setSessionActive] = React.useState(false);
  const [rounds, setRounds] = React.useState<RallyRound[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [finished, setFinished] = React.useState(false);
  
  // Skip speech mode
  const [skipSpeechMode, setSkipSpeechMode] = React.useState(false);
  const [showSkipSpeechModal, setShowSkipSpeechModal] = React.useState(false);

  // Current round data
  const [currentVerse, setCurrentVerse] = React.useState<Verse | null>(null);
  const [currentVerseParts, setCurrentVerseParts] = React.useState<string[] | null>(null);
  const [currentParsed, setCurrentParsed] = React.useState<ReturnType<typeof parseRangeFromId> | null>(null);
  const [bookIndex, setBookIndex] = React.useState<BookIndexEntry[]>([]);

  // Load memorized passages on mount
  React.useEffect(() => {
    try {
      const progress = loadProgress();
      const memorized = getMemorizedPassages(progress);
      setPassages(memorized);
      // Select all by default
      setSelected(new Set(memorized.map((p) => p.id)));
    } catch (error) {
      console.error("Error loading memorized passages", error);
      setPassages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load book index for Citas mode
  React.useEffect(() => {
    fetch("/bible_data/_index.json")
      .then((res) => res.json())
      .then((data: BookIndexEntry[]) => setBookIndex(data))
      .catch((err) => console.error("Error loading book index", err));
  }, []);

  const togglePassage = React.useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = React.useCallback(() => {
    setSelected(new Set(passages.map((p) => p.id)));
  }, [passages]);

  const selectNone = React.useCallback(() => {
    setSelected(new Set());
  }, []);

  const startRally = React.useCallback(() => {
    const selectedPassages = passages.filter((p) => selected.has(p.id));
    if (selectedPassages.length === 0) {
      pushToast({ title: "Selecciona al menos un pasaje", variant: "destructive" });
      return;
    }
    const generatedRounds = generateRallyRounds(selectedPassages);
    setRounds(generatedRounds);
    setCurrentIndex(0);
    setFinished(false);
    setSessionActive(true);
  }, [passages, selected, pushToast]);

  // Load current round data
  React.useEffect(() => {
    if (!sessionActive || rounds.length === 0 || currentIndex >= rounds.length) {
      return;
    }

    const round = rounds[currentIndex];
    const passage = passages.find((p) => p.id === round.passageId);
    if (!passage) {
      setCurrentVerse(null);
      return;
    }

    const parsed = parseRangeFromId(round.passageId);
    setCurrentParsed(parsed);

    const sanitizedText = sanitizeVerseText(passage.entry.text || "", true);
    setCurrentVerse({
      id: round.passageId,
      reference: passage.entry.reference,
      translation: passage.entry.translation,
      text: sanitizedText,
      source: passage.entry.source || "built-in",
    });

    // Load verse parts for Stealth mode
    if (parsed.bookKey) {
      fetch(`/bible_data/${parsed.bookKey}.json`)
        .then((res) => res.json())
        .then((data: string[][]) => {
          const chapterData = data[(parsed.chapter || 1) - 1] || [];
          const slice = chapterData.slice(parsed.start - 1, parsed.end ?? parsed.start);
          setCurrentVerseParts(slice);
        })
        .catch(() => setCurrentVerseParts(null));
    } else {
      setCurrentVerseParts(null);
    }
  }, [sessionActive, rounds, currentIndex, passages]);

  const currentRound = sessionActive && rounds.length > 0 ? rounds[currentIndex] : null;
  const progressPercent = rounds.length > 0 ? Math.round((currentIndex / rounds.length) * 100) : 0;

  // Auto-skip speech rounds when skipSpeechMode is enabled
  React.useEffect(() => {
    if (!sessionActive || !skipSpeechMode || finished || rounds.length === 0) return;
    
    const round = rounds[currentIndex];
    if (round?.mode === "speech") {
      // Find next non-speech round
      let nextIdx = currentIndex + 1;
      while (nextIdx < rounds.length && rounds[nextIdx].mode === "speech") {
        nextIdx++;
      }
      
      if (nextIdx >= rounds.length) {
        // All remaining rounds are speech, check if we're done
        const hasNonSpeechRemaining = rounds.slice(currentIndex).some(r => r.mode !== "speech");
        if (!hasNonSpeechRemaining) {
          setFinished(true);
          pushToast({ title: "¡Rally completado!", description: "Completaste todas las rondas disponibles." });
        }
      } else {
        setCurrentIndex(nextIdx);
        pushToast({ 
          title: "Ronda de voz omitida", 
          description: `Continuando con ${rounds[nextIdx].reference}` 
        });
      }
    }
  }, [sessionActive, skipSpeechMode, currentIndex, rounds, finished, pushToast]);

  const handleSkipSpeechConfirm = React.useCallback(() => {
    setSkipSpeechMode(true);
    setShowSkipSpeechModal(false);
    pushToast({ 
      title: "Modo voz desactivado", 
      description: "Se omitirán las rondas de voz en este rally." 
    });
  }, [pushToast]);

  const handleResult = React.useCallback(
    (attempt: Attempt) => {
      if (attempt.accuracy === 100) {
        if (currentIndex >= rounds.length - 1) {
          setFinished(true);
          pushToast({ title: "¡Rally completado!", description: "Completaste todas las rondas." });
        } else {
          setCurrentIndex((idx) => idx + 1);
          const nextRound = rounds[currentIndex + 1];
          if (nextRound) {
            pushToast({
              title: "¡Siguiente ronda!",
              description: `${nextRound.reference} - ${MODE_LABEL[nextRound.mode]}`,
            });
          }
        }
      } else {
        pushToast({
          title: "Necesitas 100% para avanzar",
          description: "Reintenta esta ronda.",
          variant: "destructive",
        });
      }
    },
    [currentIndex, rounds, pushToast]
  );

  const handleCitasResult = React.useCallback(
    (correct: boolean) => {
      if (correct) {
        if (currentIndex >= rounds.length - 1) {
          setFinished(true);
          pushToast({ title: "¡Rally completado!", description: "Completaste todas las rondas." });
        } else {
          setCurrentIndex((idx) => idx + 1);
          const nextRound = rounds[currentIndex + 1];
          if (nextRound) {
            pushToast({
              title: "¡Siguiente ronda!",
              description: `${nextRound.reference} - ${MODE_LABEL[nextRound.mode]}`,
            });
          }
        }
      } else {
        pushToast({
          title: "Respuesta incorrecta",
          description: "Reintenta esta cita.",
          variant: "destructive",
        });
      }
    },
    [currentIndex, rounds, pushToast]
  );

  const restart = React.useCallback(() => {
    setSessionActive(false);
    setRounds([]);
    setCurrentIndex(0);
    setFinished(false);
    setCurrentVerse(null);
    setCurrentVerseParts(null);
    setSkipSpeechMode(false);
  }, []);

  // Setup view
  if (!sessionActive) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Cargando pasajes...</div>
        </div>
      );
    }

    if (passages.length === 0) {
      return (
        <div className="h-screen flex flex-col items-center justify-center px-6 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center">
            <Flag className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Sin pasajes memorizados</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[280px]">
              Completa los 4 modos en práctica para desbloquear el rally.
            </p>
          </div>
          <div className="flex gap-2 w-full max-w-sm">
            <Button onClick={() => router.push("/repaso")} className="flex-1 rounded-full">
              Volver
            </Button>
            <Button variant="outline" onClick={() => router.push("/practice")} className="flex-1 rounded-full">
              Ir a práctica
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
        <header className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/repaso")}
            className="h-10 w-10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rally</p>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Selecciona los pasajes</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <span className="text-amber-600 dark:text-amber-400">{selected.size}</span> de {passages.length} seleccionados
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAll} 
                className="h-8 px-3 text-xs rounded-lg border-neutral-300 dark:border-neutral-700"
              >
                Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectNone} 
                className="h-8 px-3 text-xs rounded-lg border-neutral-300 dark:border-neutral-700"
              >
                Ninguno
              </Button>
            </div>
          </div>

          {/* Passages list */}
          <div className="space-y-2">
            {passages.map((passage) => {
              const isSelected = selected.has(passage.id);
              return (
                <button
                  key={passage.id}
                  onClick={() => togglePassage(passage.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors text-left ${
                    isSelected
                      ? "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700"
                      : "bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800"
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-amber-500 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800"
                    }`}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 truncate">
                      {passage.entry.reference}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start button */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            onClick={startRally}
            disabled={selected.size === 0}
            className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          >
            <Play className="h-5 w-5 mr-2" />
            Iniciar Rally ({selected.size * 5} rondas)
          </Button>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-2">
            {selected.size} pasajes × 5 modos = {selected.size * 5} rondas
          </p>
        </div>
      </div>
    );
  }

  // Session view - finished
  if (finished) {
    return (
      <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-6">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Trophy className="h-12 w-12 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">¡Rally Completado!</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Completaste las {rounds.length} rondas al 100%
            </p>
          </div>
          <div className="flex gap-2 w-full max-w-sm">
            <Button onClick={restart} variant="outline" className="flex-1 h-12 rounded-xl">
              <RotateCcw className="h-5 w-5 mr-2" />
              Nuevo Rally
            </Button>
            <Button onClick={() => router.push("/repaso")} className="flex-1 h-12 rounded-xl">
              Volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Session view - active round
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
      <header className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rally</p>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {currentRound ? MODE_LABEL[currentRound.mode] : "Cargando..."}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={restart}
            className="h-10 w-10 rounded-full"
          >
            <Square className="h-5 w-5" />
          </Button>
        </div>
        {currentRound && currentRound.mode !== "citas" && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{currentRound.reference}</p>
        )}
        <div className="flex items-center gap-3">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
            {currentIndex + 1}/{rounds.length}
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {currentRound && currentVerse && currentRound.mode === "sequence" && (
            <SequenceModeCard
              verse={currentVerse}
              onAttemptSaved={() => {}}
              onAttemptStateChange={() => {}}
              onPractice={() => {}}
              trackingMode="review"
              onAttemptResult={handleResult}
            />
          )}
          {currentRound && currentVerse && currentRound.mode === "stealth" && (
            <StealthModeCard
              verse={currentVerse}
              verseParts={currentVerseParts || undefined}
              startVerse={currentParsed?.start || 1}
              trackingMode="review"
              onAttemptSaved={() => {}}
              onAttemptStateChange={() => {}}
              onAttemptResult={handleResult}
            />
          )}
          {currentRound && currentVerse && currentRound.mode === "type" && (
            <TypeModeCard
              verse={currentVerse}
              onAttemptSaved={() => {}}
              onFirstType={() => {}}
              onAttemptStateChange={() => {}}
              trackingMode="review"
              onAttemptResult={handleResult}
            />
          )}
          {currentRound && currentVerse && currentRound.mode === "speech" && (
            <div className="space-y-4">
              <SpeechModeCard
                verse={currentVerse}
                onAttemptSaved={() => {}}
                onFirstRecord={() => {}}
                onBlockNavigationChange={() => {}}
                trackingMode="review"
                onAttemptResult={handleResult}
              />
              
              {/* Skip speech mode option */}
              {!skipSpeechMode && (
                <button
                  onClick={() => setShowSkipSpeechModal(true)}
                  className="w-full py-3 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors flex items-center justify-center gap-2"
                >
                  <MicOff className="h-4 w-4" />
                  No puedo usar el micrófono ahora
                </button>
              )}
              
              {/* Skip speech confirmation modal */}
              <Dialog open={showSkipSpeechModal} onOpenChange={setShowSkipSpeechModal}>
                <DialogContent className="w-[90vw] max-w-sm rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <MicOff className="h-5 w-5 text-neutral-500" />
                      Omitir modo voz
                    </DialogTitle>
                    <DialogDescription className="text-sm text-neutral-600 dark:text-neutral-400 pt-2">
                      Se omitirán todas las rondas de <span className="font-semibold">modo voz</span> durante el resto de este rally.
                      <br /><br />
                      Los demás modos (escritura, sigilo, secuencia y citas) continuarán normalmente.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSkipSpeechModal(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSkipSpeechConfirm}
                      className="flex-1"
                    >
                      Omitir voz
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {currentRound && currentVerse && currentParsed && currentRound.mode === "citas" && (
            <CitasRound
              verse={currentVerse}
              parsed={currentParsed}
              bookIndex={bookIndex}
              onResult={handleCitasResult}
            />
          )}
        </div>
      </div>
    </div>
  );
}
