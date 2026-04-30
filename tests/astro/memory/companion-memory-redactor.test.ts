/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import {
  classifySensitiveMemoryReasons,
  containsSensitiveMemoryContent,
  normalizeMemoryConfidence,
  normalizeMemoryTopic,
  normalizeMemoryType,
  redactCompanionMemoryText,
  sanitizeMemoryDraft,
} from "@/lib/astro/memory";

describe("companion memory redactor", () => {
  it("strips markdown", () => expect(redactCompanionMemoryText("**hello**")).toBe("hello"));
  it("strips email", () => expect(redactCompanionMemoryText("test@example.com")).not.toContain("@"));
  it("strips phone", () => expect(redactCompanionMemoryText("Call me at +1 555 555 1212")).not.toMatch(/555/));
  it("strips token-like string", () => expect(redactCompanionMemoryText("token sk-abcdef0123456789")).toContain("[redacted-token]"));
  it("strips local url", () => expect(redactCompanionMemoryText("http://127.0.0.1:3000")).toContain("[redacted-url]"));
  it("strips api url", () => expect(redactCompanionMemoryText("https://api.example.com/v1")).toContain("[redacted-url]"));
  it("clamps long text", () => expect(redactCompanionMemoryText("a".repeat(400)).length).toBeLessThanOrEqual(280));
  it("rejects empty after redaction", () => expect(sanitizeMemoryDraft({ memoryType: "preference", content: "   " })).toBeNull());
  it("detects death/lifespan fear", () => expect(containsSensitiveMemoryContent("when will I die")).toBe(true));
  it("detects self-harm detail", () => expect(classifySensitiveMemoryReasons("I want to kill myself")).toContain("self_harm"));
  it("detects medical diagnosis detail", () => expect(classifySensitiveMemoryReasons("cancer diagnosis")).toContain("medical"));
  it("detects legal dispute detail", () => expect(classifySensitiveMemoryReasons("court lawsuit")).toContain("legal"));
  it("detects third-party private detail", () => expect(classifySensitiveMemoryReasons("my wife and her job")).toContain("third_party_private"));
  it("detects raw birth data", () => expect(classifySensitiveMemoryReasons("born at 10:30 in Kolkata")).toContain("raw_birth_data"));
  it("detects secret", () => expect(classifySensitiveMemoryReasons("api key secret token")).toContain("secret_or_token"));
  it("detects sexual private content", () => expect(classifySensitiveMemoryReasons("sexual intimate detail")).toContain("sexual_private"));
  it("allows Vedic preference", () => expect(sanitizeMemoryDraft({ memoryType: "preference", topic: "spirituality", content: "User prefers Vedic astrology." })?.content).toContain("Vedic"));
  it("allows practical remedy preference", () => expect(sanitizeMemoryDraft({ memoryType: "preference", topic: "remedy", content: "User prefers practical remedies." })?.content).toContain("practical"));
  it("allows career recognition recurring concern", () => expect(sanitizeMemoryDraft({ memoryType: "recurring_concern", topic: "career", content: "Career recognition delay." })?.content).toContain("Career"));
  it("allows marriage delay recurring concern", () => expect(sanitizeMemoryDraft({ memoryType: "recurring_concern", topic: "marriage", content: "Marriage delay." })?.content).toContain("Marriage"));
  it("allows avoid fear-based remedies boundary", () => expect(sanitizeMemoryDraft({ memoryType: "boundary", topic: "remedy", content: "Avoid fear-based remedies." })?.content).toContain("Avoid"));
  it("normalizes topic relationship", () => expect(normalizeMemoryTopic("relationship status")).toBe("relationship"));
  it("normalizes unknown topic to unknown/general", () => expect(["unknown", "general"]).toContain(normalizeMemoryTopic("something odd")));
  it("normalizes memory type", () => expect(normalizeMemoryType("boundary")).toBe("boundary"));
  it("normalizes confidence", () => expect(normalizeMemoryConfidence("high")).toBe("high"));
});
