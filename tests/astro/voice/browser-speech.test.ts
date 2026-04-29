import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSpeechRecognition,
  getSpeechLanguage,
  getSpeechRecognitionConstructor,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speakText,
  stopSpeaking,
} from "@/lib/voice/browser-speech";

const originalWindow = globalThis.window;

type SpeechRecognitionMockConstructor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: null;
  onerror: null;
  onend: null;
  start: () => void;
  stop: () => void;
};

function setWindow(value: unknown) {
  Object.defineProperty(globalThis, "window", {
    value,
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    value: originalWindow,
    writable: true,
    configurable: true,
  });
  vi.restoreAllMocks();
});

describe("browser speech helpers", () => {
  it("returns null speech recognition on server", () => {
    setWindow(undefined);

    expect(getSpeechRecognitionConstructor()).toBeNull();
    expect(isSpeechRecognitionSupported()).toBe(false);
    expect(createSpeechRecognition()).toBeNull();
  });

  it("creates speech recognition when browser supports it", () => {
    class MockRecognition {
      lang = "";
      continuous = true;
      interimResults = true;
      maxAlternatives = 0;
      onresult = null;
      onerror = null;
      onend = null;
      start = vi.fn();
      stop = vi.fn();
    }

    setWindow({
      SpeechRecognition: MockRecognition as SpeechRecognitionMockConstructor,
    });

    const recognition = createSpeechRecognition({
      lang: "hi-IN",
      continuous: false,
      interimResults: false,
    });

    expect(isSpeechRecognitionSupported()).toBe(true);
    expect(recognition?.lang).toBe("hi-IN");
    expect(recognition?.continuous).toBe(false);
    expect(recognition?.interimResults).toBe(false);
    expect(recognition?.maxAlternatives).toBe(1);
  });

  it("falls back to webkitSpeechRecognition", () => {
    class MockRecognition {
      lang = "";
      continuous = false;
      interimResults = false;
      onresult = null;
      onerror = null;
      onend = null;
      start = vi.fn();
      stop = vi.fn();
    }

    setWindow({
      webkitSpeechRecognition:
        MockRecognition as SpeechRecognitionMockConstructor,
    });

    expect(getSpeechRecognitionConstructor()).not.toBeNull();
  });

  it("detects speech synthesis support", () => {
    setWindow({
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
      },
      SpeechSynthesisUtterance: vi.fn(function SpeechSynthesisUtterance(this: {
        text: string;
      }, text: string) {
        this.text = text;
      }),
    });

    expect(isSpeechSynthesisSupported()).toBe(true);
  });

  it("speaks text when speech synthesis is supported", () => {
    const speak = vi.fn();
    const cancel = vi.fn();

    setWindow({
      speechSynthesis: {
        speak,
        cancel,
      },
      SpeechSynthesisUtterance: vi.fn(function SpeechSynthesisUtterance(this: {
        text: string;
      }, text: string) {
        this.text = text;
      }),
    });

    expect(speakText("Hello")).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("does not speak empty text", () => {
    setWindow({
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
      },
      SpeechSynthesisUtterance: vi.fn(),
    });

    expect(speakText("   ")).toBe(false);
  });

  it("stops speaking when supported", () => {
    const cancel = vi.fn();

    setWindow({
      speechSynthesis: {
        speak: vi.fn(),
        cancel,
      },
      SpeechSynthesisUtterance: vi.fn(),
    });

    stopSpeaking();

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("maps supported speech languages", () => {
    expect(getSpeechLanguage("english")).toBe("en-IN");
    expect(getSpeechLanguage("hinglish")).toBe("hi-IN");
    expect(getSpeechLanguage("hindi")).toBe("hi-IN");
    expect(getSpeechLanguage("bengali")).toBe("bn-IN");
    expect(getSpeechLanguage("unknown")).toBe("en-IN");
  });
});
