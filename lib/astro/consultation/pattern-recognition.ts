/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ChartEvidence } from "./chart-evidence-builder";
import type { EmotionalStateResult } from "./emotional-state-detector";
import type { CulturalFamilyContextResult } from "./cultural-context-extractor";
import type { LifeContextExtraction } from "./life-context-extractor";
import type { PracticalConstraintResult } from "./practical-constraints-extractor";
import type { ConsultationConfidence } from "./consultation-types";

export type PatternRecognitionInput = {
  readonly chartEvidence: ChartEvidence;
  readonly lifeContext: LifeContextExtraction;
  readonly emotionalState: EmotionalStateResult;
  readonly culturalContext: CulturalFamilyContextResult;
  readonly practicalConstraints: PracticalConstraintResult;
};

export type PatternRecognitionPattern = {
  readonly summary: string;
  readonly evidence: readonly string[];
};

export type PatternRecognitionMixedSignal = {
  readonly promise: string;
  readonly blockage: string;
  readonly synthesis: string;
};

export type PatternRecognitionSynthesisResult = {
  readonly dominantPattern: string;
  readonly likelyLifeExpression: string;
  readonly supportivePattern?: PatternRecognitionPattern;
  readonly challengingPattern?: PatternRecognitionPattern;
  readonly mixedSignal?: PatternRecognitionMixedSignal;
  readonly growthDirection: string;
  readonly confidence: ConsultationConfidence;
};

type PatternCandidate = {
  readonly id: string;
  readonly score: number;
  readonly dominantPattern: string;
  readonly likelyLifeExpression: string;
  readonly supportivePattern?: PatternRecognitionPattern;
  readonly challengingPattern?: PatternRecognitionPattern;
  readonly mixedSignal?: PatternRecognitionMixedSignal;
  readonly growthDirection: string;
  readonly confidence: ConsultationConfidence;
};

const DEFAULT_RESULT: PatternRecognitionSynthesisResult = {
  dominantPattern: "insufficient evidence for a specific consultation pattern",
  likelyLifeExpression: "The available context is too limited to identify a specific repeating pattern without overclaiming.",
  growthDirection: "Use this as a prompt for clearer context rather than a fixed conclusion.",
  confidence: "low",
};

export function synthesizePattern(input: PatternRecognitionInput): PatternRecognitionSynthesisResult {
  const supportiveEvidence = getSupportiveEvidence(input.chartEvidence);
  const challengingEvidence = getChallengingEvidence(input.chartEvidence);
  const neutralEvidence = getNeutralEvidence(input.chartEvidence);
  const normalizedBundle = buildNormalizedBundle(input, supportiveEvidence, challengingEvidence, neutralEvidence);

  if (
    input.chartEvidence.domain === "career" &&
    hasContextContaining(normalizedBundle.lifeText, ["user feels blocked at work", "blocked at work"]) &&
    challengingEvidence.length > 0
  ) {
    return assertNoDeterministicLanguage({
      dominantPattern: "authority conflict blocking recognition",
      likelyLifeExpression: "This may show up as feeling capable but dependent on approval from a manager, senior, or institution.",
      challengingPattern: {
        summary: "Recognition appears constrained by authority pressure or hierarchical friction.",
        evidence: clampEvidenceList(challengingEvidence),
      },
      growthDirection: "Shift from seeking approval from one authority figure to building visible proof, wider sponsorship, and fallback options.",
      confidence: inferPatternConfidence(input, "medium"),
    });
  }

  const blockageDominates =
    input.chartEvidence.domain === "career" &&
    hasContextContaining(normalizedBundle.lifeText, ["career blockage", "blocked", "manager", "authority"]);
  if (blockageDominates && supportiveEvidence.length > 0 && challengingEvidence.length > 0) {
    return assertNoDeterministicLanguage({
      dominantPattern: "career growth through pressure, responsibility, and structured visibility",
      likelyLifeExpression:
        "One possible expression is that professional growth may come through responsibility, authority pressure, and the need to make work visible rather than waiting for effortless recognition.",
      supportivePattern: {
        summary: "Career evidence suggests potential for growth, visibility, responsibility, or professional development.",
        evidence: clampEvidenceList(supportiveEvidence),
      },
      challengingPattern: {
        summary: "Career evidence and life context suggest pressure, delay, authority friction, or blocked recognition.",
        evidence: clampEvidenceList(challengingEvidence),
      },
      mixedSignal: {
        promise: "career visibility is possible",
        blockage: "recognition may be delayed or filtered through pressure, hierarchy, or authority conflict",
        synthesis: "growth is better pursued through structure, documented work, and leverage rather than impulsive rebellion",
      },
      growthDirection: "Build visibility, document contributions, and create leverage before making irreversible career decisions.",
      confidence: inferPatternConfidence(input, "high"),
    });
  }

  if (
    blockageDominates &&
    challengingEvidence.length > 0 &&
    supportiveEvidence.length > 0 &&
    hasContextContaining(normalizedBundle.lifeText, ["user feels blocked at work", "blocked at work", "current situation"])
  ) {
    return assertNoDeterministicLanguage({
      dominantPattern: "authority conflict blocking recognition",
      likelyLifeExpression: "This may show up as feeling capable but dependent on approval from a manager, senior, or institution.",
      challengingPattern: {
        summary: "Recognition appears constrained by authority pressure or hierarchical friction.",
        evidence: clampEvidenceList(challengingEvidence),
      },
      growthDirection: "Shift from seeking approval from one authority figure to building visible proof, wider sponsorship, and fallback options.",
      confidence: inferPatternConfidence(input, "medium"),
    });
  }

  const candidates = [
    scoreCareerGrowthThroughPressure(input, normalizedBundle),
    scoreAuthorityConflict(input, normalizedBundle),
    scoreMarriagePressureVsReadiness(input, normalizedBundle),
    scoreUnavailablePartners(input, normalizedBundle),
    scoreDecisionParalysis(input, normalizedBundle),
    scoreFamilyDutyVsDesire(input, normalizedBundle),
    scoreMoneyRetention(input, normalizedBundle),
    scoreFearOfVisibility(input, normalizedBundle),
    scoreSpiritualGrowthMaterialInstability(input, normalizedBundle),
    scoreSuddenCareerStartsStops(input, normalizedBundle),
  ]
    .filter((candidate): candidate is PatternCandidate => Boolean(candidate))
    .sort((a, b) => b.score - a.score);

  const selected = candidates[0];
  if (!selected) return DEFAULT_RESULT;

  return assertNoDeterministicLanguage({
    dominantPattern: sanitizePatternText(selected.dominantPattern),
    likelyLifeExpression: sanitizePatternText(selected.likelyLifeExpression),
    supportivePattern: selected.supportivePattern ? sanitizePatternPattern(selected.supportivePattern) : undefined,
    challengingPattern: selected.challengingPattern ? sanitizePatternPattern(selected.challengingPattern) : undefined,
    mixedSignal: selected.mixedSignal ? sanitizeMixedSignal(selected.mixedSignal) : undefined,
    growthDirection: sanitizePatternText(selected.growthDirection),
    confidence: selected.confidence,
  });
}

export function getSupportiveEvidence(chartEvidence: ChartEvidence): string[] {
  return chartEvidence.supportiveFactors.map((factor) => factor.factor);
}

export function getChallengingEvidence(chartEvidence: ChartEvidence): string[] {
  return chartEvidence.challengingFactors.map((factor) => factor.factor);
}

export function getNeutralEvidence(chartEvidence: ChartEvidence): string[] {
  return chartEvidence.neutralFacts.map((fact) => fact.fact);
}

function scoreCareerGrowthThroughPressure(
  input: PatternRecognitionInput,
  bundle: NormalizedBundle,
): PatternCandidate | undefined {
  const domain = input.chartEvidence.domain === "career";
  const supportive = hasEvidenceContaining(bundle.supportiveEvidence, ["career", "10th", "sun", "jupiter", "growth", "gains", "authority", "visibility", "support"]);
  const challenging = hasEvidenceContaining(bundle.challengingEvidence, ["saturn", "pressure", "delay", "blocked", "authority", "10th", "manager", "challenge"]);
  const lifeMatch =
    hasContextContaining(bundle.lifeText, ["career blockage", "blocked", "manager", "authority", "job switch"]) ||
    hasContextContaining(bundle.lifeText, ["promotion anxiety"]);

  const score = (domain ? 1 : 0) + countMatches([supportive, challenging, lifeMatch]);
  if (score < 3) return undefined;

  const mixed = createMixedSignal(
    supportive,
    challenging,
    "career visibility is possible",
    "recognition may be delayed or filtered through pressure, hierarchy, or authority conflict",
    "growth is better pursued through structure, documented work, and leverage rather than impulsive rebellion",
  );

  return {
    id: "career_pressure",
    score,
    dominantPattern: "career growth through pressure, responsibility, and structured visibility",
    likelyLifeExpression:
      "One possible expression is that professional growth may come through responsibility, authority pressure, and the need to make work visible rather than waiting for effortless recognition.",
    supportivePattern: supportive
      ? {
          summary: "Career evidence suggests potential for growth, visibility, responsibility, or professional development.",
          evidence: clampEvidenceList(filterEvidence(bundle.supportiveEvidence, ["career", "10th", "sun", "jupiter", "growth", "gains", "authority", "visibility", "support"])),
        }
      : undefined,
    challengingPattern: challenging
      ? {
          summary: "Career evidence and life context suggest pressure, delay, authority friction, or blocked recognition.",
          evidence: clampEvidenceList(filterEvidence(bundle.challengingEvidence, ["saturn", "pressure", "delay", "blocked", "authority", "10th", "manager", "challenge"])),
        }
      : undefined,
    mixedSignal: mixed,
    growthDirection: "Build visibility, document contributions, and create leverage before making irreversible career decisions.",
    confidence: inferPatternConfidence(input, supportive && challenging && lifeMatch ? "high" : "medium"),
  };
}

function scoreAuthorityConflict(input: PatternRecognitionInput, bundle: NormalizedBundle): PatternCandidate | undefined {
  const lifeMatch = hasContextContaining(bundle.lifeText, ["manager", "boss", "blocked", "promotion"]);
  const chartMatch = hasEvidenceContaining(bundle.challengingEvidence, ["sun", "saturn", "10th", "authority", "pressure", "delay", "blocked"]);
  const score = countMatches([lifeMatch, chartMatch]);
  if (score < 2) return undefined;

  return {
    id: "authority_conflict",
    score: score + 2,
    dominantPattern: "authority conflict blocking recognition",
    likelyLifeExpression: "This may show up as feeling capable but dependent on approval from a manager, senior, or institution.",
    challengingPattern: {
      summary: "Recognition appears constrained by authority pressure or hierarchical friction.",
      evidence: clampEvidenceList(filterEvidence(bundle.challengingEvidence, ["sun", "saturn", "10th", "authority", "pressure", "delay", "blocked"])),
    },
    growthDirection: "Shift from seeking approval from one authority figure to building visible proof, wider sponsorship, and fallback options.",
    confidence: inferPatternConfidence(input, score >= 3 ? "high" : "medium"),
  };
}

function scoreMarriagePressureVsReadiness(input: PatternRecognitionInput, bundle: NormalizedBundle): PatternCandidate | undefined {
  const lifeMatch = bundle.lifeArea === "marriage" || hasContextContaining(bundle.lifeText, ["proposal", "marriage", "say yes", "not ready"]);
  const culturalMatch = input.culturalContext.parentalPressure || input.culturalContext.arrangedMarriageContext;
  const emotionalPressure = hasAny(bundle.emotionText, ["fear", "anxiety", "confusion", "exhaustion"]);
  const supportive = hasEvidenceContaining(bundle.supportiveEvidence, ["marriage", "relationship", "venus", "jupiter", "partnership"]);
  const challenging = hasEvidenceContaining(bundle.challengingEvidence, ["saturn", "pressure", "delay", "relationship", "distance", "guarded", "blocked"]);
  const score = countMatches([lifeMatch, culturalMatch, emotionalPressure, supportive, challenging]);
  if (score < 3) return undefined;

  const mixed = createMixedSignal(
    supportive,
    challenging || culturalMatch || emotionalPressure,
    "partnership may be a meaningful area of focus",
    "pressure or unreadiness may distort the decision",
    "the healthier path is to slow the decision enough to separate genuine compatibility from fear, urgency, or family pressure",
  );

  return {
    id: "marriage_readiness",
    score,
    dominantPattern: "marriage pressure versus emotional readiness",
    likelyLifeExpression: "One possible expression is feeling pulled between family expectations and inner readiness, where the decision feels heavier than the relationship itself.",
    supportivePattern: supportive
      ? {
          summary: "Relationship evidence may support taking partnership seriously.",
          evidence: clampEvidenceList(filterEvidence(bundle.supportiveEvidence, ["marriage", "relationship", "venus", "jupiter", "partnership"])),
        }
      : undefined,
    challengingPattern: {
      summary: "Context suggests pressure, uncertainty, delay, or fear around commitment.",
      evidence: clampEvidenceList(uniqueStrings([
        ...filterEvidence(bundle.challengingEvidence, ["saturn", "pressure", "delay", "relationship", "distance", "guarded", "blocked"]),
        ...(culturalMatch ? ["family pressure"] : []),
        ...(emotionalPressure ? [input.emotionalState.primaryEmotion] : []),
      ])),
    },
    mixedSignal: mixed,
    growthDirection: "Clarify readiness, compatibility, and family boundaries before treating pressure as a reason to commit.",
    confidence: inferPatternConfidence(input, supportive && (culturalMatch || emotionalPressure) ? "high" : "medium"),
  };
}

function scoreUnavailablePartners(input: PatternRecognitionInput, bundle: NormalizedBundle): PatternCandidate | undefined {
  const lifeMatch = hasContextContaining(bundle.lifeText, ["emotionally unavailable", "distant partners", "unavailable partners", "unavailable"]);
  const relationDomain = input.chartEvidence.domain === "relationship" || input.chartEvidence.domain === "marriage";
  const challenging = hasEvidenceContaining(bundle.challengingEvidence, ["saturn", "venus", "moon", "rahu", "ketu", "delay", "distance", "pressure", "relationship"]);
  const score = countMatches([lifeMatch, relationDomain, challenging]);
  if (score < 2) return undefined;

  return {
    id: "unavailable_partners",
    score: score + 1,
    dominantPattern: "delayed trust and attraction to emotionally distant partners",
    likelyLifeExpression: "The user may experience intensity with people who are not fully available, which can make distance feel like depth or safety.",
    challengingPattern: {
      summary: "Relationship evidence and life context suggest emotional guardedness, distance, or inconsistency around attachment.",
      evidence: clampEvidenceList(filterEvidence(bundle.challengingEvidence, ["saturn", "venus", "moon", "rahu", "ketu", "delay", "distance", "pressure", "relationship"])),
    },
    growthDirection: "Choose consistency over intensity and verify availability through actions rather than potential.",
    confidence: inferPatternConfidence(input, score >= 3 ? "high" : "medium"),
  };
}

function scoreDecisionParalysis(input: PatternRecognitionInput, bundle: NormalizedBundle): PatternCandidate | undefined {
  const emotion = input.emotionalState.primaryEmotion;
  const emotionalMatch = emotion === "confusion" || emotion === "anxiety" || emotion === "fear";
  const lifeMatch = hasContextContaining(bundle.lifeText, ["cannot decide", "unsure", "stuck", "wrong decision", "decision"]);
  const practicalMatch = input.practicalConstraints.riskTolerance === "low";
  const score = countMatches([emotionalMatch, lifeMatch, practicalMatch]);
  if (score < 2) return undefined;

  return {
    id: "decision_paralysis",
    score: score + 1,
    dominantPattern: "overthinking and decision paralysis under pressure",
    likelyLifeExpression: "This can feel like needing certainty before acting, which may keep the person stuck between options.",
    growthDirection: "Reduce the decision into reversible next steps, clear constraints, and one concrete test before making an irreversible move.",
    confidence: inferPatternConfidence(input, score >= 3 ? "high" : "medium"),
  };
}

function scoreFamilyDutyVsDesire(input: PatternRecognitionInput, bundle: NormalizedBundle): PatternCandidate | undefined {
  const familyMatch = input.culturalContext.familyInvolved || input.culturalContext.familyReputationPressure || input.culturalContext.financialDependents;
  const practicalMatch = input.practicalConstraints.familyConstraint;
  const lifeMatch = hasContextContaining(bundle.lifeText, ["family duty", "family", "career", "marriage", "relocation", "money", "dependents"]);
  const supportive = bundle.supportiveEvidence.length > 0;
  const challenging = familyMatch || practicalMatch || bundle.challengingEvidence.length > 0;
  const score = countMatches([familyMatch, practicalMatch, lifeMatch]);
  if (score < 2) return undefined;

  const mixed = createMixedSignal(
    supportive,
    challenging,
    "personal growth or movement may be possible",
    "family duty or dependency can slow direct action",
    "progress is more realistic when it respects family realities while still protecting personal agency",
  );

  return {
    id: "family_duty",
    score: score + (supportive ? 1 : 0),
    dominantPattern: "family duty versus personal desire",
    likelyLifeExpression: "One possible expression is feeling responsible for family stability while also needing space for personal direction.",
    supportivePattern: supportive
      ? {
          summary: "Some evidence supports movement or personal development, but it needs to be balanced with family realities.",
          evidence: clampEvidenceList(bundle.supportiveEvidence),
        }
      : undefined,
    challengingPattern: challenging
      ? {
          summary: "Family responsibility, dependence, or reputation pressure may slow direct action.",
          evidence: clampEvidenceList(uniqueStrings([
            ...bundle.challengingEvidence,
            ...(familyMatch ? ["family involvement"] : []),
            ...(practicalMatch ? ["family constraint"] : []),
          ])),
        }
      : undefined,
    mixedSignal: mixed,
    growthDirection: "Create a practical boundary or timeline that respects family duties without surrendering the entire decision.",
    confidence: inferPatternConfidence(input, score >= 3 ? "high" : "medium"),
  };
}

function scoreMoneyRetention(input: PatternRecognitionInput, bundle: NormalizedBundle): PatternCandidate | undefined {
  const lifeMatch = bundle.lifeArea === "money" || hasContextContaining(bundle.lifeText, ["savings", "debt", "expense", "cannot save", "money stress"]);
  const supportive = hasEvidenceContaining(bundle.supportiveEvidence, ["2nd", "11th", "wealth", "gains", "income", "resources"]);
  const challenging = hasEvidenceContaining(bundle.challengingEvidence, ["8th", "leakage", "volatile", "pressure", "expenses", "debt", "loss"]);
  const practical = input.practicalConstraints.moneyConstraint;
  const score = countMatches([lifeMatch, supportive, challenging, practical]);
  if (score < 3) return undefined;

  const mixed = createMixedSignal(
    supportive,
    challenging || practical,
    "income or gains may be available",
    "retention may be reduced by expenses, obligations, or volatility",
    "focus on retention, budgeting boundaries, and reducing leakage before expanding risk",
  );

  return {
    id: "money_retention",
    score,
    dominantPattern: "earning pressure and difficulty retaining resources",
    likelyLifeExpression: "This may show up as money coming in but being absorbed by expenses, obligations, volatility, or unclear priorities.",
    supportivePattern: supportive
      ? {
          summary: "Money evidence suggests earning or gains potential.",
          evidence: clampEvidenceList(filterEvidence(bundle.supportiveEvidence, ["2nd", "11th", "wealth", "gains", "income", "resources"])),
        }
      : undefined,
    challengingPattern: challenging
      ? {
          summary: "Money evidence suggests leakage, pressure, or instability around retention.",
          evidence: clampEvidenceList(filterEvidence(bundle.challengingEvidence, ["8th", "leakage", "volatile", "pressure", "expenses", "debt", "loss"])),
        }
      : undefined,
    mixedSignal: mixed,
    growthDirection: "Focus on retention, budgeting boundaries, and reducing leakage before expanding risk.",
    confidence: inferPatternConfidence(input, score >= 4 ? "high" : "medium"),
  };
}

function scoreFearOfVisibility(input: PatternRecognitionInput, bundle: NormalizedBundle): PatternCandidate | undefined {
  const career = input.chartEvidence.domain === "career";
  const emotion = input.emotionalState.primaryEmotion;
  const lifeMatch = hasContextContaining(bundle.lifeText, ["promotion", "visibility", "manager", "recognition"]);
  const supportive = hasEvidenceContaining([...bundle.supportiveEvidence, ...bundle.challengingEvidence], ["sun", "10th", "visibility", "public", "leadership", "authority"]);
  const evidenceMatch = hasEvidenceContaining([...bundle.supportiveEvidence, ...bundle.challengingEvidence], ["sun", "10th", "visibility", "public", "leadership", "authority"]);
  const score = countMatches([career, emotion === "fear" || emotion === "anxiety", lifeMatch, evidenceMatch]);
  if (score < 3) return undefined;

  return {
    id: "fear_visibility",
    score: score + 2,
    dominantPattern: "fear of visibility mixed with desire for recognition",
    likelyLifeExpression: "One possible expression is wanting recognition while also feeling exposed, judged, or pressured when visibility increases.",
    supportivePattern: supportive
      ? {
          summary: "Career evidence suggests visibility or leadership potential.",
          evidence: clampEvidenceList(filterEvidence([...bundle.supportiveEvidence, ...bundle.challengingEvidence], ["sun", "10th", "visibility", "public", "leadership", "authority"])),
        }
      : undefined,
    challengingPattern: evidenceMatch || lifeMatch
      ? {
          summary: "Visibility can feel exposed when recognition pressure and authority context are strong.",
          evidence: clampEvidenceList(uniqueStrings([
            ...filterEvidence([...bundle.supportiveEvidence, ...bundle.challengingEvidence], ["sun", "10th", "visibility", "public", "leadership", "authority"]),
            ...(lifeMatch ? ["promotion and recognition context"] : []),
          ])),
        }
      : undefined,
    growthDirection: "Build visibility gradually through evidence, small public wins, and controlled responsibility.",
    confidence: inferPatternConfidence(input, score >= 4 ? "high" : "medium"),
  };
}

function scoreSpiritualGrowthMaterialInstability(input: PatternRecognitionInput, bundle: NormalizedBundle): PatternCandidate | undefined {
  const lifeMatch = bundle.lifeArea === "spirituality" || hasContextContaining(bundle.lifeText, ["spiritual", "meaning", "direction", "confusion"]);
  const practicalMatch = input.practicalConstraints.careerInstability || input.practicalConstraints.moneyConstraint;
  const score = countMatches([lifeMatch, practicalMatch]);
  if (score < 2) return undefined;

  return {
    id: "spiritual_material_instability",
    score: score + 1,
    dominantPattern: "spiritual searching during material instability",
    likelyLifeExpression: "This may show up as seeking meaning while practical life feels unstable or unresolved.",
    growthDirection: "Keep spiritual practice grounding and simple while stabilizing basic routines, work, money, and health.",
    confidence: inferPatternConfidence(input, score >= 2 && bundle.chartFactsRelevant ? "medium" : "low"),
  };
}

function scoreSuddenCareerStartsStops(input: PatternRecognitionInput, bundle: NormalizedBundle): PatternCandidate | undefined {
  const career = input.chartEvidence.domain === "career";
  const lifeMatch = hasContextContaining(bundle.lifeText, ["starts and stops", "job switch", "quit", "unstable", "business transition"]);
  const practicalMatch = input.practicalConstraints.careerInstability;
  const challenging = hasEvidenceContaining(bundle.challengingEvidence, ["rahu", "ketu", "mars", "instability", "volatile", "pressure", "disruption"]);
  const score = countMatches([career, lifeMatch, practicalMatch, challenging]);
  if (score < 3) return undefined;

  return {
    id: "career_starts_stops",
    score,
    dominantPattern: "sudden starts and stops in professional direction",
    likelyLifeExpression: "This can feel like bursts of motivation followed by uncertainty, disruption, or difficulty sustaining one path.",
    growthDirection: "Use staged experiments, backup plans, and consistency checks before making abrupt professional changes.",
    confidence: inferPatternConfidence(input, score >= 4 ? "high" : "medium"),
  };
}

type NormalizedBundle = {
  readonly supportiveEvidence: readonly string[];
  readonly challengingEvidence: readonly string[];
  readonly neutralEvidence: readonly string[];
  readonly lifeText: string;
  readonly emotionText: string;
  readonly lifeArea: LifeContextExtraction["lifeArea"];
  readonly chartFactsRelevant: boolean;
};

function buildNormalizedBundle(
  input: PatternRecognitionInput,
  supportiveEvidence: readonly string[],
  challengingEvidence: readonly string[],
  neutralEvidence: readonly string[],
): NormalizedBundle {
  const lifeText = sanitizePatternText(
    [
      input.lifeContext.lifeArea,
      input.lifeContext.currentIssue,
      input.lifeContext.currentSituation,
      input.lifeContext.decisionType,
      input.lifeContext.desiredOutcome,
      ...input.lifeContext.extractedFacts.map((fact) => fact.fact),
      ...input.lifeContext.missingCriticalContext,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const emotionText = sanitizePatternText(
    [input.emotionalState.primaryEmotion, ...input.emotionalState.secondaryEmotions].filter(Boolean).join(" "),
  );
  return {
    supportiveEvidence,
    challengingEvidence,
    neutralEvidence,
    lifeText,
    emotionText,
    lifeArea: input.lifeContext.lifeArea,
    chartFactsRelevant: supportiveEvidence.length + challengingEvidence.length + neutralEvidence.length > 0,
  };
}

function inferPatternConfidence(input: PatternRecognitionInput, fallback: ConsultationConfidence): ConsultationConfidence {
  const hasChartSupport = input.chartEvidence.supportiveFactors.length + input.chartEvidence.challengingFactors.length + input.chartEvidence.neutralFacts.length > 0;
  const hasContext =
    Boolean(input.lifeContext.lifeArea) ||
    Boolean(input.lifeContext.currentIssue) ||
    input.lifeContext.extractedFacts.length > 0 ||
    Boolean(input.emotionalState.primaryEmotion && input.emotionalState.primaryEmotion !== "neutral") ||
    input.culturalContext.familyInvolved ||
    input.culturalContext.parentalPressure ||
    input.culturalContext.arrangedMarriageContext ||
    input.culturalContext.familyReputationPressure ||
    input.culturalContext.financialDependents ||
    input.practicalConstraints.moneyConstraint ||
    input.practicalConstraints.timeConstraint ||
    input.practicalConstraints.privacyConstraint ||
    input.practicalConstraints.careerInstability ||
    input.practicalConstraints.familyConstraint;

  if (hasChartSupport && hasContext) return fallback === "high" ? "high" : "medium";
  if (hasContext && input.lifeContext.extractedFacts.length > 0) return "medium";
  if (hasChartSupport) return "low";
  return "low";
}

function createMixedSignal(
  supportive: boolean,
  challenging: boolean,
  promise: string,
  blockage: string,
  synthesis: string,
): PatternRecognitionMixedSignal | undefined {
  if (!supportive || !challenging) return undefined;
  return {
    promise: sanitizePatternText(promise),
    blockage: sanitizePatternText(blockage),
    synthesis: sanitizePatternText(synthesis),
  };
}

function sanitizePatternPattern(pattern: PatternRecognitionPattern): PatternRecognitionPattern {
  return {
    summary: sanitizePatternText(pattern.summary),
    evidence: clampEvidenceList(pattern.evidence.map((item) => sanitizePatternText(item))),
  };
}

function sanitizeMixedSignal(signal: PatternRecognitionMixedSignal): PatternRecognitionMixedSignal {
  return {
    promise: sanitizePatternText(signal.promise),
    blockage: sanitizePatternText(signal.blockage),
    synthesis: sanitizePatternText(signal.synthesis),
  };
}

function sanitizePatternText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function assertNoDeterministicLanguage(result: PatternRecognitionSynthesisResult): PatternRecognitionSynthesisResult {
  const lower = JSON.stringify(result).toLowerCase();
  const forbidden = [
    "you will always",
    "you are destined",
    "this definitely means",
    "this guarantees",
    "guaranteed",
    "will happen",
    "will never",
    "cannot happen",
    "fixed fate",
    "curse",
    "cursed",
    "death",
    "disease",
    "cure",
    "wear",
    "gemstone",
    "puja",
    "mantra",
    "donate",
    "fast",
  ];
  for (const word of forbidden) {
    if (lower.includes(word)) {
      return DEFAULT_RESULT;
    }
  }
  return result;
}

function hasEvidenceContaining(evidence: readonly string[], patterns: readonly string[]): boolean {
  const text = evidence.join(" ").toLowerCase();
  return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}

function hasAny(text: string, patterns: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function hasContextContaining(text: string, patterns: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function filterEvidence(evidence: readonly string[], patterns: readonly string[]): string[] {
  const lowerPatterns = patterns.map((pattern) => pattern.toLowerCase());
  return evidence.filter((item) => lowerPatterns.some((pattern) => item.toLowerCase().includes(pattern)));
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function clampEvidenceList(values: readonly string[], max = 4): string[] {
  return uniqueStrings(values).slice(0, max);
}

function countMatches(values: readonly boolean[]): number {
  return values.filter(Boolean).length;
}
