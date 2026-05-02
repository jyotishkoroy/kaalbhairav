/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ChartEvidence } from "./chart-evidence-builder";
import type { EmotionalStateResult } from "./emotional-state-detector";
import type { CulturalFamilyContextResult } from "./cultural-context-extractor";
import type { PracticalConstraintResult, RemedyStyle } from "./practical-constraints-extractor";
import type { TimingJudgement } from "./timing-judgement";

export type RemedyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type RemedyLevelMeaning =
  | "none"
  | "behavioral"
  | "light_spiritual"
  | "traditional"
  | "formal_ritual"
  | "gemstone_caution";

export type RemedyType =
  | "behavioral"
  | "lifestyle"
  | "spiritual"
  | "service"
  | "mantra"
  | "ritual"
  | "gemstone_warning";

export type RemedyCost = "free" | "low" | "medium" | "high";

export type RemedyItem = {
  readonly type: RemedyType;
  readonly instruction: string;
  readonly reason: string;
  readonly duration?: string;
  readonly cost: RemedyCost;
  readonly optional: boolean;
};

export type RemedyPlan = {
  readonly level: RemedyLevel;
  readonly levelMeaning: RemedyLevelMeaning;
  readonly remedies: readonly RemedyItem[];
  readonly avoid: readonly string[];
};

export type RemedyProportionalityInput = {
  readonly chartEvidence?: ChartEvidence;
  readonly emotionalState?: EmotionalStateResult;
  readonly culturalContext?: CulturalFamilyContextResult;
  readonly practicalConstraints?: PracticalConstraintResult;
  readonly timingJudgement?: TimingJudgement;
  readonly requestedRemedyType?: "general" | "saturn" | "relationship" | "career" | "money" | "health" | "gemstone" | "unknown";
};

const FORBIDDEN_TEXT_PATTERNS = [
  "guarantee",
  "guaranteed",
  "definitely",
  "certain result",
  "will fix",
  "fix your",
  "cure",
  "diagnosis",
  "treatment",
  "death",
  "remove karma",
  "bad karma",
  "curse",
  "cursed",
  "must do",
  "only remedy",
  "no other way",
  "urgent puja",
  "wear blue sapphire",
  "solve your saturn",
  "fix saturn",
  "guaranteed marriage",
  "guaranteed job",
  "guaranteed wealth",
  "guaranteed health",
];

export function createNoRemedyPlan(reason = "No specific remedy is needed from the supplied context."): RemedyPlan {
  return {
    level: 0,
    levelMeaning: "none",
    remedies: [],
    avoid: uniqueStrings([
      "expensive gemstone recommendation",
      "fear-based ritual",
      "large donation beyond means",
      "remedy dependency",
      reason,
    ]),
  };
}

export function buildProportionateRemedyPlan(input: RemedyProportionalityInput): RemedyPlan {
  const normalized = {
    chartEvidence: input.chartEvidence,
    emotionalState: input.emotionalState,
    culturalContext: input.culturalContext,
    practicalConstraints: input.practicalConstraints,
    timingJudgement: input.timingJudgement,
    requestedRemedyType: input.requestedRemedyType ?? "unknown",
  };

  const contextText = getChartEvidenceText(normalized);
  const chartPressure = hasAny(contextText, [
    "saturn",
    "delay",
    "discipline",
    "responsibility",
    "duty",
    "burden",
    "structure",
    "maturity",
    "heavy",
    "slow",
    "pressure",
    "patience",
    "relationship",
    "marriage",
    "7th",
    "seventh",
    "venus",
    "jupiter",
    "navamsa",
    "commitment",
    "partner",
    "spouse",
    "family pressure",
    "proposal",
    "career",
    "10th",
    "tenth",
    "job",
    "manager",
    "authority",
    "work",
    "promotion",
    "recognition",
    "workplace",
    "money",
    "wealth",
    "savings",
    "debt",
    "income",
    "2nd",
    "11th",
    "expense",
    "leakage",
    "volatility",
    "financial",
    "health",
    "6th",
    "8th",
    "12th",
    "illness",
    "medical",
    "stress",
    "sleep",
    "anxiety",
    "burnout",
    "cannot fast",
    "healthConstraint",
    "gemstone",
  ]);
  const highEmotionalIntensity = hasHighEmotionalIntensity(normalized);
  const severeDistress = Boolean(normalized.emotionalState?.safetyFlags?.includes("suggest_professional_support"));
  const lowReligiousComfort = hasLowReligiousComfort(normalized);
  const highReligiousComfort = hasHighReligiousComfort(normalized);
  const moneyConstraint = hasMoneyConstraint(normalized);
  const timeConstraint = hasTimeConstraint(normalized);
  const privacyConstraint = hasPrivacyConstraint(normalized);
  const healthConstraint = hasHealthConstraint(normalized);
  const lowRiskTolerance = hasLowRiskTolerance(normalized);
  const requestedGemstone = normalized.requestedRemedyType === "gemstone";
  const requestedGeneralPressure = normalized.requestedRemedyType !== "unknown" && normalized.requestedRemedyType !== "general";
  const hasMeaningfulPressure =
    chartPressure ||
    highEmotionalIntensity ||
    moneyConstraint ||
    timeConstraint ||
    privacyConstraint ||
    healthConstraint ||
    lowReligiousComfort ||
    lowRiskTolerance ||
    requestedGeneralPressure ||
    hasTimingPressure(normalized) ||
    severeDistress;

  if (!hasMeaningfulPressure && !requestedGemstone) {
    return createNoRemedyPlan();
  }

  const requestedStyle = inferRequestedRemedyStyle(normalized);
  const baseLevel = chooseBaseLevel(normalized, {
    chartPressure,
    highEmotionalIntensity,
    severeDistress,
    highReligiousComfort,
    lowReligiousComfort,
    moneyConstraint,
    timeConstraint,
    privacyConstraint,
    healthConstraint,
    lowRiskTolerance,
    requestedGemstone,
    requestedStyle,
  });

  const generated = buildRemediesForLevel(baseLevel, normalized, {
    chartPressure,
    highReligiousComfort,
    severeDistress,
    lowReligiousComfort,
    moneyConstraint,
    timeConstraint,
    privacyConstraint,
    healthConstraint,
    lowRiskTolerance,
    requestedGemstone,
    requestedStyle,
  });

  const avoid = buildAvoidList(normalized, {
    chartPressure,
    highEmotionalIntensity,
    highReligiousComfort,
    severeDistress,
    lowReligiousComfort,
    moneyConstraint,
    timeConstraint,
    privacyConstraint,
    healthConstraint,
    lowRiskTolerance,
    requestedGemstone,
    requestedStyle,
  });

  return sanitizeRemedyPlan(
    {
      level: baseLevel,
      levelMeaning: levelMeaningFor(baseLevel),
      remedies: generated,
      avoid,
    },
    normalized,
  );
}

export function sanitizeRemedyPlan(plan: RemedyPlan, input: RemedyProportionalityInput): RemedyPlan {
  const moneyConstraint = hasMoneyConstraint(input);
  const privacyConstraint = hasPrivacyConstraint(input);
  const healthConstraint = hasHealthConstraint(input);
  const lowReligiousComfort = hasLowReligiousComfort(input);
  const requestedStyle = inferRequestedRemedyStyle(input);
  const avoidRitual = requestedStyle === "behavioral" || requestedStyle === "avoid_ritual";
  const requestedGemstone = input.requestedRemedyType === "gemstone";

  let remedies = plan.remedies
    .filter((remedy) => remedy.cost !== "high")
    .filter((remedy) => !(moneyConstraint && (remedy.cost === "medium" || remedy.cost === "high")))
    .filter((remedy) => !(lowReligiousComfort && ["mantra", "ritual", "spiritual"].includes(remedy.type)))
    .filter((remedy) => !(avoidRitual && ["mantra", "ritual", "spiritual"].includes(remedy.type)))
    .filter((remedy) => !(privacyConstraint && /public|openly|temple|lamp|chant aloud/i.test(remedy.instruction)))
    .filter((remedy) => !(healthConstraint && /fast|fasting|austerity|sleep deprivation/i.test(remedy.instruction)))
    .map((remedy) => ({
      ...remedy,
      optional: true,
      instruction: sanitizeForbiddenLanguage(remedy.instruction),
      reason: sanitizeForbiddenLanguage(remedy.reason),
    }))
    .filter((remedy) => !(requestedGemstone && remedy.type !== "gemstone_warning"));

  let level = plan.level;
  let levelMeaning = plan.levelMeaning;

  if (requestedGemstone) {
    level = 5;
    levelMeaning = "gemstone_caution";
    remedies = [
      {
        type: "gemstone_warning",
        instruction:
          "Do not buy or wear an expensive gemstone casually; consider it only after full chart verification from a qualified astrologer and practical affordability checks.",
        reason: "Gemstones can be costly and should never be treated as a guaranteed fix.",
        cost: "free",
        optional: true,
      },
    ];
  } else if (level > 0 && remedies.length === 0) {
    level = 1;
    levelMeaning = "behavioral";
    remedies = [behavioralRemedies()[0]];
  }

  if (level === 4 && !remedies.some((item) => item.type === "ritual")) {
    level = 3;
    levelMeaning = "traditional";
  }
  if (level === 5 && !remedies.some((item) => item.type === "gemstone_warning")) {
    remedies = [
      {
        type: "gemstone_warning",
        instruction:
          "Do not buy or wear an expensive gemstone casually; consider it only after full chart verification from a qualified astrologer and practical affordability checks.",
        reason: "Gemstones can be costly and should never be treated as a guaranteed fix.",
        cost: "free",
        optional: true,
      },
    ];
  }

  return {
    level,
    levelMeaning,
    remedies: remedies.map((remedy) => ({
      ...remedy,
      optional: true,
      instruction: sanitizeForbiddenLanguage(remedy.instruction),
      reason: sanitizeForbiddenLanguage(remedy.reason),
    })),
    avoid: uniqueStrings(plan.avoid.map((item) => sanitizeForbiddenLanguage(item)).concat(extraAvoids(input))),
  };
}

function buildRemediesForLevel(
  level: RemedyLevel,
  input: RemedyProportionalityInput,
  flags: {
    readonly chartPressure: boolean;
    readonly highReligiousComfort: boolean;
    readonly severeDistress: boolean;
    readonly lowReligiousComfort: boolean;
    readonly moneyConstraint: boolean;
    readonly timeConstraint: boolean;
    readonly privacyConstraint: boolean;
    readonly healthConstraint: boolean;
    readonly lowRiskTolerance: boolean;
    readonly requestedGemstone: boolean;
    readonly requestedStyle: RemedyStyle;
  },
): RemedyItem[] {
  if (flags.requestedGemstone) {
    return [
      {
        type: "gemstone_warning",
        instruction:
          "Do not buy or wear an expensive gemstone casually; consider it only after full chart verification from a qualified astrologer and practical affordability checks.",
        reason: "Gemstones can be costly and should never be treated as a guaranteed fix.",
        cost: "free",
        optional: true,
      },
    ];
  }

  const behavioral = behavioralRemedies(input);
  const spiritual = spiritualRemedies(flags.highReligiousComfort || input.culturalContext?.religiousComfort === "high");
  const traditional = traditionalRemedies();
  const formal = formalRemedies();

  if (level <= 0) return [];
  if (level === 1 || flags.requestedStyle === "behavioral" || flags.lowReligiousComfort) {
    return uniqueRemedies([...behavioral.slice(0, 2), ...behavioral.slice(4, 5)]);
  }
  if (level === 2 || flags.requestedStyle === "light_spiritual" || flags.moneyConstraint || flags.timeConstraint || flags.privacyConstraint || flags.healthConstraint || flags.lowRiskTolerance) {
    return uniqueRemedies([...behavioral.slice(0, 1), ...spiritual.slice(0, 2)]);
  }
  if (level === 3 || flags.requestedStyle === "traditional") {
    return uniqueRemedies([...behavioral.slice(0, 1), ...spiritual.slice(0, 2), ...traditional.slice(0, 1)]);
  }
  if (level === 4) {
    return uniqueRemedies([...behavioral.slice(0, 1), ...spiritual.slice(0, 2), ...traditional.slice(0, 1), ...formal.slice(0, 1)]);
  }
  return [];
}

function behavioralRemedies(input?: RemedyProportionalityInput): RemedyItem[] {
  const items: RemedyItem[] = [
    {
      type: "behavioral",
      instruction: "For the next 8 Saturdays, complete one pending responsibility before starting something new.",
      reason: "Saturn themes are best handled through discipline, completion, responsibility, and patience.",
      duration: "8 Saturdays",
      cost: "free",
      optional: true,
    },
    {
      type: "behavioral",
      instruction: "Write one page separating facts, fears, and next practical steps before making the decision.",
      reason: "This reduces emotional overloading and supports clearer judgement.",
      duration: "3 to 7 days",
      cost: "free",
      optional: true,
    },
    {
      type: "behavioral",
      instruction: "Set one calm boundary conversation with a clear timeline instead of deciding under pressure.",
      reason: "This keeps family or relationship pressure from becoming the sole reason for action.",
      duration: "once, then review",
      cost: "free",
      optional: true,
    },
    {
      type: "lifestyle",
      instruction: "Keep a simple sleep and wake routine for one week before making high-stakes decisions.",
      reason: "A steadier body rhythm supports calmer judgement during stressful periods.",
      duration: "7 days",
      cost: "free",
      optional: true,
    },
  ];

  if (input && hasRelationshipPressure(input)) {
    items.push({
      type: "service",
      instruction: "Use one calm boundary conversation to set a respectful timeline instead of making the decision under family pressure.",
      reason: "Relationship pressure is safer to handle through boundaries and clarity than through urgency.",
      duration: "once, then review",
      cost: "free",
      optional: true,
    });
  }

  return items;
}

function spiritualRemedies(comfortable: boolean): RemedyItem[] {
  if (!comfortable) return [];
  return [
    {
      type: "mantra",
      instruction: "If you are comfortable with mantra, repeat a simple calming prayer or mantra quietly for 5 minutes.",
      reason: "A short spiritual practice can steady attention without creating ritual pressure.",
      duration: "5 minutes daily or as comfortable",
      cost: "free",
      optional: true,
    },
    {
      type: "service",
      instruction: "Do one small act of service or charity within your means, without stretching your budget.",
      reason: "Service keeps the remedy grounded, humble, and proportionate.",
      duration: "weekly if possible",
      cost: "low",
      optional: true,
    },
  ];
}

function traditionalRemedies(): RemedyItem[] {
  return [
    {
      type: "spiritual",
      instruction: "If this fits your faith, keep one simple weekly prayer routine without making it expensive or fear-based.",
      reason: "Traditional practice is safest when it supports steadiness rather than fear or dependency.",
      duration: "weekly",
      cost: "free",
      optional: true,
    },
  ];
}

function formalRemedies(): RemedyItem[] {
  return [
    {
      type: "ritual",
      instruction: "If you already trust a family tradition or priest, consider only a modest, transparent ritual that stays within your means.",
      reason: "Formal rituals should remain optional, affordable, and free from fear pressure.",
      duration: "one-time only if comfortable",
      cost: "medium",
      optional: true,
    },
  ];
}

function buildAvoidList(
  input: RemedyProportionalityInput,
  flags: {
    readonly chartPressure: boolean;
    readonly highEmotionalIntensity: boolean;
    readonly severeDistress: boolean;
    readonly highReligiousComfort: boolean;
    readonly lowReligiousComfort: boolean;
    readonly moneyConstraint: boolean;
    readonly timeConstraint: boolean;
    readonly privacyConstraint: boolean;
    readonly healthConstraint: boolean;
    readonly lowRiskTolerance: boolean;
    readonly requestedGemstone: boolean;
    readonly requestedStyle: RemedyStyle;
  },
): string[] {
  const avoid = [
    "expensive gemstone recommendation",
    "fear-based ritual",
    "large donation beyond means",
    "remedy dependency",
  ];

  if (flags.moneyConstraint) {
    avoid.push("paid remedy pressure", "expensive puja", "large donation beyond means", "expensive gemstone purchase");
  }
  if (flags.timeConstraint) {
    avoid.push("complex daily ritual", "long-distance temple travel");
  }
  if (flags.privacyConstraint) {
    avoid.push("visible ritual that compromises privacy", "loud or public practice");
  }
  if (flags.healthConstraint) {
    avoid.push("extreme fasting", "medical replacement claims");
  }
  if (flags.highEmotionalIntensity) {
    avoid.push("fear-based Saturn language", "urgent ritual pressure");
  }
  if (flags.lowReligiousComfort || flags.requestedStyle === "avoid_ritual") {
    avoid.push("ritual pressure", "devotional practice framed as compulsory");
  }
  if (flags.requestedGemstone) {
    avoid.push("casual gemstone recommendation", "gemstone certainty", "expensive gemstone purchase without full verification");
  }
  if (flags.lowRiskTolerance) {
    avoid.push("high-cost escalation", "pressure to take risk through ritual");
  }
  if (flags.chartPressure && flags.highReligiousComfort) {
    avoid.push("ritual dependency");
  }
  if (input.requestedRemedyType === "health") {
    avoid.push("health diagnosis claims", "health cure claims");
  }
  return uniqueStrings(avoid.map((item) => sanitizeForbiddenLanguage(item)));
}

function getChartEvidenceText(input: RemedyProportionalityInput): string {
  const chartEvidence = input.chartEvidence;
  if (!chartEvidence) return "";
  return [
    chartEvidence.domain,
    ...chartEvidence.supportiveFactors.map((factor) => factor.factor),
    ...chartEvidence.challengingFactors.map((factor) => factor.factor),
    ...chartEvidence.neutralFacts.map((fact) => fact.fact),
    input.timingJudgement?.currentPeriodMeaning ?? "",
    ...(input.timingJudgement?.reasoning ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}

function hasSaturnPressure(input: RemedyProportionalityInput): boolean {
  return hasAny(getChartEvidenceText(input), ["saturn", "delay", "discipline", "responsibility", "duty", "burden", "structure", "maturity", "heavy", "slow", "pressure", "patience"]);
}

function hasRelationshipPressure(input: RemedyProportionalityInput): boolean {
  return hasAny(getChartEvidenceText(input), ["relationship", "marriage", "7th", "seventh", "venus", "jupiter", "navamsa", "commitment", "partner", "spouse", "family pressure", "proposal"]);
}

function hasCareerPressure(input: RemedyProportionalityInput): boolean {
  return hasAny(getChartEvidenceText(input), ["career", "10th", "tenth", "job", "manager", "authority", "work", "promotion", "recognition", "workplace"]);
}

function hasMoneyPressure(input: RemedyProportionalityInput): boolean {
  return hasAny(getChartEvidenceText(input), ["money", "wealth", "savings", "debt", "income", "2nd", "11th", "expense", "leakage", "volatility", "financial"]);
}

function hasHealthSensitivity(input: RemedyProportionalityInput): boolean {
  return hasAny(getChartEvidenceText(input), ["health", "6th", "8th", "12th", "illness", "medical", "stress", "sleep", "anxiety", "burnout", "cannot fast"]) || hasHealthConstraint(input);
}

function hasHighEmotionalIntensity(input: RemedyProportionalityInput): boolean {
  const emotional = input.emotionalState;
  return Boolean(emotional && (emotional.intensity === "high" || emotional.primaryEmotion === "fear" || emotional.primaryEmotion === "anxiety" || emotional.primaryEmotion === "grief" || emotional.primaryEmotion === "exhaustion"));
}

function hasLowReligiousComfort(input: RemedyProportionalityInput): boolean {
  return input.culturalContext?.religiousComfort === "low" || input.practicalConstraints?.remedyStyle === "avoid_ritual";
}

function hasHighReligiousComfort(input: RemedyProportionalityInput): boolean {
  return input.culturalContext?.religiousComfort === "high";
}

function hasMoneyConstraint(input: RemedyProportionalityInput): boolean {
  return input.practicalConstraints?.moneyConstraint === true;
}

function hasTimeConstraint(input: RemedyProportionalityInput): boolean {
  return input.practicalConstraints?.timeConstraint === true;
}

function hasPrivacyConstraint(input: RemedyProportionalityInput): boolean {
  return input.practicalConstraints?.privacyConstraint === true;
}

function hasHealthConstraint(input: RemedyProportionalityInput): boolean {
  return input.practicalConstraints?.healthConstraint === true;
}

function hasLowRiskTolerance(input: RemedyProportionalityInput): boolean {
  return input.practicalConstraints?.riskTolerance === "low";
}

function inferRequestedRemedyStyle(input: RemedyProportionalityInput): RemedyStyle {
  return input.practicalConstraints?.remedyStyle ?? "unknown";
}

function chooseBaseLevel(
  input: RemedyProportionalityInput,
  flags: {
    readonly chartPressure: boolean;
    readonly highEmotionalIntensity: boolean;
    readonly severeDistress: boolean;
    readonly highReligiousComfort: boolean;
    readonly lowReligiousComfort: boolean;
    readonly moneyConstraint: boolean;
    readonly timeConstraint: boolean;
    readonly privacyConstraint: boolean;
    readonly healthConstraint: boolean;
    readonly lowRiskTolerance: boolean;
    readonly requestedGemstone: boolean;
    readonly requestedStyle: RemedyStyle;
  },
): RemedyLevel {
  if (flags.requestedGemstone) return 5;
  if (flags.severeDistress) return 1;

  const explicitFormal = input.requestedRemedyType === "general" || flags.requestedStyle === "traditional";
  const strongPressure = flags.chartPressure || hasTimingPressure(input);

  if (!strongPressure && !flags.highEmotionalIntensity && !flags.moneyConstraint && !flags.timeConstraint && !flags.privacyConstraint && !flags.healthConstraint && !flags.lowReligiousComfort && !flags.lowRiskTolerance) {
    return 0;
  }

  if (flags.lowReligiousComfort || flags.requestedStyle === "behavioral") return 1;
  if (flags.highEmotionalIntensity || flags.moneyConstraint || flags.timeConstraint || flags.privacyConstraint || flags.healthConstraint || flags.requestedStyle === "light_spiritual" || flags.lowRiskTolerance) return 2;
  if (flags.requestedStyle === "avoid_ritual") return 1;
  if (flags.highReligiousComfort && flags.requestedStyle === "traditional" && !flags.moneyConstraint && !flags.timeConstraint && !flags.privacyConstraint && !flags.healthConstraint && !flags.highEmotionalIntensity) {
    return explicitFormal && strongPressure ? 3 : 2;
  }
  if (flags.highReligiousComfort && strongPressure && !flags.moneyConstraint && !flags.timeConstraint && !flags.privacyConstraint && !flags.healthConstraint && !flags.highEmotionalIntensity) {
    return 3;
  }
  if (flags.chartPressure && flags.highReligiousComfort && !flags.moneyConstraint && !flags.timeConstraint && !flags.privacyConstraint && !flags.healthConstraint && !flags.highEmotionalIntensity) {
    return 3;
  }
  return 1;
}

function hasTimingPressure(input: RemedyProportionalityInput): boolean {
  const timing = input.timingJudgement;
  if (!timing) return false;
  return timing.status === "heavy" || timing.status === "unstable" || timing.status === "delayed" || timing.status === "mixed" || timing.recommendedAction === "avoid_impulsive_decision";
}

function levelMeaningFor(level: RemedyLevel): RemedyLevelMeaning {
  switch (level) {
    case 0:
      return "none";
    case 1:
      return "behavioral";
    case 2:
      return "light_spiritual";
    case 3:
      return "traditional";
    case 4:
      return "formal_ritual";
    case 5:
      return "gemstone_caution";
  }
}

function sanitizeForbiddenLanguage(text: string): string {
  let output = String(text ?? "").replace(/\s+/g, " ").trim();
  for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    output = output.replace(regex, "cautious option");
  }
  return output;
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => sanitizeForbiddenLanguage(value)).filter((value) => value.length > 0)));
}

function uniqueRemedies(items: readonly RemedyItem[]): RemedyItem[] {
  const seen = new Set<string>();
  const output: RemedyItem[] = [];
  for (const item of items) {
    const key = `${item.type}|${item.instruction}|${item.reason}|${item.duration ?? ""}|${item.cost}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...item, optional: true, instruction: sanitizeForbiddenLanguage(item.instruction), reason: sanitizeForbiddenLanguage(item.reason) });
  }
  return output;
}

function extraAvoids(input: RemedyProportionalityInput): string[] {
  const extras: string[] = [];
  if (hasSaturnPressure(input)) extras.push("fear-based Saturn language");
  if (hasRelationshipPressure(input)) extras.push("marriage certainty");
  if (hasCareerPressure(input)) extras.push("career resignation pressure");
  if (hasMoneyPressure(input)) extras.push("financial certainty");
  if (hasHealthSensitivity(input)) extras.push("health replacement claims");
  return extras;
}
