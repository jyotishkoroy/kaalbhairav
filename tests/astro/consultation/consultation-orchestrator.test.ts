/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildChartEvidence, type ChartEvidence, type ChartEvidenceFactor } from "../../../lib/astro/consultation/chart-evidence-builder";
import { extractCulturalFamilyContext } from "../../../lib/astro/consultation/cultural-context-extractor";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import { createEphemeralConsultationMemoryStore } from "../../../lib/astro/consultation/ephemeral-consultation-memory";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";
import { extractPracticalConstraints } from "../../../lib/astro/consultation/practical-constraints-extractor";
import { type TimingJudgement } from "../../../lib/astro/consultation/timing-judgement";
import { type RemedyPlan } from "../../../lib/astro/consultation/remedy-proportionality";
import {
  runConsultationOrchestration,
  type ConsultationOrchestratorResult,
} from "../../../lib/astro/consultation/consultation-orchestrator";

function suppliedCareerChartEvidence(overrides?: Partial<ChartEvidence>): ChartEvidence {
  return {
    domain: "career",
    supportiveFactors: [
      {
        factor: "Strong 10th house career indicator",
        source: "rashi",
        confidence: "high",
        interpretationHint: "Synthetic supplied evidence for orchestrator tests.",
      },
    ],
    challengingFactors: [
      {
        factor: "Saturn pressure on 10th house indicates career delay",
        source: "derived_rule",
        confidence: "medium",
        interpretationHint: "Synthetic supplied evidence for orchestrator tests.",
      },
    ],
    neutralFacts: [],
    birthTimeSensitivity: "medium",
    ...overrides,
  };
}

function suppliedMixedTiming(): TimingJudgement {
  return {
    status: "mixed",
    currentPeriodMeaning: "Synthetic mixed timing context.",
    recommendedAction: "avoid_impulsive_decision",
    reasoning: ["Synthetic supportive and challenging timing evidence was supplied."],
    confidence: "medium",
    birthTimeSensitivity: "low",
  };
}

function suppliedLevelTwoRemedy(): RemedyPlan {
  return {
    level: 2,
    levelMeaning: "light_spiritual",
    remedies: [
      {
        type: "behavioral",
        instruction: "For the next 8 Saturdays, complete one pending responsibility before starting something new.",
        reason: "Saturn themes are handled through discipline and responsibility.",
        duration: "8 Saturdays",
        cost: "free",
        optional: true,
      },
    ],
    avoid: ["expensive gemstone recommendation", "fear-based ritual", "large donation beyond means", "remedy dependency"],
  };
}

function allResultText(result: ConsultationOrchestratorResult): string {
  return JSON.stringify(result).toLowerCase();
}

function factor(text: string, source: ChartEvidenceFactor["source"] = "derived_rule"): ChartEvidenceFactor {
  return {
    factor: text,
    source,
    confidence: "medium",
    interpretationHint: "Synthetic supplied evidence for orchestrator tests.",
  };
}

describe("runConsultationOrchestration", () => {
  it("bypasses exact-fact consultation expansion", () => {
    const store = createEphemeralConsultationMemoryStore();
    const result = runConsultationOrchestration({
      userQuestion: "What is my Lagna?",
      sessionId: "exact-1",
      memoryStore: store,
    });
    expect(result.status).toBe("exact_fact_bypass");
    expect(result.state.intent.primary).toBe("exact_fact");
    expect(result.lifeContext).toBeUndefined();
    expect(result.emotionalState).toBeUndefined();
    expect(result.culturalContext).toBeUndefined();
    expect(result.practicalConstraints).toBeUndefined();
    expect(result.patternRecognition).toBeUndefined();
    expect(result.timingJudgement).toBeUndefined();
    expect(result.remedyPlan).toBeUndefined();
    expect(result.responsePlan.mode).toBe("exact_fact_only");
    expect(result.followUpDecision.shouldAsk).toBe(false);
    expect(store.get("exact-1").status).toBe("idle");
  });

  it("handles career consultation with supplied evidence", () => {
    const result = runConsultationOrchestration({
      userQuestion: "I feel stuck in my job. My manager keeps blocking me. Should I leave?",
      sessionId: "career-1",
      suppliedChartEvidence: suppliedCareerChartEvidence(),
    });
    expect(["response_plan_ready", "follow_up_needed"]).toContain(result.status);
    expect(result.lifeContext?.lifeArea).toBe("career");
    expect(result.emotionalState).toBeDefined();
    expect(result.chartEvidence?.domain).toBe("career");
    expect(result.patternRecognition).toBeDefined();
    expect(result.timingJudgement).toBeDefined();
    expect(result.remedyPlan).toBeDefined();
    expect(result.responsePlan.mode).not.toBe("exact_fact_only");
  });

  it("tracks marriage pressure with high anxiety and gentle tone", () => {
    const result = runConsultationOrchestration({
      userQuestion: "My parents are pressuring me for marriage but I am scared.",
      sessionId: "marriage-1",
      suppliedChartEvidence: suppliedCareerChartEvidence({ domain: "marriage" }),
    });
    expect(result.culturalContext?.parentalPressure).toBe(true);
    expect(result.emotionalState?.intensity).toBe("high");
    expect(result.responsePlan.tone.avoid).toEqual(expect.arrayContaining(["fear-based language"]));
  });

  it("asks for grouped birth data when chart evidence is needed and birth data is missing", () => {
    const result = runConsultationOrchestration({
      userQuestion: "Will my marriage happen soon?",
      sessionId: "birth-1",
      birthData: undefined,
      suppliedChartEvidence: suppliedCareerChartEvidence({ domain: "marriage" }),
    });
    expect(result.followUpDecision.shouldAsk).toBe(true);
    expect(result.followUpDecision.reason).toBe("missing_birth_data_for_chart");
    expect(result.responsePlan.mode).toBe("ask_follow_up");
    expect(result.memoryState.status).toBe("follow_up_asked");
  });

  it("does not ask again once follow-up was already asked", () => {
    const store = createEphemeralConsultationMemoryStore();
    const first = runConsultationOrchestration({
      userQuestion: "Should I say yes to this proposal?",
      sessionId: "follow-1",
      memoryStore: store,
    });
    expect(first.followUpDecision.shouldAsk).toBe(true);
    const second = runConsultationOrchestration({
      mode: "follow_up_answer",
      userQuestion: "It is about a specific proposal.",
      sessionId: "follow-1",
      memoryStore: store,
    });
    expect(second.followUpDecision.shouldAsk).toBe(false);
    expect(second.followUpDecision.reason).toBe("follow_up_already_asked");
    expect(second.state.lifeStory.currentSituation?.toLowerCase()).toContain("follow-up answer");
  });

  it("warns when a follow-up answer arrives without active memory", () => {
    const result = runConsultationOrchestration({
      mode: "follow_up_answer",
      userQuestion: "It is about a specific proposal.",
      sessionId: "follow-2",
      memoryStore: createEphemeralConsultationMemoryStore(),
    });
    expect(result.warnings).toContain("follow_up_answer_without_active_memory");
    expect(result.status).toBe("response_plan_ready");
  });

  it("resets memory when the final answer is delivered", () => {
    const store = createEphemeralConsultationMemoryStore();
    runConsultationOrchestration({
      userQuestion: "Should I quit my job and start my own business?",
      sessionId: "reset-1",
      memoryStore: store,
    });
    const result = runConsultationOrchestration({
      mode: "final_answer_delivered",
      userQuestion: "final answer delivered",
      sessionId: "reset-1",
      memoryStore: store,
    });
    expect(result.status).toBe("reset_complete");
    expect(result.memoryState.status).toBe("idle");
    expect(store.get("reset-1").status).toBe("idle");
    expect(result.warnings).toContain("final_answer_delivered_reset_only");
  });

  it("uses supplied chart evidence directly", () => {
    const supplied = suppliedCareerChartEvidence({
      supportiveFactors: [factor("Unique supplied supportive factor", "rashi")],
      challengingFactors: [],
      neutralFacts: [],
    });
    const result = runConsultationOrchestration({
      userQuestion: "Should I switch jobs?",
      sessionId: "evidence-1",
      suppliedChartEvidence: supplied,
    });
    expect(result.chartEvidence).toEqual(supplied);
    expect(allResultText(result)).toContain("unique supplied supportive factor");
  });

  it("builds evidence from supplied chart facts", () => {
    const result = runConsultationOrchestration({
      userQuestion: "Career question with facts",
      sessionId: "facts-1",
      chartFacts: {
        source: "test_fixture",
        facts: [{ key: "tenthHouse", label: "10th house", value: "Strong 10th house career indicator", confidence: "high" }],
      },
    });
    expect(allResultText(result)).toContain("10th house");
  });

  it("warns when no chart evidence is supplied", () => {
    const result = runConsultationOrchestration({
      userQuestion: "I feel stuck in my job.",
      sessionId: "no-evidence-1",
    });
    expect(result.warnings).toContain("no_chart_evidence_supplied");
    expect(result.chartEvidence?.supportiveFactors.length).toBe(0);
    expect(result.chartEvidence?.challengingFactors.length).toBe(0);
  });

  it("uses supplied timing judgement directly", () => {
    const result = runConsultationOrchestration({
      userQuestion: "When should I move?",
      sessionId: "timing-1",
      suppliedTimingJudgement: suppliedMixedTiming(),
    });
    expect(result.timingJudgement?.status).toBe("mixed");
  });

  it("builds timing from supplied timing facts", () => {
    const result = runConsultationOrchestration({
      userQuestion: "When should I move?",
      sessionId: "timing-2",
      timingFacts: [
        { text: "supportive movement and opening", source: "dasha", polarity: "supportive" },
        { text: "pressure and caution with some opening", source: "transit", polarity: "challenging" },
      ],
    });
    expect(result.timingJudgement?.status).toMatch(/mixed|delayed|preparatory|clarifying/);
  });

  it("uses supplied remedy plan directly", () => {
    const supplied = suppliedLevelTwoRemedy();
    const result = runConsultationOrchestration({
      userQuestion: "Give me a remedy",
      sessionId: "remedy-1",
      suppliedRemedyPlan: supplied,
    });
    expect(result.remedyPlan).toEqual(supplied);
  });

  it("cautions gemstone requests", () => {
    const result = runConsultationOrchestration({
      userQuestion: "Should I wear a gemstone immediately?",
      sessionId: "gem-1",
      suppliedChartEvidence: suppliedCareerChartEvidence(),
    });
    expect(result.remedyPlan?.level).toBe(5);
    expect(allResultText(result)).toContain("do not buy or wear an expensive gemstone casually");
  });

  it("clamps low-money remedy plans", () => {
    const result = runConsultationOrchestration({
      userQuestion: "Money is tight and I cannot afford expensive remedies.",
      sessionId: "money-1",
    });
    expect(result.remedyPlan?.level).toBeLessThanOrEqual(2);
    expect(result.remedyPlan?.remedies.every((item) => item.cost !== "high")).toBe(true);
  });

  it("keeps health-sensitive guidance bounded", () => {
    const result = runConsultationOrchestration({
      userQuestion: "I am anxious about my health and sleep.",
      sessionId: "health-1",
    });
    expect(result.responsePlan.safetyGuardrails.join(" ").toLowerCase()).toContain("professional support");
    expect(allResultText(result)).not.toContain("diagnosis");
  });

  it("passes cultural and practical constraints through the plan", () => {
    const result = runConsultationOrchestration({
      userQuestion: "I work 12 hours a day and live with my parents.",
      sessionId: "constraints-1",
    });
    expect(result.practicalConstraints?.timeConstraint).toBe(true);
    expect(result.practicalConstraints?.privacyConstraint).toBe(true);
    expect(result.practicalConstraints?.familyConstraint).toBe(true);
    expect(result.responsePlan.tone.mustInclude.join(" ").toLowerCase()).toContain("keep practices discreet");
  });

  it("does not expose final answer prose fields", () => {
    const result = runConsultationOrchestration({
      userQuestion: "Should I quit my job?",
      sessionId: "structured-1",
    });
    expect(Object.prototype.hasOwnProperty.call(result, "finalAnswer")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, "markdown")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, "message")).toBe(false);
  });

  it("remains deterministic and free of LLM or fetch wiring", () => {
    const text = runConsultationOrchestration({
      userQuestion: "Should I quit my job?",
      sessionId: "audit-1",
    });
    expect(allResultText(text)).not.toContain("openai");
    expect(allResultText(text)).not.toContain("groq");
    expect(allResultText(text)).not.toContain("ollama");
    expect(allResultText(text)).not.toContain("anthropic");
    expect(allResultText(text)).not.toContain("gemini");
    expect(allResultText(text)).not.toContain("fetch(");
  });

  it("keeps exact-fact results clean after previous consultation memory", () => {
    const store = createEphemeralConsultationMemoryStore();
    runConsultationOrchestration({
      userQuestion: "My parents are forcing me to say yes to this proposal.",
      sessionId: "contam-1",
      memoryStore: store,
    });
    runConsultationOrchestration({
      mode: "final_answer_delivered",
      userQuestion: "final answer delivered",
      sessionId: "contam-1",
      memoryStore: store,
    });
    const exact = runConsultationOrchestration({
      userQuestion: "What is my Moon sign?",
      sessionId: "contam-1",
      memoryStore: store,
    });
    expect(exact.status).toBe("exact_fact_bypass");
    expect(allResultText(exact)).not.toContain("proposal");
    expect(allResultText(exact)).not.toContain("marriage pressure");
  });

  it("keeps session isolation across memory instances", () => {
    const store = createEphemeralConsultationMemoryStore();
    runConsultationOrchestration({ userQuestion: "Should I quit my job?", sessionId: "session-a", memoryStore: store });
    runConsultationOrchestration({ userQuestion: "Should I say yes to this proposal?", sessionId: "session-b", memoryStore: store });
    runConsultationOrchestration({ mode: "final_answer_delivered", userQuestion: "final", sessionId: "session-a", memoryStore: store });
    expect(store.get("session-b").status).not.toBe("idle");
  });

  it("preserves phase regressions across consultation modules", () => {
    expect(extractLifeContext({ question: "Should I quit my job and start my own business?" }).decisionType).toBe("business_transition");
    expect(detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." }).primaryEmotion).toBe("comparison");
    expect(extractCulturalFamilyContext({ question: "My parents are forcing me to say yes to this proposal." }).parentalPressure).toBe(true);
    expect(extractPracticalConstraints({ question: "I work 12 hours a day and live with my parents." }).privacyConstraint).toBe(true);
    expect(buildChartEvidence({
      domain: "career",
      chart: [{ key: "tenthHouse", label: "10th house", value: "Strong 10th house career indicator" }],
    }).supportiveFactors.length + buildChartEvidence({
      domain: "career",
      chart: [{ key: "tenthHouse", label: "10th house", value: "Strong 10th house career indicator" }],
    }).neutralFacts.length).toBeGreaterThan(0);
  });

  it("keeps pattern and response plan conservative without evidence", () => {
    const result = runConsultationOrchestration({
      userQuestion: "I feel lost and confused.",
      sessionId: "conservative-1",
    });
    expect(result.patternRecognition?.confidence).toBeDefined();
    expect(result.responsePlan.mode).toMatch(/insufficient_context|answer_now|ask_follow_up/);
  });

  it("propagates reset-after-final-answer from the response plan", () => {
    const result = runConsultationOrchestration({
      userQuestion: "Should I quit my job?",
      sessionId: "reset-prop-1",
      markFinalAnswerReady: true,
    });
    expect(result.resetAfterFinalAnswer).toBe(true);
  });
});
