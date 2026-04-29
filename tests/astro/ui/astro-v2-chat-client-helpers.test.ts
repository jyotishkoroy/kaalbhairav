import { describe, expect, it } from "vitest";
import {
  buildAstroV2ChatRequest,
  emptyBirthDetails,
  extractAstroV2ChatResponse,
  normalizeAstroV2Question,
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
});
