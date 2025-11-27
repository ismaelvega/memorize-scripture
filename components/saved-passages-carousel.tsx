"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash, BookOpen, Clock, Bookmark } from "lucide-react";
import { loadProgress, removeSavedPassage } from "@/lib/storage";
import { sanitizeVerseText } from "@/lib/sanitize";
import { computePassageCompletion } from "@/lib/completion";
import type { SavedPassage, Verse } from "@/lib/types";
import { useToast } from "./ui/toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  onSelect: (v: Verse) => void;
  refreshSignal: number;
  onBrowse?: () => void;
}

interface RowData {
  id: string;
  reference: string;
  snippet: string;
  savedAt: number | undefined;
  verse: Verse;
  hasProgress: boolean; // true if user has attempts or is memorizing
  isMemorized: boolean; // true if 100% completion
}

function formatRelative(ts?: number) {
  if (!ts) return "";
  const delta = Math.floor((Date.now() - ts) / 1000);
  if (delta < 60) return "hace segundos";
  if (delta < 3600) return `hace ${Math.floor(delta / 60)} min`;
  if (delta < 86400) return `hace ${Math.floor(delta / 3600)} h`;
  if (delta < 604800) return `hace ${Math.floor(delta / 86400)} días`;
  return `hace ${Math.floor(delta / 604800)} sem`;
}

export function SavedPassagesCarousel({ onSelect, refreshSignal, onBrowse }: Props) {
  const [rows, setRows] = React.useState<RowData[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const { pushToast } = useToast();

  const loadRows = React.useCallback(() => {
    const state = loadProgress();
    const saved = state.saved || {};
    const verses = state.verses || {};
    
    const data: RowData[] = Object.values(saved)
      .map((entry: SavedPassage) => {
        const clean = sanitizeVerseText(entry.verse.text, false).replace(/\s+/g, " ").trim();
        const snippet = clean.length > 220 ? `${clean.slice(0, 220)}…` : clean;
        
        // Check if this verse has progress
        const progress = verses[entry.verse.id];
        const hasAttempts = progress?.attempts && progress.attempts.length > 0;
        
        // Check if fully memorized (100% completion = all 4 modes completed)
        let isMemorized = false;
        if (progress) {
          const completion = computePassageCompletion(progress);
          isMemorized = completion.completionPercent === 100;
        }
        
        return {
          id: entry.verse.id,
          reference: entry.verse.reference,
          snippet,
          savedAt: entry.savedAt,
          verse: entry.verse,
          hasProgress: hasAttempts || false,
          isMemorized,
        };
      })
      // Sort: without progress first (by savedAt desc), then in progress (by savedAt desc), then memorized (by savedAt desc)
      .sort((a, b) => {
        // Priority: no progress (0) < in progress (1) < memorized (2)
        const getPriority = (row: RowData) => {
          if (row.isMemorized) return 2;
          if (row.hasProgress) return 1;
          return 0;
        };
        
        const priorityA = getPriority(a);
        const priorityB = getPriority(b);
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB; // Lower priority first
        }
        
        // Same priority: sort by savedAt descending (most recent first)
        return (b.savedAt || 0) - (a.savedAt || 0);
      });
    setRows(data);
  }, []);

  React.useEffect(() => {
    loadRows();
  }, [loadRows, refreshSignal]);

  if (!rows.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="h-16 w-16 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center dark:bg-neutral-800/50 dark:text-neutral-500">
          <Bookmark className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Sin pasajes guardados</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[240px] mx-auto">
            Guarda pasajes para practicar más tarde.
          </p>
        </div>
        {onBrowse && (
          <Button variant="default" className="mt-2 rounded-full" onClick={onBrowse}>
            Explorar pasajes
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Guardados
        </h2>
        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
          {rows.length}
        </Badge>
      </div>

      <div className="flex-1 -mx-4 px-4 overflow-x-auto snap-x snap-mandatory pb-8 pt-2 hide-scrollbar">
        <div className="flex gap-4 h-full">
          {rows.map((row) => (
            <div
              key={row.id}
              className="snap-center shrink-0 w-[85vw] max-w-sm h-full relative flex flex-col"
            >
              <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 rounded-[2rem] border border-neutral-200/60 dark:border-neutral-800 shadow-xl overflow-hidden relative transition-all duration-150">
                <div className="p-6 flex flex-col h-full relative z-10">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight">
                        {row.reference}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelative(row.savedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 hide-scrollbar">
                    <p className="text-base leading-relaxed text-neutral-700 dark:text-neutral-300 font-serif">
                      {row.snippet}
                    </p>
                  </div>

                  <div className="mt-6 pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/30"
                      onClick={() => setDeleteConfirmId(row.id)}
                      aria-label={`Eliminar ${row.reference}`}
                    >
                      <Trash className="w-5 h-5" />
                    </Button>
                    <Button
                      className="flex-1 h-12 rounded-xl text-base font-medium shadow-sm"
                      onClick={() => onSelect(row.verse)}
                    >
                      <BookOpen className="w-5 h-5 mr-2" />
                      Practicar ahora
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="w-[90vw] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Eliminar pasaje guardado</DialogTitle>
            <DialogDescription>
              {deleteConfirmId && rows.find((r) => r.id === deleteConfirmId)?.reference}
            </DialogDescription>
            <DialogDescription className="text-sm text-neutral-600 dark:text-neutral-400">
              Esta acción no se puede deshacer. El pasaje será removido de tus guardados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  removeSavedPassage(deleteConfirmId);
                  loadRows();
                  setDeleteConfirmId(null);
                  pushToast({ title: "Pasaje eliminado", description: "Se quitó de tus guardados." });
                }
              }}
              className="flex-1"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
