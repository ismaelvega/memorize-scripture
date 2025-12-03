"use client";

import * as React from 'react';

const TTS_MUTE_KEY = 'bm_tts_muted';
const TTS_LANG = 'es-ES';
const TTS_RATE = 1.0;
const TTS_PITCH = 1.0;

interface UseTTSOptions {
  /** If true, TTS will be enabled by default (when not muted) */
  enabled?: boolean;
  /** If provided, use this as the initial muted state when there's no stored preference */
  initialMuted?: boolean;
}

interface SpeakCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}

interface UseTTSReturn {
  /** Speak the given text. No-op if muted or TTS unavailable. */
  speak: (text: string, callbacks?: SpeakCallbacks) => void;
  /** Cancel any ongoing speech */
  cancel: () => void;
  /** Whether TTS is currently muted */
  isMuted: boolean;
  /** Toggle mute state */
  toggleMute: () => void;
  /** Whether TTS is supported in this browser */
  isSupported: boolean;
  /** Whether a voice is currently loaded and ready */
  isReady: boolean;
}

/**
 * Hook to use Web Speech API SpeechSynthesis for text-to-speech.
 * Persists mute preference in localStorage.
 * Pre-loads Spanish voice for faster playback.
 */
export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { enabled = true, initialMuted } = options;

  const [isMuted, setIsMuted] = React.useState(true); // Default muted until we load preference
  const [isSupported, setIsSupported] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const voiceRef = React.useRef<SpeechSynthesisVoice | null>(null);
  const synthRef = React.useRef<SpeechSynthesis | null>(null);

  // Initialize on mount
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    synthRef.current = window.speechSynthesis;

    // Load mute preference from localStorage. If none exists, respect
    // `options.initialMuted` when provided; otherwise default to unmuted.
    try {
      const stored = localStorage.getItem(TTS_MUTE_KEY);
      if (stored !== null) {
        setIsMuted(stored === 'true');
      } else if (typeof initialMuted === 'boolean') {
        setIsMuted(initialMuted);
      } else {
        setIsMuted(false);
      }
    } catch {
      // If localStorage access fails, fall back to `initialMuted` or false
      setIsMuted(typeof initialMuted === 'boolean' ? initialMuted : false);
    }

    // Pre-load voices
    const loadVoices = () => {
      const voices = synthRef.current?.getVoices() ?? [];
      // Prefer a Spanish voice, fallback to first available
      const spanishVoice = voices.find(
        (v) => v.lang.startsWith('es') && v.localService
      ) ?? voices.find((v) => v.lang.startsWith('es')) ?? voices[0];
      
      if (spanishVoice) {
        voiceRef.current = spanishVoice;
        setIsReady(true);
      }
    };

    // Voices may not be loaded immediately
    loadVoices();
    if (synthRef.current) {
      synthRef.current.addEventListener('voiceschanged', loadVoices);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.removeEventListener('voiceschanged', loadVoices);
        synthRef.current.cancel();
      }
    };
  }, [initialMuted]);

  const speak = React.useCallback(
    (text: string, callbacks?: SpeakCallbacks) => {
      if (!enabled || isMuted || !isSupported || !synthRef.current) return;
      if (!text.trim()) return;

      // Cancel any ongoing speech first
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = TTS_LANG;
      utterance.rate = TTS_RATE;
      utterance.pitch = TTS_PITCH;

      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }

      if (callbacks?.onStart) {
        utterance.addEventListener('start', callbacks.onStart);
      }

      if (callbacks?.onEnd) {
        utterance.addEventListener('end', callbacks.onEnd);
      }

      if (callbacks?.onBoundary) {
        utterance.addEventListener('boundary', callbacks.onBoundary);
      }

      synthRef.current.speak(utterance);
    },
    [enabled, isMuted, isSupported]
  );

  const cancel = React.useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, []);

  const toggleMute = React.useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TTS_MUTE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      // Cancel ongoing speech when muting
      if (next && synthRef.current) {
        synthRef.current.cancel();
      }
      return next;
    });
  }, []);

  return {
    speak,
    cancel,
    isMuted,
    toggleMute,
    isSupported,
    isReady,
  };
}
