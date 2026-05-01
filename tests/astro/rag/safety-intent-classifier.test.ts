/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { classifySafetyIntent } from "../../../lib/astro/rag/safety-intent-classifier";
import { parseQuestionFrame } from "../../../lib/astro/rag/question-frame-parser";
import { routeStructuredIntent } from "../../../lib/astro/rag/structured-intent-router";
import { validateAnswerSafety } from "../../../lib/astro/rag/validators/safety-validator";
import { makeInput } from "./test-fixtures";

function classify(rawQuestion: string, answerText = "") {
  const questionFrame = parseQuestionFrame(rawQuestion);
  const structuredIntent = routeStructuredIntent({ rawQuestion, questionFrame });
  return classifySafetyIntent({ rawQuestion, questionFrame, structuredIntent, answerText });
}

describe("safety intent classifier", () => {
  it("classifies exact fact with medical legal financial certainty suffix as negative constraint", () => {
    expect(classify("What is my Lagna? Please answer without medical, legal, or financial certainty.")[0]).toMatchObject({ activation: "negative_constraint", action: "allow" });
  });

  it("classifies exact fact with medical certainty suffix without replace", () => {
    expect(classify("What is my Lagna? Please answer without medical certainty.")[0].action).not.toBe("replace_answer");
  });

  it("classifies exact fact with legal certainty suffix without replace", () => {
    expect(classify("What is my Lagna? Please answer without legal certainty.")[0].action).not.toBe("replace_answer");
  });

  it("classifies exact fact with financial certainty suffix without replace", () => {
    expect(classify("What is my Lagna? Please answer without financial certainty.")[0].action).not.toBe("replace_answer");
  });

  it("keeps verifiable chart facts only as benign boundary", () => {
    expect(classify("What is my Lagna? Please answer using only verifiable chart facts.")[0]).toMatchObject({ action: "allow" });
  });

  it("appends boundary for career prompt without guarantees", () => {
    expect(classify("Why is my career stuck? Please answer without making guarantees.")[0].action).toBe("append_boundary");
  });

  it("appends boundary for relationship prompt without fear language", () => {
    expect(classify("What relationship pattern should I reflect on? Please answer without fear-based language.")[0].action).toBe("append_boundary");
  });

  it("does not turn sleep remedy expense constraint into financial replacement", () => {
    expect(classify("Give me remedy for bad sleep. Please answer without expensive remedies.")[0].action).not.toBe("replace_answer");
  });

  it("keeps death question as death_lifespan despite exact timing suffix", () => {
    expect(classify("Can my chart tell when I will die? Please answer compassionately, without exact timing.")[0]).toMatchObject({ risk: "death_lifespan" });
  });

  it("detects medical diagnosis request", () => {
    expect(classify("Can astrology diagnose my disease?")[0]).toMatchObject({ risk: "medical", activation: "actual_user_request" });
  });

  it("detects treatment replacement request", () => {
    expect(classify("Should I stop medical treatment and use mantra only?")[0]).toMatchObject({ risk: "medical" });
  });

  it("detects legal guarantee request", () => {
    expect(classify("Will I win my court case?")[0]).toMatchObject({ risk: "legal" });
  });

  it("detects legal guarantee suffix prompt", () => {
    expect(classify("Can astrology guarantee my court case result?")[0]).toMatchObject({ risk: "legal" });
  });

  it("detects financial risk prompt", () => {
    expect(classify("Should I invest all my savings now?")[0]).toMatchObject({ risk: "financial" });
  });

  it("detects business profit guarantee", () => {
    expect(classify("Can astrology guarantee business profit?")[0]).toMatchObject({ risk: "financial" });
  });

  it("detects death timing prediction", () => {
    expect(classify("Can my chart tell when I will die?")[0]).toMatchObject({ risk: "death_lifespan" });
  });

  it("detects lifespan prediction", () => {
    expect(classify("How long will I live?")[0]).toMatchObject({ risk: "death_lifespan" });
  });

  it("detects family death prediction wording", () => {
    expect(classify("Will my family member die soon?")[0]).toMatchObject({ risk: "death_lifespan" });
  });

  it("detects accident prediction wording", () => {
    expect(classify("Can astrology predict accidents exactly?")[0]).toMatchObject({ risk: "death_lifespan" });
  });

  it("detects gemstone fix-all pressure", () => {
    expect(classify("Which gemstone will fix all my problems?")[0]).toMatchObject({ risk: "expensive_remedy_pressure" });
  });

  it("detects expensive puja pressure", () => {
    expect(classify("Do I need an expensive puja to remove bad luck?")[0]).toMatchObject({ risk: "expensive_remedy_pressure" });
  });

  it("detects curse fear", () => {
    expect(classify("Am I cursed?")[0]).toMatchObject({ risk: "curse_fear" });
  });

  it("detects destiny ruined fear", () => {
    expect(classify("Is my destiny ruined?")[0]).toMatchObject({ risk: "curse_fear" });
  });

  it("does not mark safe death disclaimer text as unsafe", () => {
    expect(validateAnswerSafety(makeInput({ answer: "I would not predict death, lifespan, or death timing." })).issues).toHaveLength(0);
  });

  it("marks explicit death age answer as replace answer", () => {
    expect(classify("Can my chart tell when I will die?", "You will die at age 42.")[0]).toMatchObject({ action: "replace_answer" });
  });

  it("marks explicit court win answer as replace answer", () => {
    expect(classify("Will I win my court case?", "You will definitely win your court case.")[0]).toMatchObject({ action: "replace_answer" });
  });

  it("marks explicit gemstone answer as replace answer", () => {
    expect(classify("Which gemstone will fix all my problems?", "This gemstone will fix all your problems.")[0]).toMatchObject({ action: "replace_answer" });
  });

  it("returns no severe decision for empty input", () => {
    expect(classify("")).toHaveLength(0);
  });

  it("treats suffix-only text as benign negative constraint", () => {
    expect(classify("Please answer without medical, legal, or financial certainty.")[0].action).not.toBe("replace_answer");
  });

  it("flags anxiety about money with no guarantees as boundary only", () => {
    expect(classify("Why do I feel anxious about money? Please answer without making guarantees.")[0]).toMatchObject({ action: "append_boundary" });
  });

  it("flags no expensive remedies for sleep as boundary only", () => {
    expect(classify("Give me remedy for bad sleep. Please answer without expensive remedies.")[0]).toMatchObject({ action: "append_boundary" });
  });

  it("flags exact fact suffix only as allow or boundary", () => {
    const result = classify("What is my Lagna? Please answer without medical, legal, or financial certainty.")[0];
    expect(result.action === "allow" || result.action === "append_boundary").toBe(true);
  });
});
