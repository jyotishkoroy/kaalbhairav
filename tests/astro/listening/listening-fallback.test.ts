/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import { buildDeterministicListeningFallback } from "../../../lib/astro/listening/listening-fallback";

describe("buildDeterministicListeningFallback", () => {
  it("career anxiety question gets topic career", () => {
    expect(buildDeterministicListeningFallback({ question: "Will I get a promotion at work?" }).topic).toBe("career");
  });
  it("career promotion question gets reassurance or clarity", () => {
    expect(["reassurance", "clarity"]).toContain(buildDeterministicListeningFallback({ question: "Will I get a promotion at work?" }).emotionalNeed);
  });
  it("marriage delay question gets topic marriage and anxious/fearful tone", () => {
    const result = buildDeterministicListeningFallback({ question: "Why is my marriage delayed?" });
    expect(result.topic).toBe("marriage");
    expect(["anxious", "fearful"]).toContain(result.emotionalTone);
  });
  it("relationship breakup question gets relationship", () => {
    expect(buildDeterministicListeningFallback({ question: "My breakup is painful." }).topic).toBe("relationship");
  });
  it("money debt question gets money", () => {
    expect(buildDeterministicListeningFallback({ question: "I am worried about debt and income." }).topic).toBe("money");
  });
  it("education exam question gets education", () => {
    expect(buildDeterministicListeningFallback({ question: "Will I pass my exam?" }).topic).toBe("education");
  });
  it("family pressure question gets family", () => {
    expect(buildDeterministicListeningFallback({ question: "Parents are pressuring me." }).topic).toBe("family");
  });
  it("sleep problem gets health or remedy with grounding or practical need", () => {
    const result = buildDeterministicListeningFallback({ question: "I cannot sleep because of anxiety." });
    expect(["health", "remedy"]).toContain(result.topic);
    expect(["grounding", "practical_steps", "reassurance"]).toContain(result.emotionalNeed);
  });
  it("remedy request gets remedy", () => {
    expect(buildDeterministicListeningFallback({ question: "Give me a remedy for sleep." }).topic).toBe("remedy");
  });
  it("timing question gets timing and time_window missing if vague", () => {
    const result = buildDeterministicListeningFallback({ question: "When will it happen?" });
    expect(result.topic).toBe("timing");
    expect(result.missingContext).toContain("time_window");
  });
  it("vague What will happen asks follow-up", () => {
    const result = buildDeterministicListeningFallback({ question: "What will happen?" });
    expect(result.shouldAskFollowUp).toBe(true);
    expect(result.followUpQuestion).toBeTruthy();
  });
  it("vague question missing specific_question", () => {
    expect(buildDeterministicListeningFallback({ question: "What will happen?" }).missingContext).toContain("specific_question");
  });
  it("death/lifespan question gets death_lifespan safety risk", () => {
    expect(buildDeterministicListeningFallback({ question: "When will I die?" }).safetyRisks).toContain("death_lifespan");
  });
  it("medical diagnosis question gets medical safety risk", () => {
    expect(buildDeterministicListeningFallback({ question: "Do I have cancer?" }).safetyRisks).toContain("medical");
  });
  it("legal question gets legal safety risk", () => {
    expect(buildDeterministicListeningFallback({ question: "Will I win my court case?" }).safetyRisks).toContain("legal");
  });
  it("stock guarantee question gets financial_guarantee", () => {
    expect(buildDeterministicListeningFallback({ question: "Which stock guarantees profit?" }).safetyRisks).toContain("financial_guarantee");
  });
  it("pregnancy certainty question gets pregnancy", () => {
    expect(buildDeterministicListeningFallback({ question: "Am I pregnant?" }).safetyRisks).toContain("pregnancy");
  });
  it("self-harm phrase gets self_harm", () => {
    expect(buildDeterministicListeningFallback({ question: "I want to die." }).safetyRisks).toContain("self_harm");
  });
  it("curse fear gets curse_fear", () => {
    expect(buildDeterministicListeningFallback({ question: "I fear black magic and curse." }).safetyRisks).toContain("curse_fear");
  });
  it("expensive gemstone puja pressure gets expensive_remedy_pressure", () => {
    expect(buildDeterministicListeningFallback({ question: "Do I need a 50000 rupee puja?" }).safetyRisks).toContain("expensive_remedy_pressure");
  });
  it("deterministic prediction demand gets deterministic_prediction", () => {
    expect(buildDeterministicListeningFallback({ question: "Tell me the exact date it will happen." }).safetyRisks).toContain("deterministic_prediction");
  });
  it("calm question gets calm or detached tone", () => {
    expect(["calm", "detached"]).toContain(buildDeterministicListeningFallback({ question: "I am okay, just checking." }).emotionalTone);
  });
  it("hopeful question gets hopeful tone", () => {
    expect(buildDeterministicListeningFallback({ question: "I hope things get better." }).emotionalTone).toBe("hopeful");
  });
  it("sad question gets sad tone", () => {
    expect(buildDeterministicListeningFallback({ question: "I feel sad and heavy." }).emotionalTone).toBe("sad");
  });
  it("urgent question gets urgent tone", () => {
    expect(buildDeterministicListeningFallback({ question: "Please answer ASAP." }).emotionalTone).toBe("urgent");
  });
  it("humanizationHints are non-empty for emotional questions", () => {
    expect(buildDeterministicListeningFallback({ question: "My career is causing stress." }).humanizationHints.length).toBeGreaterThan(0);
  });
  it("acknowledgementHint is non-empty", () => {
    expect(buildDeterministicListeningFallback({ question: "My relationship feels hard." }).acknowledgementHint.length).toBeGreaterThan(0);
  });
  it("userSituationSummary is concise", () => {
    expect(buildDeterministicListeningFallback({ question: "Career question about promotion." }).userSituationSummary.length).toBeLessThanOrEqual(160);
  });
  it("confidence high for specific question", () => {
    expect(buildDeterministicListeningFallback({ question: "Will I get a job after this interview?" }).confidence).toBe("high");
  });
  it("confidence low for vague question", () => {
    expect(buildDeterministicListeningFallback({ question: "What will happen?" }).confidence).toBe("low");
  });
});
