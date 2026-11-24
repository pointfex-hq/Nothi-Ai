'use client';

import { useState, useEffect, useRef } from 'react';

interface VoiceInputButtonProps {
  lang: 'en' | 'bn';
  onTranscript: (text: string) => void;
  className?: string;
}

interface SpeechResult {
  transcript: string;
}

interface SpeechResultList {
  [index: number]: { [index: number]: SpeechResult };
}

interface SpeechEvent {
  resultIndex: number;
  results: SpeechResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function VoiceInputButton({ lang, onTranscript, className = '' }: VoiceInputButtonProps) {
  const [isSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  });

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && isSupported) {
      const w = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      const SpeechConstructor = w.SpeechRecognition || w.webkitSpeechRecognition;

      if (SpeechConstructor) {
        const recognition = new SpeechConstructor();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = lang === 'bn' ? 'bn-BD' : 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechEvent) => {
          const current = event.resultIndex;
          const transcript = event.results[current]?.[0]?.transcript;
          if (transcript) {
            onTranscript(transcript);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [lang, onTranscript, isSupported]);

  if (!isSupported) {
    return null;
  }

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition error:', err);
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        className={`p-2 rounded-full transition-all cursor-pointer ${
          isListening
            ? 'bg-vermillion text-paper shadow-md'
            : 'text-ink-muted hover:text-green-deep hover:bg-paper-dark'
        } ${className}`}
        title={isListening ? 'Stop listening' : 'Voice dictation'}
        aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
        </svg>
      </button>

      {/* Live Waveform Indicator when Listening */}
      {isListening && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-full bg-ink text-paper text-xs font-sans flex items-center gap-2 shadow-lg z-20 pointer-events-none whitespace-nowrap animate-in fade-in">
          <div className="flex items-center gap-0.5">
            <span className="w-1 h-3 bg-brass rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-5 bg-brass rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-2 bg-brass rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>{lang === 'bn' ? 'শুনছি...' : 'Listening...'}</span>
        </div>
      )}
    </div>
  );
}
