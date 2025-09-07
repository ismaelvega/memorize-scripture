"use client";
import React, { useState, useRef, useCallback } from 'react';
import { Play, Pause, Square, CircleDot } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  maxDuration?: number; // in seconds, default 30
  disabled?: boolean;
}

export function AudioRecorder({ 
  onRecordingComplete, 
  onRecordingStart,
  onRecordingStop,
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
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingStop?.();

      // Clear intervals and timeouts
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }
    }
  }, [isRecording, onRecordingStop]);

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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { 
          type: selectedMimeType 
        });
        console.log('Created audio blob:', {
          type: audioBlob.type,
          size: audioBlob.size,
          mimeType: selectedMimeType
        });
        setRecordedAudio(audioBlob);
        onRecordingComplete(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      onRecordingStart?.();

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Auto-stop after max duration
      maxDurationTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, maxDuration * 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  }, [onRecordingComplete, onRecordingStart, maxDuration, stopRecording]);

  const playRecording = useCallback(async () => {
    if (!recordedAudio) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = URL.createObjectURL(recordedAudio);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };

    try {
      await audio.play();
    } catch (err) {
      console.error('Failed to play audio:', err);
      setError('Failed to play audio');
    }
  }, [recordedAudio]);

  const stopPlaying = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const clearRecording = useCallback(() => {
    setRecordedAudio(null);
    setRecordingDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

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
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            <CircleDot className="w-4 h-4" />
            Record
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
        )}

        {recordedAudio && !isRecording && (
          <>
            <button
              onClick={isPlaying ? stopPlaying : playRecording}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={clearRecording}
              className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Clear
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Recording... {formatDuration(recordingDuration)}</span>
          </div>
        )}
        
        {recordedAudio && !isRecording && (
          <span>Recorded: {formatDuration(recordingDuration)}</span>
        )}
        
        <span className="text-xs">Max: {formatDuration(maxDuration)}</span>
      </div>

      {/* Visual feedback during recording */}
      {isRecording && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div 
            className="bg-red-500 h-1 rounded-full transition-all duration-1000"
            style={{ width: `${(recordingDuration / maxDuration) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
