/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { parseQuestionFrame } from "../../../lib/astro/rag/question-frame-parser";

describe("parseQuestionFrame", () => {
  it("extracts practical guidance suffix", () => {
    expect(parseQuestionFrame("What is my Lagna? Please answer with practical guidance.")).toMatchObject({
      coreQuestion: "What is my Lagna?",
      requestedStyle: ["practical_guidance"],
    });
  });

  it("extracts medical legal financial negative constraint", () => {
    expect(parseQuestionFrame("What is my Lagna? Please answer without medical, legal, or financial certainty.")).toMatchObject({
      coreQuestion: "What is my Lagna?",
      negativeSafetyConstraints: ["medical", "legal", "financial"],
    });
  });

  it("extracts verifiable facts only", () => {
    expect(parseQuestionFrame("Where is my Sun placed? Please answer using only verifiable chart facts.")).toMatchObject({
      coreQuestion: "Where is my Sun placed?",
      requestedStyle: ["verifiable_facts_only"],
    });
  });

  it("extracts no guarantees", () => {
    expect(parseQuestionFrame("Why is my career stuck? Please answer without making guarantees.")).toMatchObject({
      coreQuestion: "Why is my career stuck?",
      negativeSafetyConstraints: ["guarantee"],
    });
  });

  it("extracts fear-free style", () => {
    expect(parseQuestionFrame("Will my marriage be delayed? Please answer without fear-based language.")).toMatchObject({
      coreQuestion: "Will my marriage be delayed?",
      requestedStyle: ["fear_free"],
      negativeSafetyConstraints: ["fear_based_language"],
    });
  });

  it("extracts no expensive remedies", () => {
    expect(parseQuestionFrame("Give me remedy for bad sleep. Please answer without expensive remedies.")).toMatchObject({
      coreQuestion: "Give me remedy for bad sleep.",
      requestedStyle: ["no_expensive_remedies"],
      negativeSafetyConstraints: ["expensive_remedy"],
    });
  });

  it("keeps death question core content with compassionate style", () => {
    expect(parseQuestionFrame("Can my chart tell when I will die? Please answer compassionately.")).toMatchObject({
      coreQuestion: "Can my chart tell when I will die?",
      requestedStyle: ["compassionate_grounded"],
    });
  });

  it("extracts follow-up if needed context", () => {
    expect(parseQuestionFrame("What should I do about my future? as a follow-up question if more context is needed")).toMatchObject({
      coreQuestion: "What should I do about my future?",
      situationContext: ["follow_up_if_needed"],
    });
  });

  it("keeps actual medical diagnosis questions as core content", () => {
    expect(parseQuestionFrame("Can astrology diagnose my disease?")).toMatchObject({
      coreQuestion: "Can astrology diagnose my disease?",
      negativeSafetyConstraints: [],
    });
  });

  it("keeps actual legal questions as core content", () => {
    expect(parseQuestionFrame("Will I win my court case?")).toMatchObject({
      coreQuestion: "Will I win my court case?",
      negativeSafetyConstraints: [],
    });
  });

  it("keeps risky investment questions as core content", () => {
    expect(parseQuestionFrame("Should I invest all my money now?")).toMatchObject({
      coreQuestion: "Should I invest all my money now?",
      negativeSafetyConstraints: [],
    });
  });

  it("keeps gemstone claims as core content", () => {
    expect(parseQuestionFrame("Will a gemstone fix all my problems?")).toMatchObject({
      coreQuestion: "Will a gemstone fix all my problems?",
    });
  });

  it("extracts next month context", () => {
    expect(parseQuestionFrame("What will happen next? for the next month")).toMatchObject({
      situationContext: ["next_month"],
    });
  });

  it("extracts this year context", () => {
    expect(parseQuestionFrame("What will happen this year? for this year")).toMatchObject({
      situationContext: ["this_year"],
    });
  });

  it("extracts anxious context", () => {
    expect(parseQuestionFrame("What should I know when I feel anxious?")).toMatchObject({
      situationContext: ["anxious"],
    });
  });

  it("extracts family pressure context", () => {
    expect(parseQuestionFrame("What should I do when family pressure is high?")).toMatchObject({
      situationContext: ["family_pressure"],
    });
  });

  it("extracts stuck context", () => {
    expect(parseQuestionFrame("What should I do when I feel stuck?")).toMatchObject({
      situationContext: ["stuck"],
    });
  });

  it("extracts concise answer style", () => {
    expect(parseQuestionFrame("Tell me about my career as a concise answer")).toMatchObject({
      requestedStyle: ["concise"],
    });
  });

  it("returns safe frame for empty input", () => {
    expect(parseQuestionFrame("   ")).toEqual({
      rawQuestion: "   ",
      coreQuestion: "",
      requestedStyle: [],
      situationContext: [],
      negativeSafetyConstraints: [],
      extractedSuffixes: [],
    });
  });

  it("strips multiple suffixes in one prompt", () => {
    expect(parseQuestionFrame("What is my Lagna? Please answer without fear-based language. Please answer with one next step.")).toMatchObject({
      coreQuestion: "What is my Lagna?",
      requestedStyle: ["fear_free", "one_next_step"],
      negativeSafetyConstraints: ["fear_based_language"],
    });
  });

  it("regresses bank flaw for lagna safety suffix", () => {
    expect(parseQuestionFrame("What is my Lagna? Please answer without medical, legal, or financial certainty.")).toMatchObject({
      coreQuestion: "What is my Lagna?",
      negativeSafetyConstraints: ["medical", "legal", "financial"],
    });
  });

  it("regresses bank flaw for money anxiety guarantee suffix", () => {
    expect(parseQuestionFrame("Why do I feel anxious about money? Please answer without making guarantees.")).toMatchObject({
      coreQuestion: "Why do I feel anxious about money?",
      negativeSafetyConstraints: ["guarantee"],
    });
  });

  it("regresses bank flaw for relationship reflection fear-free suffix", () => {
    expect(parseQuestionFrame("What relationship pattern should I reflect on? Please answer without fear-based language.")).toMatchObject({
      coreQuestion: "What relationship pattern should I reflect on?",
      negativeSafetyConstraints: ["fear_based_language"],
    });
  });

  it("regresses bank flaw for sleep remedy expense suffix", () => {
    expect(parseQuestionFrame("Give me remedy for bad sleep. Please answer without expensive remedies.")).toMatchObject({
      coreQuestion: "Give me remedy for bad sleep.",
      negativeSafetyConstraints: ["expensive_remedy"],
    });
  });

  it("regresses bank flaw for lifespan compassion and exact timing", () => {
    expect(parseQuestionFrame("Can my chart tell when I will die? Please answer compassionately, without exact timing.")).toMatchObject({
      coreQuestion: "Can my chart tell when I will die?",
      requestedStyle: ["compassionate_grounded"],
      situationContext: ["no_exact_timing"],
      negativeSafetyConstraints: ["exact_timing"],
    });
  });
});
