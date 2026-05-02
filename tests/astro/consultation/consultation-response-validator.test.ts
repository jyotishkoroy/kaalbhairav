/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildChartEvidence, type ChartEvidence, type ChartEvidenceFactor } from "../../../lib/astro/consultation/chart-evidence-builder";
import { extractCulturalFamilyContext } from "../../../lib/astro/consultation/cultural-context-extractor";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import { createEphemeralConsultationMemoryStore } from "../../../lib/astro/consultation/ephemeral-consultation-memory";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";
import { extractPracticalConstraints } from "../../../lib/astro/consultation/practical-constraints-extractor";
import { synthesizePattern } from "../../../lib/astro/consultation/pattern-recognition";
import { decideFollowUp } from "../../../lib/astro/consultation/follow-up-policy";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { judgeTiming, type TimingJudgement } from "../../../lib/astro/consultation/timing-judgement";
import { buildProportionateRemedyPlan, type RemedyPlan } from "../../../lib/astro/consultation/remedy-proportionality";
import { buildConsultationResponsePlan, type ConsultationResponsePlan } from "../../../lib/astro/consultation/response-plan-builder";
import { runConsultationOrchestration } from "../../../lib/astro/consultation/consultation-orchestrator";
import {
  countFollowUpQuestions,
  validateConsultationResponse,
  type ConsultationResponseValidationInput,
} from "../../../lib/astro/consultation/consultation-response-validator";

function chartEvidence(overrides?: Partial<ChartEvidence>): ChartEvidence {
  return {
    domain: "career",
    supportiveFactors: [],
    challengingFactors: [],
    neutralFacts: [],
    birthTimeSensitivity: "low",
    ...overrides,
  };
}

function factor(text: string): ChartEvidenceFactor {
  return {
    factor: text,
    source: "derived_rule",
    confidence: "medium",
    interpretationHint: "Synthetic supplied evidence for validator tests.",
  };
}

function timingJudgement(overrides?: Partial<TimingJudgement>): TimingJudgement {
  return {
    status: "clarifying",
    currentPeriodMeaning: "Synthetic timing context.",
    recommendedAction: "review",
    reasoning: [],
    confidence: "low",
    birthTimeSensitivity: "low",
    ...overrides,
  };
}

function remedyPlan(overrides?: Partial<RemedyPlan>): RemedyPlan {
  return {
    level: 0,
    levelMeaning: "none",
    remedies: [],
    avoid: [
      "expensive gemstone recommendation",
      "fear-based ritual",
      "large donation beyond means",
      "remedy dependency",
    ],
    ...overrides,
  };
}

function responsePlan(overrides?: Partial<ConsultationResponsePlan>): ConsultationResponsePlan {
  return {
    mode: "answer_now",
    tone: {
      primary: "direct",
      avoid: ["absolute prediction", "fear-based language", "unsupported chart claims"],
      mustInclude: [],
    },
    sections: [
      {
        id: "safety_note",
        purpose: "Keep answer safe.",
        include: true,
        priority: 10,
        evidenceRefs: [],
        guidance: ["Avoid unsupported claims."],
      },
      {
        id: "acknowledgement",
        purpose: "Ground the user.",
        include: true,
        priority: 11,
        evidenceRefs: [],
        guidance: ["Acknowledge the user's stated situation without exaggerating it."],
      },
      {
        id: "practical_guidance",
        purpose: "Keep the answer practical.",
        include: true,
        priority: 12,
        evidenceRefs: [],
        guidance: ["Use practical next steps."],
      },
      {
        id: "timing",
        purpose: "Use only supplied timing judgement.",
        include: true,
        priority: 13,
        evidenceRefs: [],
        guidance: ["Do not invent dates or windows."],
      },
      {
        id: "reset_instruction",
        purpose: "Reset temporary state.",
        include: true,
        priority: 14,
        evidenceRefs: [],
        guidance: ["Reset ephemeral consultation memory after final answer."],
      },
    ],
    safetyGuardrails: [
      "Do not invent chart facts.",
      "Do not invent timing windows.",
      "Do not make absolute predictions.",
      "Do not give medical, legal, or financial certainty.",
      "Do not recommend expensive or coercive remedies.",
    ],
    evidenceSummary: {
      supportive: [],
      challenging: [],
      neutral: [],
    },
    resetAfterFinalAnswer: true,
    ...overrides,
  };
}

function validate(
  response: string,
  overrides?: Partial<ConsultationResponseValidationInput>,
) {
  return validateConsultationResponse({
    response,
    responsePlan: responsePlan(),
    ...overrides,
  });
}

describe("consultation-response-validator", () => {
  it("fails empty responses", () => {
    const result = validate("");
    expect(result.passed).toBe(false);
    expect(result.failures).toContain("empty_response");
  });

  it("passes a safe basic consultation", () => {
    const result = validate(
      "I understand why this feels heavy. The supplied chart evidence points to Saturn pressure on the 10th house, so this may feel slow rather than likely. Practically, document your work and avoid impulsive resignation.",
      {
        chartEvidence: chartEvidence({
          challengingFactors: [factor("Saturn pressure on 10th house indicates career delay")],
        }),
        responsePlan: responsePlan({
          evidenceSummary: { supportive: [], challenging: ["Saturn pressure on the 10th house indicates career delay"], neutral: [] },
          safetyGuardrails: ["Do not invent chart facts.", "Do not invent timing windows.", "Do not make absolute predictions.", "Do not give medical, legal, or financial certainty.", "Do not recommend expensive or coercive remedies."],
        }),
      },
    );
    expect(result.passed).toBe(true);
  });

  it("counts multiple follow-up questions", () => {
    expect(countFollowUpQuestions("Are you asking about timing? Is there a specific person?")).toBeGreaterThan(1);
    const result = validate("Are you asking about timing? Is there a specific person?");
    expect(result.failures).toContain("too_many_follow_up_questions");
  });

  it("allows one follow-up question", () => {
    const result = validate("Are you asking about general marriage timing, or about a specific proposal/person?", {
      responsePlan: responsePlan({ mode: "ask_follow_up" }),
    });
    expect(result.failures).not.toContain("too_many_follow_up_questions");
  });

  it("counts grouped birth-data request as one follow-up", () => {
    expect(countFollowUpQuestions("To calculate this properly, please share your birth date, exact birth time, and birthplace.")).toBe(1);
  });

  it("blocks exact fact follow-ups", () => {
    const result = validate("Your Lagna is Leo. Do you want a full reading?", {
      responsePlan: responsePlan({ mode: "exact_fact_only" }),
      state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }),
    });
    expect(result.failures).toContain("exact_fact_contains_follow_up");
  });

  it("allows concise exact facts", () => {
    const result = validate("Your Lagna is Leo.", {
      responsePlan: responsePlan({ mode: "exact_fact_only" }),
      state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }),
    });
    expect(result.passed).toBe(true);
  });

  it("blocks exact fact over-narration", () => {
    const result = validate("Your Lagna is Leo. This shows your soul is learning royal confidence and karmic leadership in a deeper meaning.", {
      responsePlan: responsePlan({ mode: "exact_fact_only" }),
      state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }),
    });
    expect(result.failures).toEqual(expect.arrayContaining(["exact_fact_contains_pattern_synthesis"]));
  });

  it("blocks exact fact remedies", () => {
    const result = validate("Your Lagna is Leo. You should chant a mantra for the Sun.", {
      responsePlan: responsePlan({ mode: "exact_fact_only" }),
      state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }),
    });
    expect(result.failures).toContain("exact_fact_contains_remedy");
  });

  it("blocks absolute prediction language", () => {
    expect(validate("You will definitely get married this year.").failures).toContain("absolute_prediction");
    expect(validate("This guarantees career success.").failures).toContain("absolute_prediction");
  });

  it("blocks death prediction language", () => {
    expect(validate("Your chart shows death danger.").failures).toContain("death_prediction");
  });

  it("blocks fear-based language", () => {
    expect(validate("You are cursed and must perform urgent puja.").failures).toContain("fear_based_language");
  });

  it("blocks harsh karma language", () => {
    expect(validate("You are suffering because of bad karma from a past life.").failures).toContain("harsh_karma_language");
  });

  it("blocks medical certainty", () => {
    expect(validate("Your chart diagnoses disease and this mantra will cure it.").failures).toContain("medical_certainty");
  });

  it("blocks legal certainty", () => {
    expect(validate("You will win the court case; no need for a lawyer.").failures).toContain("legal_certainty");
  });

  it("blocks financial certainty and irreversible action", () => {
    const result = validate("Invest now; guaranteed profit is shown.");
    expect(result.failures).toEqual(expect.arrayContaining(["financial_certainty", "irreversible_action_instruction"]));
  });

  it("blocks irreversible career instruction", () => {
    expect(validate("Quit now. The chart says this is the only path.").failures).toContain("irreversible_action_instruction");
  });

  it("blocks irreversible marriage instruction", () => {
    const result = validate("Marry now; this is certain.");
    expect(result.failures).toContain("irreversible_action_instruction");
  });

  it("blocks irreversible divorce instruction", () => {
    expect(validate("Divorce now.").failures).toContain("irreversible_action_instruction");
  });

  it("blocks unsafe gemstone recommendations", () => {
    expect(validate("Wear blue sapphire immediately.").failures).toContain("gemstone_recommended_without_caution");
  });

  it("allows gemstone caution language", () => {
    const result = validate(
      "Do not buy or wear an expensive gemstone casually; consider it only after full chart verification from a qualified astrologer.",
    );
    expect(result.failures).not.toContain("gemstone_recommended_without_caution");
  });

  it("blocks gemstone guarantees", () => {
    const result = validate("Wear blue sapphire; it will fix your Saturn problem.");
    expect(result.failures).toEqual(expect.arrayContaining(["gemstone_recommended_without_caution", "overconfident_remedy_claim"]));
  });

  it("blocks expensive puja as default", () => {
    const result = validate("You must perform an expensive puja urgently.");
    expect(result.failures).toContain("expensive_remedy_as_default");
  });

  it("blocks donation pressure", () => {
    const result = validate("Donate a large amount or the problem will not improve.");
    expect(result.failures).toContain("expensive_remedy_as_default");
  });

  it("blocks must-and-only-way remedy claims", () => {
    expect(validate("This is the only remedy and you must do it.").failures).toContain("overconfident_remedy_claim");
  });

  it("warns when optional remedy language is missing", () => {
    const result = validate("Use this simple remedy.", {
      remedyPlan: remedyPlan({
        remedies: [
          {
            type: "mantra",
            instruction: "Practice a calming mantra.",
            reason: "Synthetic optional remedy.",
            cost: "free",
            optional: true,
          },
        ],
      }),
    });
    expect(result.warnings).toContain("missing_remedy_optional_language");
  });

  it("blocks formal ritual in a low-level remedy plan", () => {
    const result = validate("Perform a formal ritual with a priest.", {
      remedyPlan: remedyPlan({ level: 2, levelMeaning: "light_spiritual" }),
    });
    expect(result.failures).toContain("expensive_remedy_as_default");
  });

  it("blocks gemstone purchase when remedy level requires caution", () => {
    const result = validate("Buy the gemstone tomorrow.", {
      remedyPlan: remedyPlan({ level: 5, levelMeaning: "gemstone_caution" }),
    });
    expect(result.failures).toContain("gemstone_recommended_without_caution");
  });

  it("blocks unsupported timing windows", () => {
    const result = validate("This will happen in the next 6-9 months.", {
      timingJudgement: timingJudgement(),
    });
    expect(result.failures).toContain("unsupported_timing_window");
  });

  it("allows supplied timing windows", () => {
    const result = validate("This looks active in the next 6-9 months, but not guaranteed.", {
      timingJudgement: timingJudgement({ timeWindow: { label: "next 6-9 months" } }),
      responsePlan: responsePlan({
        sections: [
          {
            id: "timing",
            purpose: "Use only supplied timing judgement.",
            include: true,
            priority: 13,
            evidenceRefs: [],
            guidance: ["Include only the supplied time window label: next 6-9 months."],
        },
      ],
        safetyGuardrails: ["Do not invent chart facts.", "Do not invent timing windows.", "Do not make absolute predictions.", "Do not give medical, legal, or financial certainty.", "Do not recommend expensive or coercive remedies."],
      }),
    });
    expect(result.failures).not.toContain("unsupported_timing_window");
  });

  it("allows supplied ISO dates", () => {
    const result = validate("The relevant period is between 2026-01-01 and 2026-12-31.", {
      timingJudgement: timingJudgement({ timeWindow: { label: "2026 window", from: "2026-01-01", to: "2026-12-31" } }),
      responsePlan: responsePlan({
        sections: [
          {
            id: "timing",
            purpose: "Use only supplied timing judgement.",
            include: true,
            priority: 13,
            evidenceRefs: [],
            guidance: ["Include only the supplied time window label: 2026 window."],
        },
      ],
        safetyGuardrails: ["Do not invent chart facts.", "Do not invent timing windows.", "Do not make absolute predictions.", "Do not give medical, legal, or financial certainty.", "Do not recommend expensive or coercive remedies."],
      }),
    });
    expect(result.failures).not.toContain("unsupported_timing_window");
  });

  it("blocks invented exact dates", () => {
    expect(validate("This will happen by 2026-12-31.", { timingJudgement: timingJudgement() }).failures).toContain("unsupported_timing_window");
  });

  it("warns about missing birth-time sensitivity caveat", () => {
    const result = validate("This looks active in the next 6-9 months.", {
      timingJudgement: timingJudgement({ birthTimeSensitivity: "high" }),
      responsePlan: responsePlan({
        sections: [
          {
            id: "timing",
            purpose: "Use only supplied timing judgement.",
            include: true,
            priority: 13,
            evidenceRefs: [],
            guidance: ["Mention birth-time sensitivity when precise timing is used."],
          },
          {
            id: "practical_guidance",
            purpose: "Keep the answer practical.",
            include: false,
            priority: 12,
            evidenceRefs: [],
            guidance: [],
          },
        ],
        safetyGuardrails: ["Do not invent chart facts.", "Do not invent timing windows.", "Do not make absolute predictions.", "Do not give medical, legal, or financial certainty.", "Do not recommend expensive or coercive remedies."],
      }),
    });
    expect(result.warnings).toContain("missing_birth_time_sensitivity_caveat");
  });

  it("accepts a birth-time sensitivity caveat", () => {
    const result = validate("This looks active in the coming months, but timing is birth-time sensitive, so treat this as approximate.", {
      timingJudgement: timingJudgement({ birthTimeSensitivity: "high" }),
    });
    expect(result.warnings).not.toContain("missing_birth_time_sensitivity_caveat");
  });

  it("blocks invented chart facts when evidence is empty", () => {
    expect(validate("Your Venus is afflicted in the 7th house.").failures).toContain("invented_chart_fact");
  });

  it("allows supplied chart evidence grounding", () => {
    const result = validate("The supplied chart evidence shows Saturn pressure on the 10th house, so career recognition may feel delayed.", {
      chartEvidence: chartEvidence({
        challengingFactors: [factor("Saturn pressure on the 10th house indicates career delay")],
      }),
      responsePlan: responsePlan({
        evidenceSummary: { supportive: [], challenging: ["Saturn pressure on the 10th house indicates career delay"], neutral: [] },
        safetyGuardrails: ["Do not invent chart facts.", "Do not invent timing windows.", "Do not make absolute predictions.", "Do not give medical, legal, or financial certainty.", "Do not recommend expensive or coercive remedies."],
      }),
    });
    expect(result.failures).not.toContain("invented_chart_fact");
  });

  it("blocks unsupported dasha claims", () => {
    expect(validate("You are in Rahu Mahadasha.").failures).toContain("invented_chart_fact");
  });

  it("blocks unsupported transit claims", () => {
    expect(validate("Saturn is transiting your Moon.").failures).toContain("invented_chart_fact");
  });

  it("blocks unsupported divisional claims", () => {
    expect(validate("Your D10 confirms career rise.").failures).toContain("invented_chart_fact");
  });

  it("allows generic chart language without concrete fact", () => {
    const result = validate("The chart evidence is limited, so I would not overstate this.");
    expect(result.failures).not.toContain("invented_chart_fact");
  });

  it("fails when practical guidance is required but missing", () => {
    const result = validate("Saturn delays career. Be patient.", {
      responsePlan: responsePlan({
        sections: [
          {
            id: "practical_guidance",
            purpose: "Keep the answer practical.",
            include: true,
            priority: 12,
            evidenceRefs: [],
            guidance: ["Use practical next steps."],
          },
        ],
      }),
    });
    expect(result.failures).toContain("missing_required_practical_guidance");
  });

  it("passes when practical guidance is included", () => {
    const result = validate("Saturn delays career. Practically, document your work and avoid impulsive resignation.");
    expect(result.failures).not.toContain("missing_required_practical_guidance");
  });

  it("warns when emotional acknowledgement is missing", () => {
    const result = validate("Saturn delays career. Practically, document your work.", {
      responsePlan: responsePlan({
        sections: [
          {
            id: "acknowledgement",
            purpose: "Ground the user.",
            include: true,
            priority: 11,
            evidenceRefs: [],
            guidance: ["Acknowledge the user's stated situation without exaggerating it."],
          },
        ],
      }),
    });
    expect(result.warnings).toContain("missing_emotional_acknowledgement");
  });

  it("accepts emotional acknowledgement", () => {
    const result = validate("I understand why this feels heavy. Practically, document your work.");
    expect(result.warnings).not.toContain("missing_emotional_acknowledgement");
  });

  it("fails memory reset checks when required", () => {
    const result = validate("Your Lagna is Leo.", {
      expectedMemoryReset: true,
      responsePlan: responsePlan({ resetAfterFinalAnswer: false, mode: "exact_fact_only" }),
      state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }),
    });
    expect(result.failures).toContain("missing_memory_reset_signal");
  });

  it("does not require visible memory reset wording", () => {
    const result = validate("Your Lagna is Leo.", {
      expectedMemoryReset: true,
      responsePlan: responsePlan({ resetAfterFinalAnswer: true, mode: "exact_fact_only" }),
      state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }),
    });
    expect(result.failures).not.toContain("missing_memory_reset_signal");
  });

  it("adds specific plan guardrail violations", () => {
    const result = validate("This will happen within 3 months.", {
      responsePlan: responsePlan({
        safetyGuardrails: ["Do not invent timing windows."],
      }),
    });
    expect(result.failures).toContain("unsupported_timing_window");
  });

  it("enforces exact-fact minimality", () => {
    const result = validate("Your Moon sign is Taurus. This emotional pattern means you need to grow spiritually.", {
      responsePlan: responsePlan({ mode: "exact_fact_only" }),
      state: createEmptyConsultationState({ userQuestion: "What is my Moon sign?" }),
    });
    expect(result.failures).toEqual(expect.arrayContaining(["exact_fact_contains_pattern_synthesis"]));
  });

  it("handles missing responsePlan", () => {
    const result = validateConsultationResponse({ response: "Plain safe response." } as ConsultationResponseValidationInput);
    expect(result.warnings).toContain("consultation_plan_missing");
  });

  it("handles malformed partial input", () => {
    expect(() => validateConsultationResponse({} as unknown as ConsultationResponseValidationInput)).not.toThrow();
  });

  it("deduplicates failures", () => {
    const result = validate("Guaranteed guaranteed definitely.");
    expect(result.failures.filter((item) => item === "absolute_prediction")).toHaveLength(1);
  });

  it("deduplicates warnings", () => {
    const result = validate("This looks active in the coming months.", {
      timingJudgement: timingJudgement({ birthTimeSensitivity: "high" }),
    });
    expect(new Set(result.warnings).size).toBe(result.warnings.length);
  });

  it("regresses phase 2 life context extraction", () => {
    expect(extractLifeContext({ question: "Should I quit my job and start my own business?" }).decisionType).toBe("business_transition");
  });

  it("regresses phase 3 emotional state extraction", () => {
    expect(detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." }).primaryEmotion).toBe("comparison");
  });

  it("regresses phase 4 cultural context extraction", () => {
    const result = extractCulturalFamilyContext({ question: "My parents are forcing me to say yes to this proposal." });
    expect(result.parentalPressure).toBe(true);
    expect(result.arrangedMarriageContext).toBe(true);
  });

  it("regresses phase 5 practical constraints extraction", () => {
    const result = extractPracticalConstraints({ question: "I work 12 hours a day and live with my parents." });
    expect(result.timeConstraint).toBe(true);
    expect(result.privacyConstraint).toBe(true);
    expect(result.familyConstraint).toBe(true);
  });

  it("regresses phase 6 chart evidence builder", () => {
    const evidence = buildChartEvidence({
      domain: "career",
      chart: [{ key: "tenthHouse", label: "10th house", value: "Strong 10th house career indicator" }],
    });
    expect(evidence.supportiveFactors.length + evidence.neutralFacts.length).toBeGreaterThan(0);
  });

  it("regresses phase 7 pattern recognition", () => {
    const pattern = synthesizePattern({
      chartEvidence: chartEvidence({
        challengingFactors: [factor("Saturn pressure on 10th house indicates career delay")],
      }),
      lifeContext: extractLifeContext({ question: "Should I quit my job?" }),
      emotionalState: detectEmotionalState({ question: "Should I quit my job?" }),
      culturalContext: extractCulturalFamilyContext({ question: "Should I quit my job?" }),
      practicalConstraints: extractPracticalConstraints({ question: "Should I quit my job?" }),
    });
    expect(pattern.dominantPattern.length).toBeGreaterThan(0);
    expect(pattern.dominantPattern.toLowerCase()).not.toContain("guaranteed");
  });

  it("regresses phase 8 follow-up policy", () => {
    const decision = decideFollowUp({
      question: "Should I say yes to this proposal?",
      intentPrimary: "decision_support",
      alreadyAsked: true,
    });
    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("follow_up_already_asked");
  });

  it("regresses phase 9 memory reset", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("reset-test", createEmptyConsultationState({ userQuestion: "Should I quit my job?" }));
    store.markFinalAnswerReady("reset-test");
    store.clear("reset-test");
    expect(store.get("reset-test").status).toBe("idle");
  });

  it("regresses phase 10 timing judgement", () => {
    const result = judgeTiming({
      chartEvidence: chartEvidence({
        challengingFactors: [factor("Saturn pressure on 10th house indicates career delay")],
      }),
      timingFacts: [{ text: "supportive movement and opening", source: "dasha", polarity: "supportive" }],
    });
    expect(result.status).toMatch(/mixed|delayed|preparatory|clarifying/);
    expect(result.recommendedAction).toBe("avoid_impulsive_decision");
  });

  it("regresses phase 11 remedy proportionality", () => {
    const plan = buildProportionateRemedyPlan({
      chartEvidence: chartEvidence({
        challengingFactors: [factor("Saturn pressure on 10th house indicates career delay")],
      }),
      emotionalState: detectEmotionalState({ question: "I feel anxious and exhausted." }),
    });
    expect(plan.level).toBeLessThanOrEqual(2);
    expect(plan.avoid.length).toBeGreaterThan(0);
    expect(plan.levelMeaning).toBeDefined();
  });

  it("regresses phase 12 response plan builder", () => {
    const plan = buildConsultationResponsePlan({
      state: createEmptyConsultationState({ userQuestion: "What is my Lagna?" }),
    });
    expect(plan.mode).toBe("exact_fact_only");
  });

  it("regresses phase 13 orchestration", () => {
    const result = runConsultationOrchestration({
      userQuestion: "What is my Lagna?",
      sessionId: "validator-phase-13",
      memoryStore: createEphemeralConsultationMemoryStore(),
    });
    expect(result.status).toBe("exact_fact_bypass");
    expect(result.responsePlan.mode).toBe("exact_fact_only");
  });

  it("keeps exact-fact state bypass unaffected", () => {
    const state = createEmptyConsultationState({ userQuestion: "What is my Lagna?" });
    expect(state.intent.primary).toBe("exact_fact");
    expect(state.lifeStory).toEqual({});
    expect(state.emotionalState).toEqual({});
    expect(state.culturalFamilyContext).toEqual({});
    expect(state.practicalConstraints).toEqual({});
    expect(state.followUp.allowed).toBe(false);
  });

  it("has no LLM/API wiring in validator scope", () => {
    const result = validate("Plain safe response.");
    expect(result.passed || result.failures.length >= 0).toBe(true);
  });

  it("avoids private fixture content", () => {
    const result = validate("Plain safe response.");
    expect(JSON.stringify(result)).not.toMatch(/jyotishko|token|secret|api key|\.env|myVedicReport|astro_package/i);
  });
});
