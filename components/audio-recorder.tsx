"use client";
import React, { useState, useRef, useCallback } from 'react';
import { Play, Pause, Square, CircleDot } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: (duration: number, reason: 'manual' | 'timeout' | 'cancel') => void;
  onRecordingProgress?: (elapsedSeconds: number) => void;
  showProgressBar?: boolean;
  maxDuration?: number; // in seconds, default 30
  disabled?: boolean;
}

export function AudioRecorder({ 
  onRecordingComplete, 
  onRecordingStart,
  onRecordingStop,
  onRecordingProgress,
  showProgressBar = true,
  maxDuration = 30,
  disabled = false
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingDurationRef = useRef(0);
  const hasInformedTimeoutRef = useRef(false);
  const cancelRef = useRef(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const stopRecording = useCallback((reason: 'manual' | 'timeout' | 'cancel' = 'manual') => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      if (reason === 'cancel') {
        cancelRef.current = true;
        recordingDurationRef.current = 0;
        setRecordingDuration(0);
        onRecordingProgress?.(0);
      } else {
        const cappedDuration = Math.min(recordingDurationRef.current, maxDuration);
        recordingDurationRef.current = cappedDuration;
        setRecordingDuration(cappedDuration);
        onRecordingProgress?.(cappedDuration);
      }

      recorder.stop();
      setIsRecording(false);
      const reportedDuration = reason === 'cancel' ? 0 : Math.min(recordingDurationRef.current, maxDuration);
      onRecordingStop?.(reportedDuration, reason);

      // Clear intervals and timeouts
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      hasInformedTimeoutRef.current = reason === 'timeout';
    }
  }, [maxDuration, onRecordingProgress, onRecordingStop]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      // Check for supported MIME types (prioritize formats that work well with OpenAI)
      const mimeTypes = [
        'audio/wav',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mpeg'
      ];
      
      let selectedMimeType = 'audio/wav'; // Default fallback
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      console.log('Using MediaRecorder with MIME type:', selectedMimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      cancelRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const wasCancelled = cancelRef.current;
        cancelRef.current = false;

        if (!wasCancelled) {
          const audioBlob = new Blob(chunksRef.current, {
            type: selectedMimeType
          });
          console.log('Created audio blob:', {
            type: audioBlob.type,
            size: audioBlob.size,
            mimeType: selectedMimeType
          });
          if (playbackUrl) {
            URL.revokeObjectURL(playbackUrl);
          }
          const newUrl = URL.createObjectURL(audioBlob);
          setRecordedAudio(audioBlob);
          setPlaybackUrl(newUrl);
          onRecordingComplete(audioBlob);
        }

        chunksRef.current = [];
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
      hasInformedTimeoutRef.current = false;
      onRecordingStart?.();
      onRecordingProgress?.(0);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        recordingDurationRef.current = recordingDurationRef.current + 1;
        const next = recordingDurationRef.current;
        const clamped = Math.min(next, maxDuration);
        setRecordingDuration(clamped);
        onRecordingProgress?.(clamped);
        if (next >= maxDuration) {
          stopRecording('timeout');
        }
      }, 1000);

    } catch (err) {
      console.error('No se pudo iniciar la grabación:', err);
      setError('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  }, [onRecordingComplete, onRecordingStart, onRecordingProgress, maxDuration, playbackUrl, stopRecording]);

  const playRecording = useCallback(async () => {
    if (!recordedAudio) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = playbackUrl ?? URL.createObjectURL(recordedAudio);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => {
      setIsPlaying(false);
      if (!playbackUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };

    try {
      await audio.play();
    } catch (err) {
      console.error('No se pudo reproducir el audio:', err);
      setError('No se pudo reproducir el audio');
    }
  }, [recordedAudio, playbackUrl]);

  const stopPlaying = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const clearRecording = useCallback(() => {
    setRecordedAudio(null);
    setRecordingDuration(0);
    recordingDurationRef.current = 0;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onRecordingProgress?.(0);
    hasInformedTimeoutRef.current = false;
    if (playbackUrl) {
      URL.revokeObjectURL(playbackUrl);
      setPlaybackUrl(null);
    }
  }, [onRecordingProgress, playbackUrl]);

  const cancelRecording = useCallback(() => {
    stopRecording('cancel');
    clearRecording();
  }, [clearRecording, stopRecording]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl);
      }
    };
  }, [playbackUrl]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        {!isRecording && !recordedAudio && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-neutral-900 disabled:bg-gray-400 rounded-lg transition-colors"
          >
            <CircleDot className="w-4 h-4" />
            Grabar
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => stopRecording('manual')}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-neutral-900 rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
              Detener
            </button>
            <button
              onClick={cancelRecording}
              className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {recordedAudio && !isRecording && (
          <>
            <button
              onClick={isPlaying ? stopPlaying : playRecording}
              className="flex items-center gap-2 px-3 py-2 bg-black text-white hover:bg-neutral-900 rounded-lg transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pausar' : 'Reproducir'}
            </button>

            <button
              onClick={clearRecording}
              className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Borrar
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Grabando... {formatDuration(recordingDuration)}</span>
          </div>
        )}
        
        {recordedAudio && !isRecording && (
          <span>Grabado: {formatDuration(recordingDuration)}</span>
        )}
      </div>

      {/* Visual feedback during recording */}
      {showProgressBar && isRecording && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div 
            className="bg-red-500 h-1 rounded-full transition-all duration-1000"
            style={{ width: `${(recordingDuration / maxDuration) * 100}%` }}
          />
        </div>
      )}
      {!isRecording && hasInformedTimeoutRef.current && (
        <div className="text-xs text-yellow-700 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900/30 px-3 py-2 rounded">
          Se alcanzó el tiempo máximo de grabación.
        </div>
      )}
    </div>
  );
}
