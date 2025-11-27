"use client";
import * as React from 'react';
import { Verse, Attempt, GradeResponse, TranscriptionResponse, TrackingMode } from '../lib/types';
import { appendAttempt, loadProgress, clearVerseHistory } from '../lib/storage';
import { getModeCompletionStatus } from '@/lib/completion';
import { classNames, cn } from '../lib/utils';
import { gradeAttempt } from '@/lib/grade';
import { getRecordingLimitInfo } from '../lib/audio-utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Volume2, Loader2, RotateCcw, SendHorizontal, Pencil, Mic, Square, Trophy } from 'lucide-react';

const SILENCE_RMS_THRESHOLD = 0.005;
const MIN_AUDIO_DURATION_SECONDS = 0.35;
const MAX_ANALYSIS_SAMPLES = 50000;
const ACTIVITY_SAMPLE_THRESHOLD = 0.02;
const MIN_ACTIVE_SAMPLE_RATIO = 0.12;
import { AudioRecorder, AudioRecorderHandle } from './audio-recorder';
import { MicrophoneTester, MicrophoneTesterHandle } from './microphone-tester';
import { ModeActionButtons } from './mode-action-buttons';
import { History } from './history';
import DiffRenderer from './diff-renderer';
import { useToast } from './ui/toast';
// Peek modal removed for Speech mode
import PerfectScoreModal from './perfect-score-modal';

interface Props {
  verse: Verse | null;
  onAttemptSaved: () => void;
  onFirstRecord: () => void;
  onBlockNavigationChange?: (shouldBlock: boolean) => void;
  onBrowseVerses?: () => void;
  trackingMode?: TrackingMode;
  onAttemptResult?: (attempt: Attempt) => void;
}

export const SpeechModeCard: React.FC<Props> = ({
  verse,
  onAttemptSaved,
  onFirstRecord,
  onBlockNavigationChange,
  onBrowseVerses,
  trackingMode = 'progress',
  onAttemptResult,
}) => {
  const { pushToast } = useToast();
  const [status, setStatus] = React.useState<'idle' | 'recording' | 'transcribing' | 'transcribed' | 'editing' | 'grading' | 'result' | 'error' | 'silent'>('idle');
  const [result, setResult] = React.useState<GradeResponse | null>(null);
  const [transcription, setTranscription] = React.useState<string>('');
  const [editedTranscription, setEditedTranscription] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [attempts, setAttempts] = React.useState<Attempt[]>([]);
  const [audioDuration, setAudioDuration] = React.useState<number>(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = React.useState<string | null>(null);
  const [remainingRunwayRatio, setRemainingRunwayRatio] = React.useState(1);
  const [showMicTester, setShowMicTester] = React.useState(false);
  const [inputLevel, setInputLevel] = React.useState(0);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const recordingLimitRef = React.useRef(30);
  const audioPreviewRef = React.useRef<string | null>(null);
  const liveRef = React.useRef<HTMLDivElement | null>(null);
  const [isClearHistoryOpen, setIsClearHistoryOpen] = React.useState(false);
  const recorderRef = React.useRef<AudioRecorderHandle | null>(null);
  const micTesterRef = React.useRef<MicrophoneTesterHandle | null>(null);
  // Peek functionality removed from Speech mode
  const [isPerfectModalOpen, setIsPerfectModalOpen] = React.useState(false);
  const [perfectModalData, setPerfectModalData] = React.useState<{ remaining: number; isCompleted: boolean } | null>(null);
  const isTrackingProgress = trackingMode === 'progress';

  // Compute completion status
  const modeStatus = React.useMemo(() => {
    if (!verse) return { isCompleted: false, perfectCount: 0, completedAt: null, progress: 0, mode: 'speech' as const };
    const p = loadProgress();
    const verseData = p.verses[verse.id];
    if (!verseData) return { isCompleted: false, perfectCount: 0, completedAt: null, progress: 0, mode: 'speech' as const };
    const completion = verseData.modeCompletions?.speech;
    return getModeCompletionStatus('speech', completion);
  }, [verse, attempts]);

  const replaceAudioPreviewUrl = React.useCallback((blob?: Blob) => {
    const current = audioPreviewRef.current;
    if (current) {
      URL.revokeObjectURL(current);
      audioPreviewRef.current = null;
    }

    if (blob) {
      const newUrl = URL.createObjectURL(blob);
      audioPreviewRef.current = newUrl;
      setAudioPreviewUrl(newUrl);
    } else {
      setAudioPreviewUrl(null);
    }
  }, []);

  const resetAttempt = React.useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setTranscription('');
    setEditedTranscription('');
    setAudioDuration(0);
    setRemainingRunwayRatio(1);
    setInputLevel(0);
    setShowMicTester(false);
    replaceAudioPreviewUrl();
  }, [replaceAudioPreviewUrl]);

  const detectSilentAudio = React.useCallback(async (audioBlob: Blob) => {
    if (typeof window === 'undefined') return false;
    const AudioContextCtor = (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioContextCtor) return false;

    let audioContext: AudioContext | null = null;
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      audioContext = new AudioContextCtor();
      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        audioContext!.decodeAudioData(arrayBuffer, resolve, reject);
      });
      if (!audioBuffer || audioBuffer.length === 0) {
        return true;
      }

      const sampleCount = audioBuffer.length;
      const channelCount = audioBuffer.numberOfChannels;
      if (!sampleCount || !channelCount) {
        return true;
      }

      const step = Math.max(1, Math.floor(sampleCount / MAX_ANALYSIS_SAMPLES));
      let totalSquares = 0;
      let counted = 0;
      let activeSamples = 0;
      let peak = 0;

      for (let channel = 0; channel < channelCount; channel++) {
        const data = audioBuffer.getChannelData(channel);
        for (let i = 0; i < data.length; i += step) {
          const sample = data[i];
          totalSquares += sample * sample;
          counted += 1;
          if (Math.abs(sample) > ACTIVITY_SAMPLE_THRESHOLD) {
            activeSamples += 1;
          }
          if (Math.abs(sample) > peak) {
            peak = Math.abs(sample);
          }
        }
      }

      if (!counted) {
        return true;
      }

      const rms = Math.sqrt(totalSquares / counted);
      const activeRatio = activeSamples / counted;

      if (rms < SILENCE_RMS_THRESHOLD && peak < ACTIVITY_SAMPLE_THRESHOLD * 1.5) {
        return true;
      }

      if (activeRatio < MIN_ACTIVE_SAMPLE_RATIO) {
        return true;
      }

      if (audioBuffer.duration < MIN_AUDIO_DURATION_SECONDS && (rms < SILENCE_RMS_THRESHOLD * 1.4 || activeRatio < MIN_ACTIVE_SAMPLE_RATIO * 1.3)) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Audio silence detection failed', error);
      return false;
    } finally {
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
    }
  }, []);

  // Load attempts for current verse
  React.useEffect(() => {
    if (!verse) { 
      setAttempts([]); 
      return; 
    }
    const p = loadProgress();
    const data = p.verses[verse.id];
    setAttempts(data?.attempts || []);
  }, [verse]);

  const transcribeAudio = React.useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    if (verse?.text) {
      formData.append('expectedText', verse.text);
    }
    formData.append('language', 'es');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

  clearTimeout(timeout);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: TranscriptionResponse = await response.json();
      
      if (!data.success || !data.transcription) {
        throw new Error(data.error || 'No se recibió ninguna transcripción');
      }

      return data.transcription;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }, [verse]);

  const gradeTranscription = React.useCallback((transcribedText: string): GradeResponse => {
    if (!verse) throw new Error('No se seleccionó ningún versículo');
    if (!transcribedText.trim()) throw new Error('Necesitas transcribir algo antes de calificar.');
    return gradeAttempt(verse.text, transcribedText);
  }, [verse]);

  const handleRecordingComplete = React.useCallback(async (audioBlob: Blob) => {
    if (!verse) return;

    try {
      setError(null);

      const isSilent = await detectSilentAudio(audioBlob);
      if (isSilent) {
        const message = 'Solo escuchamos ruido ambiente. Intenta grabar desde un lugar más silencioso o acerca el micrófono.';
        setError(message);
        setResult(null);
        setStatus('silent');
        setTranscription('');
        setEditedTranscription('');
        setAudioDuration(0);
        setRemainingRunwayRatio(1);
        setShowMicTester(true);
        setInputLevel(0);
        replaceAudioPreviewUrl(audioBlob);
        return;
      }

      setInputLevel(0);
      setShowMicTester(false);
      replaceAudioPreviewUrl(audioBlob);
      setStatus('transcribing');

      const transcribedText = await transcribeAudio(audioBlob);
      setTranscription(transcribedText);
      setEditedTranscription(transcribedText);
      setStatus('transcribed');
      if (liveRef.current) {
        liveRef.current.textContent = 'Transcripción recibida. Puedes editarla antes de calificar.';
      }

    } catch (err: unknown) {
      console.error('Speech processing error:', err);
      const error = err as Error;
      const message = error.name === 'AbortError' ? 'Se agotó el tiempo de espera' : 
                     error.message || 'No se pudo procesar el audio';
      setError(message);
      setStatus('error');
      pushToast({ 
        title: 'Error al procesar la voz', 
        description: message,
        action: { label: 'Intentar de nuevo', onClick: resetAttempt }
      });
    }
  }, [verse, transcribeAudio, pushToast, resetAttempt, detectSilentAudio, replaceAudioPreviewUrl]);

  const handleRecordingStart = React.useCallback(() => {
    micTesterRef.current?.stop();
    setShowMicTester(false);
    setInputLevel(0);
    setStatus('recording');
    setError(null);
    setResult(null);
    setTranscription('');
    onFirstRecord();
    setRemainingRunwayRatio(1);
    if (liveRef.current) {
      liveRef.current.textContent = 'Grabación iniciada.';
    }
  }, [onFirstRecord]);

  const handleRecordingStop = React.useCallback((duration: number = 0, reason: 'manual' | 'timeout' | 'cancel' = 'manual') => {
    setAudioDuration(duration);

    if (reason === 'cancel') {
      setShowMicTester(false);
      setInputLevel(0);
      resetAttempt();
      setIsCancelDialogOpen(false);
      return;
    }

    const limit = recordingLimitRef.current;
    const ratio = limit > 0 ? Math.max(0, (limit - duration) / limit) : 1;
    setRemainingRunwayRatio(ratio);

    if (reason === 'timeout') {
      pushToast({
        title: 'Grabación detenida',
        description: 'Alcanzaste el límite de tiempo. Revisemos lo grabado antes de intentar de nuevo.',
      });
    }
    if (liveRef.current) {
      liveRef.current.textContent = `Grabación detenida. ${Math.max(0, Math.round(duration))}s grabados.`;
    }
  }, [pushToast, resetAttempt]);
  
  const handleRecordingProgress = React.useCallback((elapsedSeconds: number) => {
    const limit = recordingLimitRef.current;
    if (limit > 0) {
      const ratio = Math.max(0, (limit - elapsedSeconds) / limit);
      setRemainingRunwayRatio(ratio);
    }
  }, []);
  

  const handleSubmitTranscription = React.useCallback(async () => {
    if (!verse || !editedTranscription.trim()) return;

    try {
      setStatus('grading');
      const gradeResult = await gradeTranscription(editedTranscription);
      setResult(gradeResult);
      setStatus('result');

      // Save attempt
      const attempt: Attempt = {
        ts: Date.now(),
        mode: 'speech',
        inputLength: editedTranscription.length,
        accuracy: gradeResult.accuracy,
        missedWords: gradeResult.missedWords || [],
        extraWords: gradeResult.extraWords || [],
        feedback: gradeResult.feedback,
        diff: gradeResult.diff,
        transcription: editedTranscription,
        audioDuration,
        confidenceScore: undefined
      };

      if (isTrackingProgress) {
        appendAttempt(verse, attempt);
        onAttemptSaved();
        
        const p = loadProgress();
        setAttempts(p.verses[verse.id]?.attempts || []);

        // Show perfect modal if accuracy is 100%
        if (attempt.accuracy === 100) {
          const updatedVerseData = p.verses[verse.id];
          if (updatedVerseData) {
            const updatedStatus = getModeCompletionStatus('speech', updatedVerseData.modeCompletions?.speech);
            const remaining = 3 - updatedStatus.perfectCount;
            setPerfectModalData({ remaining, isCompleted: updatedStatus.isCompleted });
            setIsPerfectModalOpen(true);
          }
        }
      }
      onAttemptResult?.(attempt);

      setTimeout(() => {
        if (liveRef.current) {
          liveRef.current.textContent = `Precisión ${attempt.accuracy} por ciento. Transcripción: ${editedTranscription.substring(0, 50)}${editedTranscription.length > 50 ? '...' : ''}`;
        }
      }, 50);

    } catch (err: unknown) {
      console.error('Grading error:', err);
      const error = err as Error;
      const message = error.message || 'No se pudo calificar la transcripción';
      setError(message);
      setStatus('error');
      pushToast({ 
        title: 'Error al calificar', 
        description: message,
        action: { label: 'Intentar de nuevo', onClick: resetAttempt }
      });
    }
  }, [verse, editedTranscription, gradeTranscription, audioDuration, onAttemptSaved, pushToast, resetAttempt, isTrackingProgress, onAttemptResult]);

  const handleEditTranscription = React.useCallback(() => {
    setStatus('editing');
  }, []);

  const handleSaveEdit = React.useCallback(() => {
    setStatus('transcribed');
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && status !== 'recording') {
        resetAttempt();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, resetAttempt]);

  const isProcessing = status === 'transcribing' || status === 'grading';
  const isRecording = status === 'recording';
  const isTranscribing = status === 'transcribing';
  const isTranscribed = status === 'transcribed';
    const handleInputLevel = React.useCallback((level: number) => {
      setInputLevel((prev) => prev + (level - prev) * 0.35);
    }, []);

    const handleCancelRecordingRequest = React.useCallback(() => {
      if (!isRecording) return;
      setIsCancelDialogOpen(true);
    }, [isRecording]);

    const confirmCancelRecording = React.useCallback(() => {
      if (!isRecording) {
        setIsCancelDialogOpen(false);
        return;
      }
      recorderRef.current?.stopRecording('cancel');
    }, [isRecording]);

    const haloScale = 1 + inputLevel * 0.85;
    const haloOpacity = 0.15 + inputLevel * 0.55;
    const ringScale = 1 + inputLevel * 1.2;

  const isGrading = status === 'grading';
  const isEditing = status === 'editing';
  const hasActiveAttempt = isRecording || isTranscribing || isTranscribed || isEditing || isGrading || status === 'silent';
  const showRecorder = status === 'idle' || status === 'recording';
  const showTranscriptionActions = status === 'transcribed' || status === 'editing';
  const shouldWarnBeforeLeave = status === 'recording' || status === 'transcribed' || status === 'editing' || status === 'silent';
  // peek button and helpers removed
  const handleMainRecorderClick = React.useCallback(async () => {
    const disabled = !verse || isProcessing || showTranscriptionActions;
    if (disabled) return;
    try {
      if (status !== 'recording') {
        await recorderRef.current?.startRecording();
      } else {
        recorderRef.current?.stopRecording('manual');
      }
    } catch (err) {
      console.error('Error controlling recorder:', err);
      pushToast({ title: 'Error', description: 'No se pudo iniciar la grabación.' });
    }
  }, [verse, isProcessing, showTranscriptionActions, status, pushToast]);
  
  React.useEffect(() => {
    if (!shouldWarnBeforeLeave) {
      onBlockNavigationChange?.(false);
      return;
    }
    onBlockNavigationChange?.(true);
    const message = 'Tienes una grabación en curso. ¿Seguro que quieres salir sin terminar?';
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (anchor.href && !anchor.href.startsWith(window.location.origin)) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      } else {
        replaceAudioPreviewUrl();
      }
    };
    const handlePopState = () => {
      if (!window.confirm(message)) {
        window.history.pushState(null, '', window.location.href);
      } else {
        replaceAudioPreviewUrl();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleAnchorClick, true);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleAnchorClick, true);
      window.removeEventListener('popstate', handlePopState);
      onBlockNavigationChange?.(false);
    };
  }, [shouldWarnBeforeLeave, replaceAudioPreviewUrl, onBlockNavigationChange]);
  
  // Calculate dynamic recording limit based on verse length
  const recordingInfo = React.useMemo(() => {
    return verse ? getRecordingLimitInfo(verse.text) : { seconds: 30, formatted: '30s', estimatedSpeakingTime: 0, wordCount: 0 };
  }, [verse]);

  React.useEffect(() => {
    recordingLimitRef.current = recordingInfo.seconds || 30;
  }, [recordingInfo.seconds]);

  React.useEffect(() => {
    setRemainingRunwayRatio(1);
    replaceAudioPreviewUrl();
  }, [replaceAudioPreviewUrl, verse?.id]);

  React.useEffect(() => () => {
    replaceAudioPreviewUrl();
  }, [replaceAudioPreviewUrl]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Volume2 size={18} />
              Modo Voz
            </CardTitle>
            <CardDescription>
              {verse ? verse.reference : 'Selecciona un versículo para comenzar'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {isRecording && (
              <div className="flex items-center gap-2" aria-live="polite">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" aria-hidden />
                <span className="text-sm font-medium text-red-600">Grabando…</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1 overflow-auto">
        <div className="space-y-4">
          {showRecorder ? (
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Graba tu intento
              </label>
              <div className="flex justify-center my-4">
                <div className="relative flex items-center justify-center">
                  {isRecording && (
                    <>
                      <span
                        className="pointer-events-none absolute inset-0 -m-8 rounded-full bg-red-500/30 blur-2xl transition-all duration-150 ease-out"
                        style={{ transform: `scale(${haloScale})`, opacity: haloOpacity }}
                        aria-hidden
                      />
                      <span
                        className="pointer-events-none absolute inset-0 -m-4 rounded-full border border-red-500/40 transition-all duration-100 ease-out"
                        style={{ transform: `scale(${ringScale})`, opacity: Math.min(0.9, haloOpacity + 0.2) }}
                        aria-hidden
                      />
                    </>
                  )}
                  <Button
                    onClick={handleMainRecorderClick}
                    disabled={!verse || isProcessing || showTranscriptionActions}
                    aria-pressed={isRecording}
                    aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
                    className={cn(
                      'relative w-28 h-28 rounded-full text-white flex items-center justify-center text-lg shadow-lg transition-shadow duration-150',
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700 shadow-red-500/40'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    )}
                  >
                    {isRecording ? (
                      <Square className="h-6 w-6" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-center">
                        <Mic className="h-6 w-6" aria-hidden />
                        <span className="text-[11px] font-semibold uppercase tracking-wide">Grabar</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>

              {isRecording && (
                <div className="flex justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelRecordingRequest}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Cancelar grabación
                  </Button>
                </div>
              )}

              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
                onRecordingProgress={handleRecordingProgress}
                onInputLevel={handleInputLevel}
                ref={recorderRef}
                showControls={false}
                showProgressBar={remainingRunwayRatio <= 0.1}
                maxDuration={recordingInfo.seconds}
                disabled={!verse || isProcessing || showTranscriptionActions}
              />
              
              {verse && remainingRunwayRatio <= 0.1 && (
                <div className="text-xs text-neutral-500 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Límite de grabación: {recordingInfo.formatted}</span>
                    <span>~{Math.max(Math.round(recordingInfo.seconds * remainingRunwayRatio), 0)}s restantes</span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Te queda menos del 10% del tiempo. Termina tu intento pronto.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <Loader2 className="animate-spin" size={16} />
              {status === 'transcribing' ? 'Convirtiendo voz a texto...' : 'Calificando tu intento...'}
            </div>
          )}

          {(transcription || audioPreviewUrl) && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {transcription ? 'Lo que escuchamos' : 'Revisa tu grabación'}
              </p>
              {audioPreviewUrl && (
                <audio className="w-full" controls src={audioPreviewUrl} />
              )}

              {transcription ? (
                status === 'editing' ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedTranscription}
                      onChange={(e) => setEditedTranscription(e.target.value)}
                      onPaste={(e) => e.preventDefault()}
                      className="w-full p-3 text-sm font-mono rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Edita la transcripción..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        Guardar cambios
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditedTranscription(transcription);
                          setStatus('transcribed');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                      <p className="text-sm font-mono">{editedTranscription}</p>
                    </div>

                    {status === 'transcribed' && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={handleSubmitTranscription}
                          disabled={!editedTranscription.trim()}
                          className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <SendHorizontal className="h-4 w-4" />
                          Calificar
                        </Button>
                        <Button variant="outline" onClick={handleEditTranscription} className="flex items-center gap-2">
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button onClick={resetAttempt} className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          Grabar nuevamente
                        </Button>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={resetAttempt} className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Grabar nuevamente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />
        
        <div aria-live="polite" ref={liveRef} className="sr-only" />
        
        <div className="space-y-4">
          {isProcessing && !result && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-200 dark:border-red-800 p-2 rounded">
              {error}
            </div>
          )}

          {result && status === 'result' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-semibold">{result.accuracy}%</span>
                <div className="flex-1 relative">
                  <Progress value={result.accuracy} className="bg-neutral-200 dark:bg-neutral-800" />
                  <div 
                    className={classNames(
                      'absolute inset-0 rounded-full mix-blend-multiply pointer-events-none',
                      result.accuracy >= 85 && 'bg-green-500/30',
                      result.accuracy >= 60 && result.accuracy < 85 && 'bg-blue-500/30',
                      result.accuracy < 60 && 'bg-amber-500/30'
                    )}
                    aria-hidden
                  />
                </div>
              </div>

              {audioDuration > 0 && (
                <p className="text-xs text-neutral-500">
                  Duración de la grabación: {audioDuration}s
                </p>
              )}

              {result.diff && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-500">
                    Comparación
                  </p>
                  <div className="p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 max-h-48 overflow-auto leading-relaxed text-sm">
                    <DiffRenderer diff={result.diff} />
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    La puntuación aparece en amarillo (no afecta la puntuación).
                  </p>
                </div>
              )}

              {/* Mode completion progress */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-600 dark:text-neutral-400">Intentos perfectos:</span>
                <span className="font-semibold">{modeStatus.perfectCount}/3</span>
                {modeStatus.isCompleted && (
                  <Badge variant="default" className="ml-1 bg-green-600 hover:bg-green-700 flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Modo completado
                  </Badge>
                )}
              </div>

              {result.feedback && (
                <div className="text-sm text-neutral-600 dark:text-neutral-400 border-l-2 border-neutral-300 dark:border-neutral-700 pl-3">
                  {result.feedback}
                </div>
              )}

              <ModeActionButtons
                isCompleted={modeStatus.isCompleted}
                onRetry={resetAttempt}
                onChangeMode={onBrowseVerses}
                retryLabel="Intentar de nuevo"
                className="w-full flex-col sm:flex-row"
              />
            </div>
          )}
        </div>

        {attempts.length > 0 && !hasActiveAttempt && isTrackingProgress && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Historial</h4>
              <History 
                attempts={attempts} 
                onClear={() => {
                  if (!verse) return;
                  setIsClearHistoryOpen(true);
                }} 
              />
            </div>
          </>
        )}
        {showMicTester && <MicrophoneTester ref={micTesterRef} className="mb-2" />}
      </CardContent>
      {isTrackingProgress && (
        <Dialog open={isClearHistoryOpen} onOpenChange={(open)=>{
          if(!open) setIsClearHistoryOpen(false);
        }}>
          <DialogContent className="max-w-sm !w-[calc(100%-2rem)] rounded-xl" onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
            <DialogHeader>
              <DialogTitle>¿Borrar historial de este pasaje?</DialogTitle>
              <DialogDescription>
                Esto eliminará únicamente el registro de intentos de este pasaje. No afectará a otros versículos.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <div className="flex w-full flex-col gap-3">
                <Button
                  className="w-full"
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
                <Button variant="outline" onClick={()=>setIsClearHistoryOpen(false)} className="w-full">Cancelar</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* PeekModal removed from Speech mode */}

      <PerfectScoreModal
        isOpen={isPerfectModalOpen}
        onOpenChange={(open) => setIsPerfectModalOpen(open)}
        data={perfectModalData}
        modeLabel="Modo Voz"
        perfectCount={modeStatus.perfectCount}
      />

      <Dialog open={isCancelDialogOpen} onOpenChange={(open) => {
        if (!open) setIsCancelDialogOpen(false);
      }}>
        <DialogContent className="max-w-sm !w-[calc(100%-2rem)] rounded-xl" onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>¿Cancelar esta grabación?</DialogTitle>
            <DialogDescription>
              Se perderá todo lo que llevas grabado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex flex-col gap-3 w-full">
              <Button
                className="w-full"
                variant="destructive"
                onClick={confirmCancelRecording}
              >
                Sí, cancelar grabación
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setIsCancelDialogOpen(false)}>
                Continuar grabando
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
