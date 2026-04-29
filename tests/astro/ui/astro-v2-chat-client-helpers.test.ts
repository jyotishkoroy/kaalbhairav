import { describe, expect, it } from "vitest";
import {
  buildAstroV2ChatRequest,
  emptyBirthDetails,
  extractAstroV2ChatResponse,
  getTextFromAstroV2StreamEvent,
  normalizeAstroV2Question,
  parseAstroV2SseEventLine,
  parseAstroV2SseText,
  shouldSubmitAstroV2Question,
} from "@/lib/astro/reading/v2-chat-client";

describe("Astro V2 chat client helpers", () => {
  it("normalizes question text", () => {
    expect(normalizeAstroV2Question("  when will career improve?  ")).toBe(
      "when will career improve?",
    );
  });

  it("does not submit empty questions", () => {
    expect(shouldSubmitAstroV2Question("")).toBe(false);
    expect(shouldSubmitAstroV2Question("   ")).toBe(false);
    expect(shouldSubmitAstroV2Question("career?")).toBe(true);
  });

  it("builds a chat request with message and question", () => {
    const request = buildAstroV2ChatRequest({
      question: "When will my career improve?",
      mode: "practical_guidance",
      birthDetails: emptyBirthDetails,
    });

    expect(request.message).toBe("When will my career improve?");
    expect(request.question).toBe("When will my career improve?");
    expect(request.mode).toBe("practical_guidance");
    expect(request.metadata).toMatchObject({
      source: "astro-v2-page",
      requestedMode: "practical_guidance",
    });
  });

  it("keeps only provided birth details and parses coordinates", () => {
    const request = buildAstroV2ChatRequest({
      question: "When will I get married?",
      mode: "timing_prediction",
      birthDetails: {
        dateOfBirth: "1995-01-01",
        timeOfBirth: "10:30",
        placeOfBirth: "Kolkata, India",
        latitude: "22.5726",
        longitude: "88.3639",
        timezone: "Asia/Kolkata",
      },
    });

    expect(request.birthDetails).toMatchObject({
      dateOfBirth: "1995-01-01",
      timeOfBirth: "10:30",
      placeOfBirth: "Kolkata, India",
      latitude: 22.5726,
      longitude: 88.3639,
      timezone: "Asia/Kolkata",
    });
  });

  it("extracts answer and meta from normal payload", () => {
    const parsed = extractAstroV2ChatResponse({
      answer: "Reading answer",
      meta: {
        version: "v2",
      },
    });

    expect(parsed.answer).toBe("Reading answer");
    expect(parsed.meta.version).toBe("v2");
  });

  it("extracts fallback content fields", () => {
    expect(
      extractAstroV2ChatResponse({
        content: "Content answer",
      }).answer,
    ).toBe("Content answer");

    expect(
      extractAstroV2ChatResponse({
        message: "Message answer",
      }).answer,
    ).toBe("Message answer");
  });

  it("handles non-object payload safely", () => {
    const parsed = extractAstroV2ChatResponse(null);

    expect(parsed.answer).toBe("");
    expect(parsed.meta).toEqual({});
  });

  it("parses clarifying question SSE as answer text", () => {
    const text = [
      'data: {"type":"meta","remaining":7,"session_id":"session-1"}',
      'data: {"type":"clarifying_question","question":"Could you tell me more — is this about a meeting, a job search, a promotion, or something else at work?"}',
      'data: {"type":"done","session_id":"session-1"}',
      "",
    ].join("\n");

    const parsed = parseAstroV2SseText(text);

    expect(parsed.answer).toBe(
      "Could you tell me more — is this about a meeting, a job search, a promotion, or something else at work?",
    );
    expect(parsed.meta.remaining).toBe(7);
    expect(parsed.meta.session_id).toBe("session-1");
    expect(parsed.done).toBe(true);
  });

  it("extracts SSE response through display parser", () => {
    const parsed = extractAstroV2ChatResponse(
      'data: {"type":"clarifying_question","question":"Please clarify."}\n' +
        'data: {"type":"done"}\n',
    );

    expect(parsed.answer).toBe("Please clarify.");
    expect(parsed.meta).toEqual({});
  });

  it("parses streamed token events into answer", () => {
    const text = [
      'data: {"type":"token","token":"Hello"}',
      'data: {"type":"token","token":" world"}',
      'data: {"type":"done"}',
      "",
    ].join("\n");

    expect(parseAstroV2SseText(text).answer).toBe("Hello world");
  });

  it("captures SSE error events", () => {
    const parsed = parseAstroV2SseText(
      'data: {"type":"error","message":"Rate limit reached"}\n',
    );

    expect(parsed.error).toBe("Rate limit reached");
  });

  it("ignores non-data SSE lines", () => {
    expect(parseAstroV2SseEventLine("event: message")).toBeNull();
  });

  it("gets text from known stream event fields", () => {
    expect(
      getTextFromAstroV2StreamEvent({
        type: "content",
        content: "Readable content",
      }),
    ).toBe("Readable content");
  });
});
