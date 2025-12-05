"use client";

import * as React from 'react';

const SPEECH_LANG = 'es-ES';

// Web Speech API types (not fully defined in lib.dom.d.ts for all browsers)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventInit extends EventInit {
  resultIndex?: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

// Extend Window interface for webkit prefixed API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export interface UseSpeechRecognitionOptions {
  /** Language for recognition (default: es-ES) */
  language?: string;
  /** Continuous recognition mode */
  continuous?: boolean;
  /** Return interim results */
  interimResults?: boolean;
}

export interface UseSpeechRecognitionReturn {
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Current transcript (final results) */
  transcript: string;
  /** Interim transcript (not final) */
  interimTranscript: string;
  /** Whether currently listening */
  isListening: boolean;
  /** Whether speech recognition is supported */
  isSupported: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Reset transcript */
  resetTranscript: () => void;
}

/**
 * Hook for using Web Speech API SpeechRecognition.
 * Uses webkitSpeechRecognition for Chrome/Edge/Safari support.
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    language = SPEECH_LANG,
    continuous = true,
    interimResults = true,
  } = options;

  const [transcript, setTranscript] = React.useState('');
  const [interimTranscript, setInterimTranscript] = React.useState('');
  const [isListening, setIsListening] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);

  // Initialize on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false);
      return;
    }

    // Check for support (webkit prefix for Chrome/Edge, standard for Firefox)
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interim += text;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => (prev + ' ' + finalTranscript).trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      // If still supposed to be listening (continuous mode), restart
      if (recognitionRef.current && isListening && continuous) {
        try {
          recognition.start();
        } catch {
          // Ignore errors on restart
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    };
  }, [language, continuous, interimResults]);

  // Handle isListening changes for auto-restart logic
  const isListeningRef = React.useRef(isListening);
  React.useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startListening = React.useCallback(() => {
    if (!recognitionRef.current) return;

    setError(null);
    setInterimTranscript('');

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setError('No se pudo iniciar el reconocimiento de voz.');
    }
  }, []);

  const stopListening = React.useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch {
      // Ignore
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = React.useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    resetTranscript,
  };
}
