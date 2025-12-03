"use client";
import * as React from 'react';
import { EyeOff, Trophy } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { Verse, StealthAttemptStats, Attempt, DiffToken, TrackingMode } from '../lib/types';
import { appendAttempt, loadProgress, clearVerseHistory } from '../lib/storage';
import { getModeCompletionStatus } from '@/lib/completion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HiddenInlineInput, type HiddenInlineInputHandle } from './hidden-inline-input';
import { ModeActionButtons } from './mode-action-buttons';
import { History } from './history';
import { Separator } from '@/components/ui/separator';
import { useToast } from './ui/toast';
import { cn, extractCitationSegments } from '@/lib/utils';
import { PeekModal } from './peek-modal';
import PerfectScoreModal from './perfect-score-modal';
import { Eye } from 'lucide-react';
import { CitationBubbles } from './citation-bubbles';
import type { CitationSegment, CitationSegmentId } from '@/lib/types';
import { useAuthUserId } from '@/lib/use-auth-user-id';

type WordAttemptStat = {
  index: number;
  mistakes: number;
  durationMs: number;
  typedLength: number;
  correct: boolean;
  typedWord: string;
  correctedManually?: boolean;
};

type CorrectionRequestState = {
  index: number;
  typedWord: string;
  targetWord: string;
  anchorEl: HTMLElement | null;
};

type CorrectionSuggestion = {
  value: string;
  hint: string;
};

const TRAILING_PUNCTUATION_RE = /[.,;:!?¡¿…]+$/u;
const NON_LETTER_NUMBER_RE = /[^\p{L}\p{N}]/gu;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function splitWordAndSuffix(word: string) {
  const normalized = (word || '').normalize('NFC');
  const match = normalized.match(TRAILING_PUNCTUATION_RE);
  if (!match) {
    return { base: normalized, suffix: '' };
  }
  const suffix = match[0];
  return {
    base: normalized.slice(0, -suffix.length),
    suffix,
  };
}

function applyCasePattern(target: string, template: string) {
  if (!template) return target;
  const upperTemplate = template.toLocaleUpperCase('es');
  const lowerTemplate = template.toLocaleLowerCase('es');
  if (template === upperTemplate) {
    return target.toLocaleUpperCase('es');
  }
  if (template === lowerTemplate) {
    return target.toLocaleLowerCase('es');
  }
  const normalizedTarget = target.toLocaleLowerCase('es');
  const capitalizedTemplate = template.charAt(0).toLocaleUpperCase('es') + template.slice(1).toLocaleLowerCase('es');
  if (template === capitalizedTemplate) {
    return normalizedTarget.charAt(0).toLocaleUpperCase('es') + normalizedTarget.slice(1);
  }
  return target;
}

function buildCorrectionSuggestions(correctWord: string, typedWord: string): CorrectionSuggestion[] {
  const normalized = (correctWord || '').normalize('NFC');
  const typedNormalized = (typedWord || '').normalize('NFC');
  const { base, suffix } = splitWordAndSuffix(normalized);
  const seen = new Set<string>();
  const suggestions: CorrectionSuggestion[] = [];

  const addSuggestion = (value: string, hint: string) => {
    const finalValue = (value || '').trim();
    if (!finalValue || seen.has(finalValue)) return;
    seen.add(finalValue);
    suggestions.push({ value: finalValue, hint });
  };

  addSuggestion(normalized, 'Quisiste decir');

  if (suggestions.length === 0) {
    addSuggestion(base || normalized, 'Palabra sugerida');
  }

  return suggestions.slice(0, 3);
}

const DIACRITIC_RE = /\p{Diacritic}/gu;

function normalizeForSpellCheck(word: string) {
  if (!word) return '';
  const accentless = word
    .normalize('NFD')
    .replace(DIACRITIC_RE, '')
    .normalize('NFC');
  return accentless
    .toLocaleLowerCase('es')
    .replace(NON_LETTER_NUMBER_RE, '');
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = Math.min(prev, dp[j - 1], dp[j]) + 1;
      }
      prev = temp;
    }
  }
  return dp[b.length];
}

function isMinorTypo(typedWord: string, targetWord: string) {
  const typed = normalizeForSpellCheck(typedWord);
  const target = normalizeForSpellCheck(targetWord);
  if (!typed || !target) return false;
  if (typed === target) return true;
  if (typed[0] !== target[0]) return false;
  if (Math.abs(typed.length - target.length) > 3) return false;
  const threshold = target.length <= 4 ? 1 : target.length <= 7 ? 2 : 3;
  const distance = levenshteinDistance(typed, target);
  return distance > 0 && distance <= threshold;
}

interface StealthModeCardProps {
  verse: Verse | null;
  onBrowseVerses?: () => void;
  onChangeMode?: () => void;
  verseParts?: string[];
  startVerse?: number;
  onAttemptSaved?: () => void;
  onAttemptStateChange?: (active: boolean) => void;
  trackingMode?: TrackingMode;
  onAttemptResult?: (attempt: Attempt) => void;
}

export const StealthModeCard: React.FC<StealthModeCardProps> = ({
  verse,
  onBrowseVerses,
  onChangeMode,
  verseParts,
  startVerse = 1,
  onAttemptSaved,
  onAttemptStateChange,
  trackingMode = 'progress',
  onAttemptResult,
}) => {
  const { pushToast } = useToast();
  const [wordsArray, setWordsArray] = React.useState<string[]>([]);
  const [markers, setMarkers] = React.useState<Array<{ index: number; label: string }>>([]);
  const [completedWords, setCompletedWords] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [sessionKey, setSessionKey] = React.useState(0);
  const wordStatsRef = React.useRef<WordAttemptStat[]>([]);
  const attemptStartRef = React.useRef<number | null>(null);
  const hiddenInputRef = React.useRef<HiddenInlineInputHandle | null>(null);
  const [hasStarted, setHasStarted] = React.useState(false);
  const [isAwaitingCitation, setIsAwaitingCitation] = React.useState(false);
  const [lastAttemptSummary, setLastAttemptSummary] = React.useState<{
    accuracy: number;
    stats: StealthAttemptStats;
  } | null>(null);
  const [attempts, setAttempts] = React.useState<Attempt[]>([]);
  const [citationSegments, setCitationSegments] = React.useState<CitationSegment[]>([]);
  const [appendedReference, setAppendedReference] = React.useState<Partial<Record<CitationSegmentId, string>>>({});
  const citationButtonsRef = React.useRef<Partial<Record<CitationSegmentId, HTMLButtonElement | null>>>({});
  const [citationAnnounce, setCitationAnnounce] = React.useState<string>('');
  const [peeksUsed, setPeeksUsed] = React.useState(0);
  const [isPeekModalOpen, setIsPeekModalOpen] = React.useState(false);
  const [peekDurationFactor, setPeekDurationFactor] = React.useState<number>(1);
  const MAX_PEEKS = 3;
  const [isPerfectModalOpen, setIsPerfectModalOpen] = React.useState(false);
  const [perfectModalData, setPerfectModalData] = React.useState<{ remaining: number; isCompleted: boolean } | null>(null);
  const [pendingCorrection, setPendingCorrection] = React.useState<CorrectionRequestState | null>(null);
  const [correctionAnchorRect, setCorrectionAnchorRect] = React.useState<DOMRect | null>(null);
  const [viewportSize, setViewportSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const correctionMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [isClient, setIsClient] = React.useState(false);
  const isTrackingProgress = trackingMode === 'progress';
  const userId = useAuthUserId();

  // Compute completion status
  const modeStatus = React.useMemo(() => {
    if (!verse) return { isCompleted: false, perfectCount: 0, completedAt: null, progress: 0, mode: 'stealth' as const };
    const p = loadProgress();
    const verseData = p.verses[verse.id];
    if (!verseData) return { isCompleted: false, perfectCount: 0, completedAt: null, progress: 0, mode: 'stealth' as const };
    const completion = verseData.modeCompletions?.stealth;
    return getModeCompletionStatus('stealth', completion);
  }, [verse, attempts]);

  React.useEffect(() => {
    if (!verse) {
      setAttempts([]);
      onAttemptStateChange?.(false);
      return;
    }
    const progress = loadProgress();
    const entry = progress.verses[verse.id];
    setAttempts(entry?.attempts || []);
  }, [verse, onAttemptStateChange]);

  React.useEffect(() => () => {
    onAttemptStateChange?.(false);
  }, [onAttemptStateChange]);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    setPendingCorrection(null);
    setCorrectionAnchorRect(null);
  }, [verse, isAwaitingCitation, isCompleted]);

  React.useEffect(() => {
    if (!pendingCorrection?.anchorEl) {
      setCorrectionAnchorRect(null);
      return;
    }
    const updateGeometry = () => {
      const rect = pendingCorrection.anchorEl?.getBoundingClientRect();
      if (rect) {
        setCorrectionAnchorRect(rect);
        setViewportSize({ width: window.innerWidth, height: window.innerHeight });
      }
    };
    updateGeometry();
    window.addEventListener('resize', updateGeometry);
    window.addEventListener('scroll', updateGeometry, true);
    return () => {
      window.removeEventListener('resize', updateGeometry);
      window.removeEventListener('scroll', updateGeometry, true);
    };
  }, [pendingCorrection]);

  React.useEffect(() => {
    if (!pendingCorrection) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        !target ||
        correctionMenuRef.current?.contains(target) ||
        pendingCorrection.anchorEl?.contains(target as Node)
      ) {
        return;
      }
      setPendingCorrection(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingCorrection(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pendingCorrection]);

  React.useEffect(() => {
    if (!verse) {
      setWordsArray([]);
      setMarkers([]);
      setCompletedWords(0);
      setProgress(0);
    setIsCompleted(false);
    setSessionKey(prev => prev + 1);
    wordStatsRef.current = [];
    attemptStartRef.current = null;
    setHasStarted(false);
    setLastAttemptSummary(null);
    onAttemptStateChange?.(false);
    setCitationSegments([]);
    setAppendedReference({});
    setIsAwaitingCitation(false);
    return;
  }

  // Sanitize verse text that may include HTML markers like
  // `<sup>1</sup>&nbsp;` or `<sup>1</sup> ` (used when rendering verseParts with numbers).
  // Those should not be treated as part of the token stream.
  const words = (() => {
    if (!verse?.text) return [] as string[];
    // Remove explicit <sup>n</sup>&nbsp; or <sup>n</sup> sequences (with optional space/&nbsp; after)
    const cleaned = verse.text
      .replace(/<sup>\d+<\/sup>(?:&nbsp;|\s)?/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();
    return cleaned.split(/\s+/).filter(Boolean);
  })();
    setWordsArray(words);
    setCompletedWords(0);
    setProgress(0);
    setIsCompleted(false);
    setSessionKey(prev => prev + 1);
    wordStatsRef.current = [];
    attemptStartRef.current = null;
    setHasStarted(false);
    setLastAttemptSummary(null);
    onAttemptStateChange?.(false);
    setCitationSegments(extractCitationSegments(verse.reference));
    setIsAwaitingCitation(false);
    setAppendedReference({});

    if (verseParts && verseParts.length > 0 && startVerse != null) {
      let runningIndex = 0;
      const computedMarkers: Array<{ index: number; label: string }> = [];
      verseParts.forEach((part, idx) => {
        const tokenCount = part.trim().split(/\s+/).filter(Boolean).length;
        computedMarkers.push({ index: runningIndex, label: String(startVerse + idx) });
        runningIndex += tokenCount;
      });
      setMarkers(computedMarkers);
    } else {
      setMarkers([]);
    }
  }, [verse, verseParts, startVerse, onAttemptStateChange]);

  const totalWords = wordsArray.length;

  const handleFirstInteraction = React.useCallback(() => {
    if (attemptStartRef.current === null) {
      attemptStartRef.current = Date.now();
    }
    setHasStarted(true);
    onAttemptStateChange?.(true);
  }, [onAttemptStateChange]);

  const finalizeAttempt = React.useCallback(() => {
    const statsList = wordStatsRef.current
      .slice(0, totalWords)
      .filter((stat): stat is WordAttemptStat => Boolean(stat));
    const totalMistakes = statsList.reduce((sum, stat) => sum + stat.mistakes, 0);
    const totalCharacters = statsList.reduce((sum, stat) => sum + stat.typedLength, 0);
    const correctedWords = statsList.filter(stat => !stat.correct).length;
    const flawlessWords = Math.max(0, totalWords - correctedWords);
    let currentStreak = 0;
    let longestFlawlessStreak = 0;
    for (const stat of statsList) {
      if (stat.correct) {
        currentStreak += 1;
        if (currentStreak > longestFlawlessStreak) {
          longestFlawlessStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }
    const durationMs = attemptStartRef.current ? Date.now() - attemptStartRef.current : 0;
    const attemptsPerWord = totalWords > 0 ? (totalMistakes + totalWords) / totalWords : 0;
    const wordsPerMinute = durationMs > 0 ? totalWords / (durationMs / 60000) : 0;
    const accuracy = totalWords > 0 ? Math.max(0, Math.round((1 - totalMistakes / totalWords) * 100)) : 0;

    const summary: StealthAttemptStats = {
      totalWords,
      flawlessWords,
      correctedWords,
      totalMistakes,
      totalCharacters,
      durationMs,
      wordsPerMinute: Number.isFinite(wordsPerMinute) ? Number(wordsPerMinute.toFixed(1)) : 0,
      averageAttemptsPerWord: Number.isFinite(attemptsPerWord) ? Number(attemptsPerWord.toFixed(2)) : 0,
      longestFlawlessStreak,
    };

    const diffTokens: DiffToken[] = wordsArray.map((word, index) => {
      const stat = wordStatsRef.current[index];
      const status = !stat ? 'missing' : stat.mistakes > 0 ? 'missing' : 'match';
      // Determine verse number for this token using markers (markers are { index, label })
      let verseNum: number | undefined = undefined;
      if (markers && markers.length) {
        // find the last marker whose index is <= current index
        const applicable = markers.filter(m => m.index <= index).sort((a,b)=>b.index-a.index)[0];
        if (applicable) {
          const parsed = Number(applicable.label);
          if (!Number.isNaN(parsed)) verseNum = parsed;
        }
      }
      return {
        token: word,
        status,
        verse: verseNum,
      };
    });

    setLastAttemptSummary({ accuracy, stats: summary });
    attemptStartRef.current = null;
    onAttemptStateChange?.(false);

    if (!verse) {
      return;
    }

    let feedback: string | undefined;
    if (totalWords === 0) {
      feedback = undefined;
    } else if (totalMistakes === 0) {
      feedback = 'Sin correcciones: memorización impecable.';
    } else if (totalMistakes === 1) {
      feedback = 'Solo una corrección en todo el pasaje. ¡Gran trabajo!';
    } else if (totalWords > 0 && correctedWords / totalWords >= 0.5) {
      feedback = 'Más de la mitad de las palabras requirieron corrección; repasa este pasaje otra vez.';
    } else {
      feedback = 'Buen progreso. Practica para reducir las correcciones restantes.';
    }

    const attempt: Attempt = {
      ts: Date.now(),
      mode: 'stealth',
      inputLength: totalCharacters,
      accuracy,
      missedWords: [],
      extraWords: [],
      feedback,
      diff: diffTokens,
      stealthStats: summary,
    };

    if (isTrackingProgress) {
      appendAttempt(verse, attempt, { userId: userId || undefined });
      const progress = loadProgress();
      const updatedAttempts = progress.verses[verse.id]?.attempts || [];
      setAttempts(updatedAttempts);
      onAttemptSaved?.();

      // Show perfect modal if accuracy is 100%
      if (attempt.accuracy === 100) {
        const updatedVerseData = progress.verses[verse.id];
        if (updatedVerseData) {
          const updatedStatus = getModeCompletionStatus('stealth', updatedVerseData.modeCompletions?.stealth);
          const remaining = 3 - updatedStatus.perfectCount;
          setPerfectModalData({ remaining, isCompleted: updatedStatus.isCompleted });
          setIsPerfectModalOpen(true);
        }
      }
    }
    onAttemptResult?.(attempt);
    setHasStarted(false);
  }, [totalWords, verse, onAttemptSaved, onAttemptStateChange, wordsArray, markers, isTrackingProgress, onAttemptResult]);

  const handleReset = React.useCallback(() => {
    setCompletedWords(0);
    setProgress(0);
    setIsCompleted(false);
    setSessionKey(prev => prev + 1);
    wordStatsRef.current = [];
    attemptStartRef.current = null;
    setHasStarted(false);
    setLastAttemptSummary(null);
    onAttemptStateChange?.(false);
    setCitationSegments(prev => prev.map(segment => ({ ...segment, appended: false })));
    setAppendedReference({});
    setIsAwaitingCitation(false);
    setPeeksUsed(0);
    setPendingCorrection(null);
    setCorrectionAnchorRect(null);
  }, [onAttemptStateChange]);

  const completeAttempt = React.useCallback(() => {
    setIsAwaitingCitation(false);
    setIsCompleted(true);
    finalizeAttempt();
  }, [finalizeAttempt]);

  const handleCitationSegmentClick = React.useCallback((segmentId: CitationSegmentId) => {
    setCitationSegments(prev => {
      const segment = prev.find(item => item.id === segmentId);
      if (!segment || segment.appended) {
        return prev;
      }
      const nextSegment = [...prev].find(item => !item.appended);
      if (nextSegment && nextSegment.id !== segmentId) {
        return prev;
      }
      // mark appended and update appendedReference
      setAppendedReference(prevRef => ({ ...prevRef, [segmentId]: segment.label }));
      // Announce for screen readers
      setCitationAnnounce(`Agregado: ${segment.label}`);
      return prev.map(item =>
        item.id === segmentId ? { ...item, appended: true } : item
      );
    });
  }, []);

  // When citationSegments change and we're awaiting citation, move focus to the next non-appended segment
  React.useEffect(() => {
    if (!isAwaitingCitation) return;
    const next = citationSegments.find(s => !s.appended);
    if (next) {
      const btn = citationButtonsRef.current[next.id];
      try {
        btn?.focus();
      } catch {
        // ignore
      }
    }
  }, [citationSegments, isAwaitingCitation]);

  const appendedReferenceText = React.useMemo(() => {
    const book = appendedReference.book;
    const chapter = appendedReference.chapter;
    const versesLabel = appendedReference.verses;
    if (!book && !chapter && !versesLabel) {
      return '';
    }

    const pieces: string[] = [];
    if (book) {
      pieces.push(book);
    }
    if (chapter) {
      const chapterPiece = versesLabel ? `${chapter}:${versesLabel}` : chapter;
      pieces.push(chapterPiece);
      return pieces.join(' ');
    }
    if (versesLabel) {
      pieces.push(versesLabel);
    }
    return pieces.join(' ');
  }, [appendedReference]);

  const correctionSuggestions = React.useMemo(() => {
    if (!pendingCorrection) return [];
    return buildCorrectionSuggestions(pendingCorrection.targetWord, pendingCorrection.typedWord);
  }, [pendingCorrection]);

  const handlePeekClick = React.useCallback(() => {
    if (!verse) return;
    
    // Si no ha empezado el intento, permitir vistazo sin límite y sin countdown
    if (!hasStarted) {
      setPeekDurationFactor(0); // 0 indica sin countdown
      setIsPeekModalOpen(true);
      return;
    }
    
    // Durante el intento, aplicar límite de 3 vistazos con countdown
    if (peeksUsed >= MAX_PEEKS) return;
    
    // Calcular el factor base según el número de vistazo
    const upcoming = peeksUsed + 1;
    const baseFactor = upcoming === 1 ? 1 : upcoming === 2 ? 0.8 : 0.6;
    
    // Ajustar el factor según el progreso: solo mostrar tiempo proporcional a lo que falta
    const progressFactor = totalWords > 0 ? Math.max(0.2, (totalWords - completedWords) / totalWords) : 1;
    const adjustedFactor = baseFactor * progressFactor;
    
    setPeekDurationFactor(adjustedFactor);
    setPeeksUsed(prev => prev + 1);
    setIsPeekModalOpen(true);
  }, [peeksUsed, verse, hasStarted, completedWords, totalWords]);

  const handleRequestCorrection = React.useCallback((payload: { index: number; typed: string; target: string; element: HTMLElement | null }) => {
    const { index, typed, target, element } = payload;
    if (!isMinorTypo(typed, target)) {
      pushToast({
        title: 'No se puede corregir',
        description: 'Solo se permiten errores ortográficos pequeños.',
      });
      return;
    }
    setPendingCorrection({ index, typedWord: typed, targetWord: target, anchorEl: element ?? null });
  }, [pushToast]);

  const closeCorrectionMenu = React.useCallback(() => {
    setPendingCorrection(null);
    setCorrectionAnchorRect(null);
  }, []);

  const handleApplyCorrection = React.useCallback((replacement: string) => {
    if (!pendingCorrection) return;
    const trimmedReplacement = (replacement || '').trim();
    if (!trimmedReplacement) {
      closeCorrectionMenu();
      return;
    }
    const { index } = pendingCorrection;
    const stat = wordStatsRef.current[index];
    if (!stat) {
      closeCorrectionMenu();
      return;
    }

    wordStatsRef.current[index] = {
      ...stat,
      mistakes: 0,
      correct: true,
      typedWord: trimmedReplacement,
      correctedManually: true,
    };

    hiddenInputRef.current?.applyCorrection({
      index,
      displayWord: trimmedReplacement,
      correctedManually: true,
    });

    closeCorrectionMenu();
  }, [pendingCorrection, pushToast, closeCorrectionMenu]);

  const getPeekButtonStyles = React.useCallback(() => {
    // Si no ha empezado, mostrar estilo verde (vistazo ilimitado)
    if (!hasStarted) {
      return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 border-blue-300 dark:border-blue-800';
    }
    
    // Durante el intento, aplicar colores según vistazos usados
    if (peeksUsed >= MAX_PEEKS) {
      return 'opacity-50 cursor-not-allowed bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600';
    }
    if (peeksUsed === 0) {
      return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900 border-green-300 dark:border-green-800';
    }
    if (peeksUsed === 1) {
      return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900 border-yellow-300 dark:border-yellow-800';
    }
    // peeksUsed === 2 (último vistazo disponible)
    return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900 border-red-300 dark:border-red-800';
  }, [peeksUsed, hasStarted]);

  React.useEffect(() => {
    if (!isAwaitingCitation) return;
    if (!citationSegments.length) {
      completeAttempt();
      return;
    }
    const allAppended = citationSegments.every(segment => segment.appended);
    if (allAppended) {
      completeAttempt();
    }
  }, [citationSegments, completeAttempt, isAwaitingCitation]);

  const renderAttemptWords = React.useCallback(() => (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">
        {wordsArray.map((word, idx) => {
          const stat = wordStatsRef.current[idx];
          if (!stat || stat.correct) {
            const correctedManually = Boolean(stat?.correctedManually);
            return (
              <span key={idx} className="inline-flex items-center mr-1">
                {/* If markers are provided, render verse number when index matches a marker */}
                {markers.find(m => m.index === idx) ? (
                  <sup className="font-bold mr-1">{markers.find(m => m.index === idx)!.label}</sup>
                ) : null}
                <span
                  className={cn(
                    'text-neutral-900 dark:text-neutral-100',
                    correctedManually && 'underline decoration-dotted decoration-amber-500 underline-offset-4'
                  )}
                  title={correctedManually ? 'Corregido manualmente durante el intento' : undefined}
                >
                  {word}
                  {correctedManually && <span className="sr-only">Corregido manualmente</span>}
                </span>
              </span>
            );
          }

          const typedWord = stat.typedWord || word;
          return (
            <span key={idx} className="inline-flex items-center gap-1 mr-1">
                {markers.find(m => m.index === idx) ? (
                  <sup className="font-bold mr-1">{markers.find(m => m.index === idx)!.label}</sup>
                ) : null}
                <span className="text-red-600 dark:text-red-400 line-through">{typedWord}</span>
                <span aria-hidden className="text-neutral-400 dark:text-neutral-500">→</span>
                <span>{word}</span>
                <span className="sr-only">{`Incorrecto: ${typedWord}. Correcto: ${word}.`}</span>
              </span>
          );
        })}
      </div>
    </div>
  ), [appendedReferenceText, wordsArray, markers]);

  const renderCitationControls = React.useCallback(() => {
    if (!citationSegments.length) return null;
    
    return (
      <CitationBubbles
        segments={citationSegments}
        onSegmentClick={handleCitationSegmentClick}
        appendedReference={appendedReference}
        announce={citationAnnounce}
        onButtonRef={(id, el) => { citationButtonsRef.current[id] = el; }}
      />
    );
  }, [citationSegments, handleCitationSegmentClick, appendedReference, citationAnnounce]);

  if (!verse) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">📝</div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Selecciona un pasaje para practicar
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              Escoge un versículo para comenzar el modo sigiloso.
            </p>
            {onBrowseVerses && (
              <Button onClick={onBrowseVerses}>
                Elegir pasaje
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <EyeOff size={18} />
              Modo Sigilo
            </CardTitle>
            <CardDescription>{verse.reference}</CardDescription>
          </div>
          {!isCompleted && !isAwaitingCitation && (
            <button
              onClick={handlePeekClick}
              disabled={hasStarted && peeksUsed >= MAX_PEEKS}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
                getPeekButtonStyles(),
                (hasStarted && peeksUsed >= MAX_PEEKS) && 'opacity-50 cursor-not-allowed'
              )}
              title={
                !hasStarted 
                  ? 'Ver el pasaje antes de empezar'
                  : peeksUsed >= MAX_PEEKS 
                    ? 'Sin vistazos disponibles' 
                    : `Vistazo rápido (${MAX_PEEKS - peeksUsed} disponibles)`
              }
            >
              <Eye size={16} />
              <span className="hidden sm:inline">Vistazo</span>
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6 overflow-auto">
        {!isCompleted ? (
          !isAwaitingCitation ? (
            <div className="space-y-4">
              {!hasStarted && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-400">
                  Escribe cada palabra desde memoria. El texto permanece oculto hasta que ingreses la palabra correcta. Presiona espacio para comprobar.
                </div>
              )}
              <HiddenInlineInput
                ref={hiddenInputRef}
                key={sessionKey}
                words={wordsArray}
                markers={markers}
                onFirstInteraction={handleFirstInteraction}
                canRequestCorrection={({ typed, target }) => isMinorTypo(typed, target)}
                onRequestCorrection={handleRequestCorrection}
                onWordCommit={({ index: wordIndex, typed, mistakes, durationMs, correct }) => {
                  const completed = wordIndex + 1;
                  setCompletedWords(completed);
                  if (totalWords > 0) {
                    setProgress((completed / totalWords) * 100);
                  }
                  wordStatsRef.current[wordIndex] = {
                    index: wordIndex,
                    mistakes,
                    durationMs,
                    typedLength: typed.length,
                    correct,
                    typedWord: typed,
                    correctedManually: false,
                  };
                }}
              onDone={() => {
                setCompletedWords(totalWords);
                setProgress(100);
                if (citationSegments.length > 0) {
                  setIsAwaitingCitation(true);
                  setHasStarted(false);
                } else {
                  completeAttempt();
                }
              }}
              />
              {hasStarted && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="shrink-0"
                >
                  Reiniciar intento
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {renderAttemptWords()}
              {renderCitationControls()}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {renderAttemptWords()}
            {lastAttemptSummary && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
                  <p className="text-[12px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Precisión</p>
                  <p className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">{lastAttemptSummary.accuracy}%</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Correcciones: {lastAttemptSummary.stats.totalMistakes}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/40 space-y-0.5">
                  <p className="text-[12px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Palabras</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">Perfectas: {lastAttemptSummary.stats.flawlessWords}</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">Corregidas: {lastAttemptSummary.stats.correctedWords}</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">Racha: {lastAttemptSummary.stats.longestFlawlessStreak}</p>
                </div>
              </div>
            )}
            
            {/* Mode completion progress */}
            <div className="flex items-center gap-2 text-xs">
              {modeStatus.perfectCount <= 3 && (
                <>
                  <span className="text-neutral-600 dark:text-neutral-400">Intentos perfectos:</span>
                  <span className="font-semibold">{modeStatus.perfectCount}/3</span>
                </>
              )}
              {modeStatus.isCompleted && (
                <Badge variant="default" className="ml-1 bg-green-600 hover:bg-green-700 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Modo completado
                </Badge>
              )}
            </div>
            
            <ModeActionButtons
              isCompleted={modeStatus.isCompleted}
              onRetry={handleReset}
              onChangeMode={onBrowseVerses}
            />
          </div>
        )}

        {attempts.length > 0 && !hasStarted && !isAwaitingCitation && isTrackingProgress && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Historial</h4>
              <History attempts={attempts} />
            </div>
          </>
        )}
      </CardContent>

      <PeekModal
        isOpen={isPeekModalOpen}
        onClose={() => setIsPeekModalOpen(false)}
        verseText={verse?.text || ''}
        verseReference={verse?.reference}
        durationFactor={peekDurationFactor}
      />

      <PerfectScoreModal
        isOpen={isPerfectModalOpen}
        onOpenChange={(open) => setIsPerfectModalOpen(open)}
        data={perfectModalData}
        modeLabel="Modo Sigilo"
        perfectCount={modeStatus.perfectCount}
      />

      {isClient && pendingCorrection && correctionAnchorRect && correctionSuggestions.length > 0 && createPortal(
        <div
          ref={correctionMenuRef}
          className="fixed z-50 w-56 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl ring-1 ring-black/5 dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/10"
          role="menu"
          style={{
            top: clamp(correctionAnchorRect.bottom + 8, 8, Math.max(8, viewportSize.height - 140)),
            left: clamp(correctionAnchorRect.left, 8, Math.max(8, viewportSize.width - 280)),
          }}
        >
          <div className="space-y-1">
            {correctionSuggestions.map(suggestion => (
              <button
                key={`${suggestion.value}-${suggestion.hint}`}
                type="button"
                onClick={() => handleApplyCorrection(suggestion.value)}
                className="w-full rounded-xl border border-transparent px-3 py-1.5 text-left text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-100 dark:hover:bg-neutral-800"
                role="menuitem"
              >
                <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">{suggestion.hint}</span>
                <span className="block">{suggestion.value}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </Card>
  );
};
