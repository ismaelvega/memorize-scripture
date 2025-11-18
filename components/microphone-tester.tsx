"use client";
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, Mic, Activity, Loader2, VolumeX } from 'lucide-react';

const SILENCE_THRESHOLD = 0.015;
const SILENCE_FRAMES_FOR_WARNING = 180; // ~3s at 60fps

type TesterStatus = 'idle' | 'starting' | 'listening' | 'noInput' | 'error';

const statusCopy: Record<TesterStatus, string> = {
  idle: 'Haz una prueba rápida para verificar el micrófono.',
  starting: 'Solicitando acceso al micrófono…',
  listening: 'Se oye algo 👀. Tu micrófono está funcionando!.',
  noInput: 'No detectamos sonido. Intenta hablar un poco más alto o revisa que tu dispositivo no tenga algún bloqueo o restricción de tu micrófono.',
  error: 'No pudimos acceder al micrófono. Revisa permisos del navegador.',
};

interface MicrophoneTesterProps {
  className?: string;
}
export interface MicrophoneTesterHandle {
  stop: () => void;
}

export const MicrophoneTester = React.forwardRef<MicrophoneTesterHandle, MicrophoneTesterProps>(
({ className }, ref) => {
  const [status, setStatus] = React.useState<TesterStatus>('idle');
  const [volume, setVolume] = React.useState(0);
  const [permission, setPermission] = React.useState<'unknown' | 'granted' | 'denied'>('unknown');
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const dataArrayRef = React.useRef<Float32Array | null>(null);
  const silentFramesRef = React.useRef(0);

  const teardown = React.useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    silentFramesRef.current = 0;
    dataArrayRef.current = null;
    setVolume(0);
  }, []);

  const analyze = React.useCallback(() => {
    if (!analyserRef.current) return;
    if (!dataArrayRef.current) {
      dataArrayRef.current = new Float32Array(analyserRef.current.fftSize);
    }

    analyserRef.current.getFloatTimeDomainData(dataArrayRef.current as Float32Array<ArrayBuffer>);
    const buffer = dataArrayRef.current;
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const sample = buffer[i];
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    const normalized = Math.min(1, rms / 0.25);
    setVolume(normalized);

    if (rms > SILENCE_THRESHOLD) {
      silentFramesRef.current = 0;
      setStatus('listening');
    } else {
      silentFramesRef.current += 1;
      if (silentFramesRef.current > SILENCE_FRAMES_FOR_WARNING) {
        setStatus('noInput');
      }
    }

    rafRef.current = requestAnimationFrame(analyze);
  }, []);

  const startTest = React.useCallback(async () => {
    if (status === 'starting') return;
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setPermission('denied');
      return;
    }

    setStatus('starting');
    setVolume(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
        },
      });
      setPermission('granted');
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;
      source.connect(analyser);

      silentFramesRef.current = 0;
      analyze();
      setStatus('listening');
    } catch (error) {
      console.error('Mic test failed:', error);
      setStatus('error');
      setPermission('denied');
      teardown();
    }
  }, [status, analyze, teardown]);

  const stopTest = React.useCallback(() => {
    teardown();
    setStatus('idle');
  }, [teardown]);

  React.useEffect(() => () => stopTest(), [stopTest]);

  React.useImperativeHandle(ref, () => ({ stop: stopTest }), [stopTest]);

  const statusIcon = React.useMemo(() => {
    switch (status) {
      case 'starting':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'listening':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'noInput':
        return <VolumeX className="h-4 w-4 text-amber-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Mic className="h-4 w-4 text-neutral-500" />;
    }
  }, [status]);

  const isActiveSession = status === 'starting' || status === 'listening' || status === 'noInput';
  const buttonLabel = isActiveSession ? 'Detener prueba' : 'Probar micrófono';
  const buttonVariant: 'outline' | 'secondary' = isActiveSession ? 'secondary' : 'outline';
  const primaryButtonAction = isActiveSession ? stopTest : startTest;

  const permissionLabel = permission === 'granted'
    ? 'Permiso concedido'
    : permission === 'denied'
      ? 'Permiso denegado'
      : 'Permiso sin comprobar';

  return (
    <div className={cn('rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 p-3 space-y-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Prueba del micrófono</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">Verifica la señal y los permisos del micrófono.</p>
        </div>
        <Button size="sm" variant={buttonVariant} onClick={primaryButtonAction}>
          {isActiveSession ? <SquareIcon /> : <Activity className="mr-2 h-3.5 w-3.5" />}
          {buttonLabel}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
        {statusIcon}
        <span className="flex-1">{statusCopy[status]}</span>
        {status === 'error' && (
          <Button
            size="sm"
            variant="outline"
            onClick={startTest}
            className="whitespace-nowrap h-7 px-2 text-xs"
          >
            Reintentar permiso
          </Button>
        )}
      </div>

      <div className="text-xs text-neutral-500 flex items-center gap-2">
        <span className={cn('inline-flex h-2 w-2 rounded-full',
          permission === 'granted' && 'bg-emerald-500',
          permission === 'denied' && 'bg-red-500',
          permission === 'unknown' && 'bg-neutral-400'
        )} aria-hidden />
        {permissionLabel}
      </div>

      {status !== 'idle' && (
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-200',
                status === 'noInput' ? 'bg-amber-500' : 'bg-emerald-500'
              )}
              style={{ width: `${Math.round(volume * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-neutral-500">
            Nivel actual: {Math.round(volume * 100)}%
          </p>
        </div>
      )}
    </div>
  );
});

MicrophoneTester.displayName = 'MicrophoneTester';

const SquareIcon = () => <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="5" y="5" width="14" height="14" rx="2" /></svg>;
