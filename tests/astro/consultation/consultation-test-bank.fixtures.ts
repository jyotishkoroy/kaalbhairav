/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ChartEvidence } from "../../../lib/astro/consultation/chart-evidence-builder";
import type { TimingFact } from "../../../lib/astro/consultation/timing-judgement";

export type ConsultationTestBankCategory =
  | "exact_facts"
  | "career_blockage"
  | "promotion_anxiety"
  | "job_quit_decision"
  | "business_transition"
  | "marriage_delay"
  | "parental_pressure"
  | "specific_proposal"
  | "relationship_confusion"
  | "emotionally_unavailable_partners"
  | "money_stress"
  | "family_duty_conflict"
  | "health_sensitive_question"
  | "sade_sati_fear"
  | "remedy_request"
  | "skeptical_user"
  | "high_anxiety_user"
  | "birth_time_sensitive_prediction";

export type ConsultationTestBankGroup =
  | "extractors"
  | "follow_up_policy"
  | "remedy_proportionality"
  | "timing_judgement"
  | "final_answer_shape"
  | "production_like_consultation";

export type ConsultationScoreDimension =
  | "factAccuracy"
  | "groundedChartReasoning"
  | "lifeContext"
  | "emotionalTone"
  | "culturalContext"
  | "practicalConstraints"
  | "timingJudgement"
  | "remedySafety"
  | "nonFearLanguage"
  | "noHallucinatedChartFacts"
  | "followUpQuality"
  | "memoryReset"
  | "humanConsultationFeel";

export type ConsultationTestBankScenario = {
  readonly id: string;
  readonly group: ConsultationTestBankGroup;
  readonly category: ConsultationTestBankCategory;
  readonly question: string;
  readonly expected: {
    readonly lifeArea?: string;
    readonly primaryEmotion?: string;
    readonly culturalFlags?: readonly string[];
    readonly practicalFlags?: readonly string[];
    readonly followUpShouldAsk?: boolean;
    readonly followUpReason?: string;
    readonly timingStatus?: string;
    readonly timingAction?: string;
    readonly remedyMaxLevel?: number;
    readonly remedyLevel?: number;
    readonly responsePlanMode?: string;
    readonly validatorShouldPass?: boolean;
    readonly memoryShouldReset?: boolean;
  };
  readonly syntheticAnswer?: string;
  readonly tags: readonly string[];
};

type ScenarioSeed = {
  readonly category: ConsultationTestBankCategory;
  readonly questions: readonly string[];
  readonly expected: ConsultationTestBankScenario["expected"];
  readonly tags: readonly string[];
};

const CATEGORY_SEEDS: readonly ScenarioSeed[] = [
  {
    category: "exact_facts",
    questions: [
      "What is my Lagna?",
      "What is my current Mahadasha?",
      "Is Sade Sati active now?",
    ],
    expected: { responsePlanMode: "exact_fact_only", validatorShouldPass: true },
    tags: ["exact_fact", "no_follow_up"],
  },
  {
    category: "career_blockage",
    questions: [
      "I feel stuck in my job. My manager keeps blocking me. Should I leave?",
      "My work is visible but promotion keeps getting delayed. What should I do?",
    ],
    expected: { lifeArea: "career", primaryEmotion: "exhaustion", practicalFlags: ["careerInstability"] },
    tags: ["career", "practical"],
  },
  {
    category: "promotion_anxiety",
    questions: [
      "I am anxious about my promotion and recognition at work.",
      "Will my promotion come this year, or am I overthinking?",
    ],
    expected: { lifeArea: "career", primaryEmotion: "anxiety", practicalFlags: ["careerInstability"] },
    tags: ["career", "anxiety"],
  },
  {
    category: "job_quit_decision",
    questions: [
      "Should I quit my job now?",
      "I want to leave my job, but I am worried about the risk. Should I resign?",
    ],
    expected: { lifeArea: "career", primaryEmotion: "confusion", practicalFlags: ["careerInstability", "riskLow"] },
    tags: ["career", "decision"],
  },
  {
    category: "business_transition",
    questions: [
      "Should I quit my job and start my own business?",
      "I am thinking of moving from employment to business. Is this the right phase?",
    ],
    expected: { lifeArea: "career", primaryEmotion: "hope", practicalFlags: ["careerInstability", "riskMedium"] },
    tags: ["career", "business"],
  },
  {
    category: "marriage_delay",
    questions: [
      "Why is my marriage getting delayed?",
      "Will marriage happen soon, or is the delay telling me something?",
    ],
    expected: { lifeArea: "marriage", primaryEmotion: "anxiety", culturalFlags: ["familyInvolved"] },
    tags: ["marriage", "timing"],
  },
  {
    category: "parental_pressure",
    questions: [
      "My parents are pressuring me to marry, but I do not feel ready.",
      "My family keeps pushing for marriage and I feel trapped.",
    ],
    expected: { lifeArea: "marriage", primaryEmotion: "fear", culturalFlags: ["parentalPressure", "familyInvolved"] },
    tags: ["family", "marriage", "pressure"],
  },
  {
    category: "specific_proposal",
    questions: [
      "Should I say yes to this proposal?",
      "Is this specific proposal worth considering, or should I wait?",
    ],
    expected: { lifeArea: "marriage", primaryEmotion: "confusion", culturalFlags: ["arrangedMarriageContext"] },
    tags: ["proposal", "decision"],
  },
  {
    category: "relationship_confusion",
    questions: [
      "I am confused about my relationship and do not know whether to stay or leave.",
      "Should I continue this relationship or step away?",
    ],
    expected: { lifeArea: "relationship", primaryEmotion: "confusion" },
    tags: ["relationship", "confusion"],
  },
  {
    category: "emotionally_unavailable_partners",
    questions: [
      "I keep attracting emotionally unavailable partners. Why does this happen?",
      "Why do I end up with distant people in relationships?",
    ],
    expected: { lifeArea: "relationship", primaryEmotion: "grief" },
    tags: ["relationship", "distance"],
  },
  {
    category: "money_stress",
    questions: [
      "I am always anxious about money and savings.",
      "Will my finances improve, or do I need to be more cautious?",
    ],
    expected: { lifeArea: "money", primaryEmotion: "anxiety", practicalFlags: ["moneyConstraint", "riskLow"] },
    tags: ["money", "stability"],
  },
  {
    category: "family_duty_conflict",
    questions: [
      "I feel responsible for everyone at home and cannot think about myself.",
      "My family duty is pulling me away from my own career choices.",
    ],
    expected: { lifeArea: "family", primaryEmotion: "exhaustion", culturalFlags: ["familyInvolved", "financialDependents"] },
    tags: ["family", "duty"],
  },
  {
    category: "health_sensitive_question",
    questions: [
      "I am anxious about my health; does my chart show something dangerous?",
      "My sleep has been bad. Can astrology diagnose what is wrong?",
    ],
    expected: { lifeArea: "health", primaryEmotion: "fear", practicalFlags: ["healthConstraint"] },
    tags: ["health", "safety"],
  },
  {
    category: "sade_sati_fear",
    questions: [
      "Is Sade Sati ruining my life?",
      "I am scared of Sade Sati and feel everything is going wrong.",
    ],
    expected: { lifeArea: "general", primaryEmotion: "fear" },
    tags: ["saturn", "fear"],
  },
  {
    category: "remedy_request",
    questions: [
      "What remedy should I do for this problem?",
      "Give me a safe remedy that is not expensive.",
    ],
    expected: { lifeArea: "general", remedyMaxLevel: 2 },
    tags: ["remedy", "safe"],
  },
  {
    category: "skeptical_user",
    questions: [
      "I do not believe in astrology. Explain clearly with evidence.",
      "Can you give a rational explanation without mystical claims?",
    ],
    expected: { lifeArea: "general", primaryEmotion: "comparison" },
    tags: ["skeptical", "evidence"],
  },
  {
    category: "high_anxiety_user",
    questions: [
      "I am panicking and cannot stop thinking about the future.",
      "I feel scared, restless, and overwhelmed about everything.",
    ],
    expected: { lifeArea: "general", primaryEmotion: "fear" },
    tags: ["anxiety", "grounding"],
  },
  {
    category: "birth_time_sensitive_prediction",
    questions: [
      "Can you predict the exact month of career rise from D10?",
      "Tell me the exact timing of marriage from divisional charts.",
    ],
    expected: { lifeArea: "career", primaryEmotion: "confusion", practicalFlags: ["careerInstability"] },
    tags: ["birth_time_sensitive", "timing"],
  },
];

export function syntheticCareerChartEvidence(): ChartEvidence {
  return {
    domain: "career",
    supportiveFactors: [
      {
        factor: "Supplied 10th house career indicator supports responsibility and visibility",
        source: "rashi",
        confidence: "high",
        interpretationHint: "Synthetic career evidence for tests.",
      },
    ],
    challengingFactors: [
      {
        factor: "Supplied Saturn pressure on career indicators can show delay, authority pressure, or slow recognition",
        source: "derived_rule",
        confidence: "medium",
        interpretationHint: "Synthetic career evidence for tests.",
      },
    ],
    neutralFacts: [
      { fact: "Career interpretation should be grounded in supplied 10th house and Saturn evidence", source: "context" },
    ],
    birthTimeSensitivity: "medium",
  };
}

export function syntheticMarriageChartEvidence(): ChartEvidence {
  return {
    domain: "marriage",
    supportiveFactors: [
      {
        factor: "Supplied 7th house relationship indicator supports commitment potential",
        source: "rashi",
        confidence: "high",
        interpretationHint: "Synthetic marriage evidence for tests.",
      },
    ],
    challengingFactors: [
      {
        factor: "Supplied Saturn influence on relationship indicators can show delay or pressure",
        source: "transit",
        confidence: "medium",
        interpretationHint: "Synthetic marriage evidence for tests.",
      },
    ],
    neutralFacts: [
      { fact: "Marriage interpretation should consider 7th house, Venus/Jupiter, and current context", source: "context" },
    ],
    birthTimeSensitivity: "medium",
  };
}

export function syntheticRelationshipChartEvidence(): ChartEvidence {
  return {
    domain: "relationship",
    supportiveFactors: [
      {
        factor: "Supplied Venus relationship indicator supports desire for connection",
        source: "rashi",
        confidence: "medium",
        interpretationHint: "Synthetic relationship evidence for tests.",
      },
    ],
    challengingFactors: [
      {
        factor: "Supplied Moon/Venus pressure can show emotional guardedness in relationships",
        source: "derived_rule",
        confidence: "medium",
        interpretationHint: "Synthetic relationship evidence for tests.",
      },
    ],
    neutralFacts: [],
    birthTimeSensitivity: "medium",
  };
}

export function syntheticMoneyChartEvidence(): ChartEvidence {
  return {
    domain: "money",
    supportiveFactors: [
      {
        factor: "Supplied 11th house income indicator supports earning potential",
        source: "rashi",
        confidence: "medium",
        interpretationHint: "Synthetic money evidence for tests.",
      },
    ],
    challengingFactors: [
      {
        factor: "Supplied 2nd/8th house pressure can show savings volatility or shared-finance stress",
        source: "derived_rule",
        confidence: "medium",
        interpretationHint: "Synthetic money evidence for tests.",
      },
    ],
    neutralFacts: [],
    birthTimeSensitivity: "medium",
  };
}

export function syntheticHealthChartEvidence(): ChartEvidence {
  return {
    domain: "health",
    supportiveFactors: [],
    challengingFactors: [
      {
        factor: "Supplied 6th/12th house stress indicator suggests pressure that should be handled reflectively, not diagnostically",
        source: "derived_rule",
        confidence: "medium",
        interpretationHint: "Synthetic health evidence for tests.",
      },
    ],
    neutralFacts: [
      { fact: "Health-sensitive astrology should not diagnose or replace professional support", source: "context" },
    ],
    birthTimeSensitivity: "high",
  };
}

export function syntheticSadeSatiFearEvidence(): ChartEvidence {
  return {
    domain: "general",
    supportiveFactors: [],
    challengingFactors: [
      {
        factor: "Supplied Saturn/Moon pressure indicates a heavy period requiring patience and structure",
        source: "transit",
        confidence: "medium",
        interpretationHint: "Synthetic Sade Sati evidence for tests.",
      },
    ],
    neutralFacts: [
      { fact: "Sade Sati fear should be handled without fear-based language", source: "context" },
    ],
    birthTimeSensitivity: "medium",
  };
}

export function syntheticBirthTimeSensitiveEvidence(): ChartEvidence {
  return {
    domain: "career",
    supportiveFactors: [
      {
        factor: "Supplied D10 career indicator is birth-time sensitive",
        source: "navamsa",
        confidence: "medium",
        interpretationHint: "Synthetic birth-time-sensitive evidence for tests.",
      },
    ],
    challengingFactors: [
      {
        factor: "Supplied divisional chart evidence requires exact birth-time caution",
        source: "navamsa",
        confidence: "medium",
        interpretationHint: "Synthetic birth-time-sensitive evidence for tests.",
      },
    ],
    neutralFacts: [],
    birthTimeSensitivity: "high",
  };
}

export function syntheticMixedTimingFacts(): readonly TimingFact[] {
  return [
    { label: "supportive opening", source: "dasha", polarity: "supportive", text: "supportive movement and opportunity" },
    { label: "pressure", source: "transit", polarity: "challenging", text: "challenging pressure and caution" },
  ];
}

export function syntheticSupportiveTimingFacts(): readonly TimingFact[] {
  return [
    { label: "supportive opening", source: "dasha", polarity: "supportive", text: "supportive movement and progress" },
    { label: "growth window", source: "transit", polarity: "supportive", text: "active support and opening" },
  ];
}

export function syntheticHeavyTimingFacts(): readonly TimingFact[] {
  return [
    { label: "heavy responsibility", source: "dasha", polarity: "challenging", text: "Saturn responsibility delay structure patience" },
    { label: "slow maturation", source: "transit", polarity: "challenging", text: "heavy duty and slow maturation" },
  ];
}

export function syntheticUnstableTimingFacts(): readonly TimingFact[] {
  return [
    { label: "volatile period", source: "transit", polarity: "challenging", text: "Rahu volatile sudden disruption and reversal" },
    { label: "risky movement", source: "dasha", polarity: "challenging", text: "Mars pressure and risky erratic movement" },
  ];
}

export function syntheticPreparatoryTimingFacts(): readonly TimingFact[] {
  return [
    { label: "groundwork", source: "context", polarity: "neutral", text: "prepare groundwork build foundation backup plan" },
    { label: "skill-building", source: "context", polarity: "neutral", text: "skill-building and documentation" },
  ];
}

export function syntheticSafeAnswerForScenario(scenario: ConsultationTestBankScenario): string {
  const opening =
    scenario.expected.primaryEmotion === "fear" || scenario.expected.primaryEmotion === "anxiety"
      ? "I understand this feels heavy."
      : scenario.expected.primaryEmotion === "exhaustion"
        ? "I hear the strain in this situation."
        : scenario.group === "follow_up_policy"
          ? "This needs a focused consultation."
          : "I can keep this grounded.";

  const evidenceLine =
    scenario.category === "exact_facts"
      ? "Answer only the requested exact fact from deterministic backend data."
      : scenario.category === "health_sensitive_question"
        ? "Health-related astrology should stay reflective and avoid diagnosis or treatment claims."
        : scenario.category === "sade_sati_fear"
          ? "Handle Saturn pressure without fear language and without guarantees."
          : "Use only supplied evidence and keep the guidance practical.";

  const practicalLine =
    scenario.category === "money_stress"
      ? "Keep any next step free or low cost and reduce financial risk."
      : scenario.category === "job_quit_decision" || scenario.category === "business_transition"
        ? "Prefer staged decisions, backup plans, and clear practical constraints."
        : scenario.category === "parental_pressure"
          ? "Balance personal agency with family reality."
          : "The practical next step is to slow the decision and stay specific.";

  const followUp =
    scenario.expected.followUpShouldAsk
      ? "Are you asking about the main decision, or mainly about timing?"
      : "";

  const remedy =
    scenario.group === "remedy_proportionality"
      ? "Any remedy should remain optional, proportional, and affordable."
      : "";

  return [opening, evidenceLine, practicalLine, followUp, remedy].filter(Boolean).join(" ");
}

export const CONSULTATION_TEST_BANK_SCENARIOS: readonly ConsultationTestBankScenario[] = buildConsultationTestBankScenarios();

function buildConsultationTestBankScenarios(): ConsultationTestBankScenario[] {
  const groups: ConsultationTestBankGroup[] = [
    "extractors",
    "follow_up_policy",
    "remedy_proportionality",
    "timing_judgement",
    "final_answer_shape",
    "production_like_consultation",
  ];

  const scenarios: ConsultationTestBankScenario[] = [];
  for (const group of groups) {
    for (let index = 0; index < 50; index += 1) {
      const seed = CATEGORY_SEEDS[index % CATEGORY_SEEDS.length];
      const question = seed.questions[index % seed.questions.length];
      const expected = {
        ...seed.expected,
        ...(group === "follow_up_policy" ? followUpExpectations(seed.category, question) : {}),
        ...(group === "remedy_proportionality" ? remedyExpectations(seed.category) : {}),
        ...(group === "timing_judgement" ? timingExpectations(seed.category) : {}),
        ...(group === "final_answer_shape" ? finalShapeExpectations(seed.category) : {}),
        ...(group === "production_like_consultation" ? productionExpectations(seed.category) : {}),
      };

      scenarios.push({
        id: `${group}-${seed.category}-${index}`,
        group,
        category: seed.category,
        question,
        expected,
        syntheticAnswer: syntheticSafeAnswerForScenario({
          id: `${group}-${seed.category}-${index}`,
          group,
          category: seed.category,
          question,
          expected,
          syntheticAnswer: undefined,
          tags: seed.tags,
        }),
        tags: seed.tags,
      });
    }
  }
  return scenarios;
}

function followUpExpectations(
  category: ConsultationTestBankCategory,
  question: string,
): Partial<ConsultationTestBankScenario["expected"]> {
  if (category === "exact_facts") {
    return { followUpShouldAsk: false, followUpReason: "exact_fact_bypass" };
  }
  if (category === "health_sensitive_question") {
    return { followUpShouldAsk: true, followUpReason: "health_professional_context_missing" };
  }
  if (category === "job_quit_decision") {
    return { followUpShouldAsk: true, followUpReason: "job_switch_motivation_missing" };
  }
  if (category === "business_transition") {
    return { followUpShouldAsk: true, followUpReason: "business_stage_missing" };
  }
  if (category === "specific_proposal") {
    return { followUpShouldAsk: true, followUpReason: "specific_proposal_concern_axis" };
  }
  if (category === "parental_pressure" || category === "family_duty_conflict") {
    return { followUpShouldAsk: true, followUpReason: "family_conflict_axis_missing" };
  }
  if (category === "relationship_confusion" || category === "emotionally_unavailable_partners") {
    return { followUpShouldAsk: true, followUpReason: "relationship_issue_axis_missing" };
  }
  if (category === "marriage_delay") {
    return { followUpShouldAsk: true, followUpReason: "marriage_general_vs_specific_proposal" };
  }
  if (category === "birth_time_sensitive_prediction" || /exact month|D10/i.test(question)) {
    return { followUpShouldAsk: true, followUpReason: "missing_birth_data_for_chart" };
  }
  return { followUpShouldAsk: false };
}

function remedyExpectations(category: ConsultationTestBankCategory): Partial<ConsultationTestBankScenario["expected"]> {
  if (category === "remedy_request") return { remedyMaxLevel: 2, remedyLevel: 2 };
  if (category === "health_sensitive_question") return { remedyMaxLevel: 2, remedyLevel: 1 };
  if (category === "money_stress") return { remedyMaxLevel: 2, remedyLevel: 1 };
  if (category === "sade_sati_fear") return { remedyMaxLevel: 2, remedyLevel: 1 };
  return { remedyMaxLevel: 3, remedyLevel: 1 };
}

function timingExpectations(category: ConsultationTestBankCategory): Partial<ConsultationTestBankScenario["expected"]> {
  if (category === "birth_time_sensitive_prediction") {
    return { timingStatus: "clarifying", timingAction: "seek_more_information" };
  }
  if (category === "sade_sati_fear") {
    return { timingStatus: "heavy", timingAction: "prepare" };
  }
  if (category === "career_blockage" || category === "promotion_anxiety" || category === "job_quit_decision" || category === "business_transition") {
    return { timingStatus: "mixed", timingAction: "avoid_impulsive_decision" };
  }
  if (category === "health_sensitive_question") {
    return { timingStatus: "clarifying", timingAction: "review" };
  }
  return { timingStatus: "supportive", timingAction: "proceed" };
}

function finalShapeExpectations(category: ConsultationTestBankCategory): Partial<ConsultationTestBankScenario["expected"]> {
  if (category === "exact_facts") return { responsePlanMode: "exact_fact_only", validatorShouldPass: true };
  if (category === "health_sensitive_question") return { responsePlanMode: "answer_now", validatorShouldPass: true };
  return { responsePlanMode: "answer_now", validatorShouldPass: true };
}

function productionExpectations(category: ConsultationTestBankCategory): Partial<ConsultationTestBankScenario["expected"]> {
  if (category === "exact_facts") return { responsePlanMode: "exact_fact_only", validatorShouldPass: true, memoryShouldReset: true };
  if (category === "health_sensitive_question") return { memoryShouldReset: true };
  return { memoryShouldReset: true };
}
