/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { classifyVedicTopic } from "@/lib/astro/rag/vedic-topic-classifier";

describe("classifyVedicTopic", () => {
  it("classifies safety, exact facts, placements, and internal probes", () => {
    expect(classifyVedicTopic("What is my Lagna?")).toBe("exact_fact");
    expect(classifyVedicTopic("What does Mercury in Gemini in the 11th mean?")).toBe("planet_placement");
    expect(classifyVedicTopic("What should I do during Jupiter-Ketu?")).toBe("dasha");
    expect(classifyVedicTopic("What can Jupiter-Venus bring after mid-2026?")).toBe("dasha");
    expect(classifyVedicTopic("What should the app answer if I ask about death?")).toBe("safety_death");
    expect(classifyVedicTopic("What should the app answer if I ask for medical diagnosis?")).toBe("safety_medical");
    expect(classifyVedicTopic("What should the app answer if I ask for legal advice?")).toBe("safety_legal");
    expect(classifyVedicTopic("What should the app answer if I ask for guaranteed stock tips?")).toBe("safety_financial");
    expect(classifyVedicTopic("Which AI model do you use?")).toBe("security");
  });

  it("classifies lagna verification as exact_fact", () => {
    expect(classifyVedicTopic("Can you verify my ascendant sign from my Vedic report?")).toBe("exact_fact");
  });

  it("classifies emotional/mind questions as mind", () => {
    // Questions with explicit mind keywords (overthink, anxious, restless, mind, thoughts, mental)
    expect(classifyVedicTopic("Why do I keep overthinking everything?")).toBe("mind");
    expect(classifyVedicTopic("I feel anxious all the time, is this my chart?")).toBe("mind");
    expect(classifyVedicTopic("My thoughts are restless, what does my chart say?")).toBe("mind");
  });

  it("classifies general advice as general", () => {
    expect(classifyVedicTopic("What should I focus on this week?")).toBe("general");
  });

  it("classifies career as career", () => {
    expect(classifyVedicTopic("My career is blocked, what should I do?")).toBe("career");
  });

  it("classifies relationship as relationship", () => {
    expect(classifyVedicTopic("How will my relationship be today?")).toBe("relationship");
  });

  it("does NOT return career as final fallback — uses general", () => {
    const result = classifyVedicTopic("xyzzy unknown question gibberish");
    expect(result).toBe("general");
    expect(result).not.toBe("career");
  });

  it("classifies dasha questions as dasha", () => {
    expect(classifyVedicTopic("What mahadasha am I running?")).toBe("dasha");
    expect(classifyVedicTopic("Am I in Jupiter-Ketu?")).toBe("dasha");
  });

  it("classifies safety questions", () => {
    expect(classifyVedicTopic("When will I die?")).toBe("safety_death");
    expect(classifyVedicTopic("Will I get this disease?")).toBe("safety_medical");
  });
});
