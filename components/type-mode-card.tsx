"use client";
import * as React from 'react';
import { Verse, Attempt, GradeResponse } from '../lib/types';
import { appendAttempt, loadProgress, clearVerseHistory } from '../lib/storage';
import { classNames, cn } from '../lib/utils';
import { gradeAttempt } from '@/lib/grade';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { TooltipIconButton } from '@/components/ui/tooltip-icon-button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { RotateCcw } from 'lucide-react';
import { History } from './history';
import DiffRenderer from './diff-renderer';
import { useToast } from './ui/toast';
import { PeekModal } from './peek-modal';
import { Eye } from 'lucide-react';

interface Props {
  verse: Verse | null;
  onAttemptSaved: () => void; // trigger parent to refresh progress state
  onFirstType: () => void; // invoked when user starts typing a non-empty attempt for this verse
  onAttemptStateChange?: (active: boolean) => void;
}

export const TypeModeCard: React.FC<Props> = ({ verse, onAttemptSaved, onFirstType, onAttemptStateChange }) => {
  const { pushToast } = useToast();
  const attemptBoxRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = React.useState('');
  const [status, setStatus] = React.useState<'idle'|'submitting'|'result'|'error'>('idle');
  const [result, setResult] = React.useState<GradeResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [attempts, setAttempts] = React.useState<Attempt[]>([]);
  const liveRef = React.useRef<HTMLDivElement | null>(null);
  const [isClearHistoryOpen, setIsClearHistoryOpen] = React.useState(false);
  const [peeksUsed, setPeeksUsed] = React.useState(0);
  const [isPeekModalOpen, setIsPeekModalOpen] = React.useState(false);
  const [peekDurationFactor, setPeekDurationFactor] = React.useState<number>(1);
  const MAX_PEEKS = 3;
  // Naive grading is now the default and only mode

  // load attempts for current verse
  React.useEffect(()=>{
    if (!verse) {
      setAttempts([]);
      onAttemptStateChange?.(false);
      setText('');
      setStatus('idle');
      setResult(null);
      setError(null);
      setPeeksUsed(0);
      return;
    }
    const p = loadProgress();
    const data = p.verses[verse.id];
    setAttempts(data?.attempts || []);
    onAttemptStateChange?.(false);
    setText('');
    setStatus('idle');
    setResult(null);
    setError(null);
    setPeeksUsed(0);
  }, [verse, onAttemptStateChange]);

  React.useEffect(() => {
    return () => {
      onAttemptStateChange?.(false);
    };
  }, [onAttemptStateChange]);

  const submit = React.useCallback(function submit() {
    if (!verse || !text.trim()) return;
    setStatus('submitting');
    setError(null);
    // Hide the textarea area while we grade by clearing the input immediately
    const attemptText = text;
    setText('');
    onAttemptStateChange?.(false);
    try {
      const gradeResult = gradeAttempt(verse.text, attemptText);
      setResult(gradeResult);
      setStatus('result');
      const attempt: Attempt = {
        ts: Date.now(),
        mode: 'type',
        inputLength: attemptText.length,
        accuracy: gradeResult.accuracy,
        missedWords: gradeResult.missedWords || [],
        extraWords: gradeResult.extraWords || [],
        feedback: gradeResult.feedback,
        diff: gradeResult.diff
      };
      appendAttempt(verse, attempt);
      onAttemptSaved();
      const p = loadProgress();
      setAttempts(p.verses[verse.id]?.attempts || []);
      setTimeout(()=>{
        if (liveRef.current) liveRef.current.textContent = `Precisión ${attempt.accuracy} por ciento. Se omitieron ${attempt.missedWords.length} palabras.`;
      }, 50);
    } catch (e:any) {
      console.error(e);
      const msg = e?.message ? String(e.message) : 'No se pudo calificar';
      setError(msg);
      pushToast({ title: 'Error al calificar', description: msg });
      setStatus('error');
    }
  }, [verse, text, onAttemptSaved, pushToast, onAttemptStateChange]);

  function resetAttempt() {
    setText('');
    setStatus('idle');
    setResult(null);
    setError(null);
    onAttemptStateChange?.(false);
    setPeeksUsed(0);
    attemptBoxRef.current?.focus();
  }

  // keyboard shortcuts
  React.useEffect(()=>{
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [submit]);

  const isSubmitting = status === 'submitting';
  const disabled = !verse || !text.trim() || isSubmitting;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const peekDisabled = peeksUsed >= MAX_PEEKS || !text.trim();

  const handlePeekClick = React.useCallback(() => {
    if (peeksUsed >= MAX_PEEKS || !verse) return;
    // determine factor based on upcoming peek index (peeksUsed is current used)
    const upcoming = peeksUsed + 1; // 1-based
    const factor = upcoming === 1 ? 1 : upcoming === 2 ? 0.8 : 0.6;
    setPeekDurationFactor(factor);
    setPeeksUsed(prev => prev + 1);
    setIsPeekModalOpen(true);
  }, [peeksUsed, verse]);

  const getPeekButtonStyles = React.useCallback(() => {
    if (peeksUsed >= MAX_PEEKS) {
      return 'opacity-50 cursor-not-allowed bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600';
    }
    if (peeksUsed === 0) {
      return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900 border-green-300 dark:border-green-800';
    }
    if (peeksUsed === 1) {
      return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900 border-yellow-300 dark:border-yellow-800';
    }
    // peeksUsed === 2
    return 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900 border-orange-300 dark:border-orange-800';
  }, [peeksUsed]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Modo Escritura</CardTitle>
            <CardDescription>{verse? verse.reference : 'Selecciona un versículo para comenzar'}</CardDescription>
          </div>
            <div className="flex items-center gap-2">
              {verse && status !== 'result' && (
                <button
                  onClick={handlePeekClick}
                  disabled={peekDisabled}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
                    getPeekButtonStyles(),
                    peekDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                  title={peeksUsed >= MAX_PEEKS ? 'Sin vistazos disponibles' : `Vistazo rápido (${MAX_PEEKS - peeksUsed} disponibles)`}
                >
                  <Eye size={16} />
                  <span className="hidden sm:inline">Vistazo</span>
                </button>
              )}
              {/* LLM toggle removed - naive only */}
              <TooltipIconButton label="Reiniciar intento" onClick={resetAttempt}><RotateCcw size={16} /></TooltipIconButton>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1 overflow-auto">
        {status === 'result' && result ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-semibold">{result.accuracy}%</span>
                <div className="flex-1 relative">
                  <Progress value={result.accuracy} className="bg-neutral-200 dark:bg-neutral-800" />
                  <div className={classNames('absolute inset-0 rounded-full mix-blend-multiply pointer-events-none', result.accuracy>=85 && 'bg-green-500/30', result.accuracy>=60 && result.accuracy<85 && 'bg-blue-500/30', result.accuracy<60 && 'bg-amber-500/30')} aria-hidden />
                </div>
              </div>
              {result.diff && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-500">Diferencia aproximada</p>
                  <div className="p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 max-h-48 overflow-auto leading-relaxed text-sm">
                    <DiffRenderer diff={result.diff} />
                  </div>
                  <p className="text-[10px] text-neutral-500">La puntuación aparece en amarillo (no afecta la puntuación).</p>
                </div>
              )}
              <div>
                <Button onClick={resetAttempt} className="flex items-center gap-2">
                  <RotateCcw size={16} />
                  Intentar de nuevo
                </Button>
              </div>
            </div>
            <Separator />
          </>
        ) : (
          <>
            {isSubmitting ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500" htmlFor="attempt-box">Tu intento</label>
                <Textarea
                  ref={attemptBoxRef}
                  id="attempt-box"
                  value={text}
                  onChange={e=>{
                    const v = e.target.value;
                    const trimmed = v.trim();
                    if (!text && trimmed) {
                      onFirstType();
                    }
                    setText(v);
                    onAttemptStateChange?.(trimmed.length > 0);
                  }}
                  placeholder="Escribe el versículo de memoria..."
                  rows={5}
                  disabled={!verse}
                  className="font-mono"
                />
                <div className="flex items-center justify-between text-xs text-neutral-500"><span>{wordCount} palabra{wordCount === 1 ? '' : 's'}</span></div>
                <div>
                  <Button onClick={submit} disabled={disabled} className="min-w-[120px]">
                    Calificar
                  </Button>
                </div>
              </div>
            )}
            <Separator />
          </>
        )}
        <div aria-live="polite" ref={liveRef} className="sr-only" />
        <div className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-500/10 border border-red-200 dark:border-red-800 p-2 rounded">{error}</div>}
        </div>
        {attempts.length > 0 && !text.trim() && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Historial</h4>
              <History attempts={attempts} onClear={()=>{
                if(!verse) return;
                setIsClearHistoryOpen(true);
              }} />
            </div>
          </>
        )}
      </CardContent>
      <Dialog open={isClearHistoryOpen} onOpenChange={(open)=>{
        if(!open) setIsClearHistoryOpen(false);
      }}>
        <DialogContent className="max-w-sm" onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>¿Borrar historial de este pasaje?</DialogTitle>
            <DialogDescription>
              Esto eliminará únicamente el registro de intentos de este pasaje. No afectará a otros versículos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setIsClearHistoryOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!verse) return;
                clearVerseHistory(verse.id);
                const p = loadProgress();
                setAttempts(p.verses[verse.id]?.attempts || []);
                pushToast({ title: 'Historial eliminado', description: verse.reference });
                setIsClearHistoryOpen(false);
              }}
            >
              Borrar historial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PeekModal
        isOpen={isPeekModalOpen}
        onClose={() => setIsPeekModalOpen(false)}
        verseText={verse?.text || ''}
        verseReference={verse?.reference}
        durationFactor={peekDurationFactor}
      />
    </Card>
  );
};
