/// <reference types="vite/client" />

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: (event: Event) => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
  
  interface Document {
    startViewTransition?: (callback: () => void) => { ready: Promise<void> };
  }
}

// Add support for View Transitions API
interface ViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

interface Document {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition;
}