export type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<{
          0: {
            transcript: string;
          };
          isFinal?: boolean;
        }>;
      }) => void)
    | null;
  onerror:
    | ((event: {
        error?: string;
        message?: string;
      }) => void)
    | null;
  onend: (() => void) | null;
};

export type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

export type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
};

export function getSpeechRecognitionConstructor():
  | SpeechRecognitionConstructor
  | null {
  if (typeof window === "undefined") return null;

  const speechWindow = window as SpeechRecognitionWindow;

  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function createSpeechRecognition(options: {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
} = {}): BrowserSpeechRecognition | null {
  const Recognition = getSpeechRecognitionConstructor();

  if (!Recognition) return null;

  const recognition = new Recognition();

  recognition.lang = options.lang ?? "en-IN";
  recognition.continuous = options.continuous ?? false;
  recognition.interimResults = options.interimResults ?? false;
  recognition.maxAlternatives = 1;

  return recognition;
}

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function speakText(text: string, options: SpeakOptions = {}): boolean {
  if (!text.trim() || !isSpeechSynthesisSupported()) return false;

  window.speechSynthesis.cancel();

  const Utterance = window.SpeechSynthesisUtterance;
  const utterance = new Utterance(text);
  utterance.lang = options.lang ?? "en-IN";
  utterance.rate = options.rate ?? 0.92;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;

  window.speechSynthesis.speak(utterance);

  return true;
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;

  window.speechSynthesis.cancel();
}

export function getSpeechLanguage(language?: string): string {
  switch (language) {
    case "hindi":
      return "hi-IN";
    case "bengali":
      return "bn-IN";
    case "hinglish":
      return "hi-IN";
    case "english":
    default:
      return "en-IN";
  }
}
