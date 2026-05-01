/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { composeFinalUserAnswer } from "../../../lib/astro/reading/final-answer-composer";

describe("final answer composer", () => {
  it("removes broad fallback scaffolding", () => {
    const result = composeFinalUserAnswer({
      question: "What should I ask?",
      draftAnswer:
        "The question is broad, so start with the area that feels most urgent and choose one grounded next step. I can help, but the question is broad. Pick one area first: career, relationship, money, family, health, study, or spiritual practice.",
      domain: "general",
    });

    expect(result.answer).not.toContain("The question is broad");
    expect(result.answer).not.toContain("I can help, but the question is broad");
    expect(result.answer).toContain("Pick one area first");
  });

  it("dedupes repeated marriage sentences", () => {
    const result = composeFinalUserAnswer({
      question: "Why is my marriage delayed?",
      draftAnswer:
        "Marriage timing is best read through readiness, communication, family expectations, and whether the decision supports emotional steadiness. Marriage timing is best read through readiness, communication, family expectations, and whether the decision supports emotional steadiness.",
      domain: "marriage",
    });

    expect(result.answer).toContain("Do not treat delay as proof of bad luck");
    expect(result.answer).not.toContain("Marriage timing is best read through readiness, communication, family expectations, and whether the decision supports emotional steadiness. Marriage timing is best read through readiness, communication, family expectations, and whether the decision supports emotional steadiness.");
  });

  it("keeps gemstone boundary to one sentence", () => {
    const result = composeFinalUserAnswer({
      question: "Should I wear blue sapphire?",
      draftAnswer:
        "Do not wear strong gemstones impulsively; consider them only after careful full-chart review by a trusted expert. Do not wear strong gemstones impulsively; consider them only after careful full-chart review by a trusted expert.",
      domain: "remedy",
      safetyAction: "gemstone_boundary",
    });

    expect(result.answer.match(/strong gemstones impulsively/g)?.length ?? 0).toBe(1);
  });

  it("uses business fallback for business prompts", () => {
    const result = composeFinalUserAnswer({
      question: "Can astrology guarantee business profit?",
      draftAnswer: "It makes sense that this feels frustrating when effort is not turning into recognition.",
      domain: "business",
      safetyAction: "financial_boundary",
    });

    expect(result.answer).toContain("Astrology cannot guarantee business profit");
    expect(result.answer).not.toContain("effort is not turning into recognition");
  });

  it("leaves exact facts intact", () => {
    const draft = "Direct answer: Leo. This is a deterministic chart fact read from the chart data.";
    const result = composeFinalUserAnswer({
      question: "What is my Ascendant sign exactly?",
      draftAnswer: draft,
      domain: "exact_fact",
      exactFact: true,
    });

    expect(result.answer).toBe(draft);
    expect(result.repaired).toBe(false);
  });
});
