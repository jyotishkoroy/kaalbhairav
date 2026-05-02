/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ChartEvidence } from "./chart-evidence-builder";
import type { ConsultationState } from "./consultation-state";
import type { TimingJudgement } from "./timing-judgement";
import type { RemedyPlan } from "./remedy-proportionality";
import type { ConsultationResponsePlan } from "./response-plan-builder";

export type ConsultationValidationFailureCode =
  | "empty_response"
  | "invented_chart_fact"
  | "too_many_follow_up_questions"
  | "absolute_prediction"
  | "death_prediction"
  | "fear_based_language"
  | "harsh_karma_language"
  | "expensive_remedy_as_default"
  | "gemstone_recommended_without_caution"
  | "overconfident_remedy_claim"
  | "unsupported_timing_window"
  | "medical_certainty"
  | "legal_certainty"
  | "financial_certainty"
  | "irreversible_action_instruction"
  | "exact_fact_over_narration"
  | "exact_fact_contains_remedy"
  | "exact_fact_contains_follow_up"
  | "exact_fact_contains_pattern_synthesis"
  | "missing_required_practical_guidance"
  | "missing_memory_reset_signal"
  | "response_violates_plan_guardrail";

export type ConsultationValidationWarningCode =
  | "limited_chart_evidence"
  | "missing_chart_evidence_section"
  | "missing_timing_caveat"
  | "missing_birth_time_sensitivity_caveat"
  | "missing_remedy_optional_language"
  | "missing_emotional_acknowledgement"
  | "weak_practical_grounding"
  | "possible_unsupported_claim"
  | "response_long_for_exact_fact"
  | "consultation_plan_missing";

export type ConsultationValidationResult = {
  readonly passed: boolean;
  readonly failures: readonly ConsultationValidationFailureCode[];
  readonly warnings: readonly ConsultationValidationWarningCode[];
};

export type ConsultationResponseValidationInput = {
  readonly response: string;
  readonly responsePlan?: ConsultationResponsePlan;
  readonly state?: ConsultationState;
  readonly chartEvidence?: ChartEvidence;
  readonly timingJudgement?: TimingJudgement;
  readonly remedyPlan?: RemedyPlan;
  readonly expectedMemoryReset?: boolean;
};

const FOLLOW_UP_STARTERS = [
  "are you",
  "is this",
  "do you",
  "did you",
  "have you",
  "can you",
  "could you",
  "would you",
  "should you",
  "what is",
  "which",
  "when",
  "where",
  "why",
  "how",
];

const ABSOLUTE_PREDICTION_PATTERNS = [
  "definitely",
  "certainly",
  "guaranteed",
  "guarantee",
  "will definitely",
  "will always",
  "will never",
  "cannot happen",
  "impossible",
  "destined to",
  "fixed fate",
  "this proves",
  "100%",
  "sure shot",
  "without fail",
];

const DEATH_PATTERNS = ["death", "die", "fatal", "life will end", "end of life", "death yoga", "accident death"];
const FEAR_PATTERNS = ["cursed", "curse", "doomed", "ruined", "dangerous karma", "severe punishment", "terrible fate", "urgent puja required"];
const HARSH_KARMA_PATTERNS = ["karmic punishment", "bad karma from a past life", "bad karma from past life", "suffering because of karma", "cursed by karma"];

const MEDICAL_PATTERNS = [
  "diagnosis",
  "diagnosed with",
  "you have cancer",
  "you have disease",
  "you will get sick",
  "cure",
  "treatment will fix",
  "stop your medicine",
  "avoid doctor",
  "no need for doctor",
  "guaranteed health",
  "this remedy will heal",
];

const LEGAL_PATTERNS = [
  "you will win the case",
  "guaranteed legal victory",
  "no need for a lawyer",
  "no need for lawyer",
  "ignore legal advice",
  "sign the legal document",
];

const FINANCIAL_PATTERNS = [
  "invest now",
  "guaranteed profit",
  "guaranteed wealth",
  "take loan now",
  "quit and invest",
  "sell everything",
  "sure returns",
  "you will become rich",
];

const IRREVERSIBLE_PATTERNS = [
  "resign now",
  "quit now",
  "marry now",
  "divorce now",
  "break up now",
  "move abroad immediately",
  "invest now",
  "take the loan",
  "stop treatment",
];

const GEMSTONE_PATTERNS = [
  "wear blue sapphire",
  "buy blue sapphire",
  "purchase blue sapphire",
  "buy the gemstone",
  "wear the gemstone",
  "wear gemstone",
  "buy gemstone",
  "purchase gemstone",
  "wear neelam",
  "buy neelam",
  "wear ruby",
  "wear emerald",
  "wear diamond",
  "wear yellow sapphire",
  "wear pearl",
  "wear coral",
];

const GEMSTONE_CAUTIONS = [
  "do not buy",
  "do not wear casually",
  "only after full chart verification",
  "consult a qualified astrologer",
  "not guaranteed",
  "if affordable",
  "caution",
];

const EXPENSIVE_REMEDY_PATTERNS = [
  "expensive puja",
  "costly puja",
  "large donation",
  "donate a large amount",
  "temple travel required",
  "urgent ritual",
  "must perform puja",
  "only remedy",
  "no other way",
  "compulsory ritual",
];

const REMEDY_TERMS = ["remedy", "mantra", "puja", "gemstone", "donation", "fasting"];
const PATTERN_SYNTHESIS_TERMS = ["soul", "life lesson", "karmic pattern", "emotional journey", "emotional pattern", "deeper meaning", "this shows your personality", "spiritual growth"];

const CONCRETE_ASTROLOGY_TERMS = [
  "lagna",
  "ascendant",
  "moon sign",
  "sun sign",
  "nakshatra",
  "mahadasha",
  "antardasha",
  "pratyantardasha",
  "dasha",
  "transit",
  "gochar",
  "sade sati",
  "sadesati",
  "7th house",
  "10th house",
  "2nd house",
  "11th house",
  "6th house",
  "8th house",
  "12th house",
  "venus",
  "jupiter",
  "saturn",
  "mars",
  "mercury",
  "rahu",
  "ketu",
  "sun",
  "moon",
  "navamsa",
  "d9",
  "d10",
  "darakaraka",
  "yogas",
  "raj yoga",
  "mangal dosha",
  "combustion",
  "retrograde",
  "debilitated",
  "exalted",
  "degrees",
  "aspect",
  "lordship",
];

const TIMING_PATTERNS = [
  /\bwithin\s+\d+\s+(?:days?|weeks?|months?|years?)\b/i,
  /\bnext\s+\d+\s*[-–]\s*\d+\s+(?:days?|weeks?|months?|years?)\b/i,
  /\bnext\s+\d+\b/i,
  /\bin\s+\d+\s+(?:days?|weeks?|months?|years?)\b/i,
  /\bby\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\bbefore\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\bafter\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b\d{4}-\d{2}-\d{2}\b/,
  /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+\d{4}\b/i,
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i,
];

const BIRTH_TIME_SENSITIVITY_CAVEATS = [
  "birth time sensitivity",
  "birth-time sensitive",
  "exact birth time matters",
  "timing is approximate",
  "confidence is limited",
];

export function validateConsultationResponse(
  input: ConsultationResponseValidationInput,
): ConsultationValidationResult {
  const response = normalizeText(input.response);
  const failures: ConsultationValidationFailureCode[] = [];
  const warnings: ConsultationValidationWarningCode[] = [];
  const plan = input.responsePlan;

  if (!response) {
    addFailure(failures, "empty_response");
    return finalize(failures, warnings);
  }

  if (!plan) {
    addWarning(warnings, "consultation_plan_missing");
  }

  const questionCount = countFollowUpQuestions(response);
  if (questionCount > 1) {
    addFailure(failures, "too_many_follow_up_questions");
  }
  if (plan?.mode === "exact_fact_only" && questionCount > 0) {
    addFailure(failures, "exact_fact_contains_follow_up");
  }

  if (containsAny(response, ABSOLUTE_PREDICTION_PATTERNS)) {
    addFailure(failures, "absolute_prediction");
  }
  if (containsAny(response, DEATH_PATTERNS) && containsPredictiveContext(response)) {
    addFailure(failures, "death_prediction");
  }
  if (containsAny(response, FEAR_PATTERNS)) {
    addFailure(failures, "fear_based_language");
  }
  if (containsAny(response, HARSH_KARMA_PATTERNS)) {
    addFailure(failures, "harsh_karma_language");
  }
  if (containsAny(response, MEDICAL_PATTERNS)) {
    addFailure(failures, "medical_certainty");
  }
  if (containsAny(response, LEGAL_PATTERNS)) {
    addFailure(failures, "legal_certainty");
  }
  if (containsAny(response, FINANCIAL_PATTERNS)) {
    addFailure(failures, "financial_certainty");
  }
  if (containsAny(response, IRREVERSIBLE_PATTERNS)) {
    addFailure(failures, "irreversible_action_instruction");
  }

  if (plan?.mode === "exact_fact_only" || input.state?.intent.primary === "exact_fact") {
    validateExactFactOutput(response, failures, warnings);
  }

  validateRemedies(response, input, plan, failures, warnings);
  validateTiming(response, input, plan, failures, warnings);
  validateChartFacts(response, input, plan, failures, warnings);
  validatePracticalGuidance(response, plan, failures, warnings);
  validateAcknowledgement(response, plan, warnings);
  validateMemoryReset(input, plan, failures);
  validatePlanGuardrails(response, input, plan, failures);

  return finalize(failures, warnings);
}

export function countFollowUpQuestions(response: string): number {
  const text = normalizeText(response);
  if (!text) return 0;
  if (text === "to calculate this properly, please share your birth date, exact birth time, and birthplace.") {
    return 1;
  }

  const questionMarks = (text.match(/\?/g) ?? []).length;
  const segments = splitSentences(text);
  let explicitPrompts = 0;
  for (const segment of segments) {
    const normalized = segment.trim();
    if (!normalized) continue;
    if (looksLikeQuestionStart(normalized)) {
      explicitPrompts += 1;
    }
  }
  return Math.max(questionMarks, explicitPrompts);
}

function validateExactFactOutput(
  response: string,
  failures: ConsultationValidationFailureCode[],
  warnings: ConsultationValidationWarningCode[],
): void {
  if (response.length > 450) {
    addWarning(warnings, "response_long_for_exact_fact");
  }
  if (response.length > 900) {
    addFailure(failures, "exact_fact_over_narration");
  }
  if (containsAny(response, REMEDY_TERMS)) {
    addFailure(failures, "exact_fact_contains_remedy");
  }
  if (containsAny(response, PATTERN_SYNTHESIS_TERMS)) {
    addFailure(failures, "exact_fact_contains_pattern_synthesis");
  }
}

function validateRemedies(
  response: string,
  input: ConsultationResponseValidationInput,
  plan: ConsultationResponsePlan | undefined,
  failures: ConsultationValidationFailureCode[],
  warnings: ConsultationValidationWarningCode[],
): void {
  const hasGemstone = containsAny(response, GEMSTONE_PATTERNS);
  const hasCaution = containsAny(response, GEMSTONE_CAUTIONS);
  const hasExpensiveRemedy = containsAny(response, EXPENSIVE_REMEDY_PATTERNS);
  const hasOverconfidentRemedy = /will fix|solve your saturn|remove saturn problem|fix your marriage|guarantee marriage|guarantee job|guarantee wealth|cure disease/i.test(response);

  if (hasGemstone && !hasCaution) {
    addFailure(failures, "gemstone_recommended_without_caution");
  }
  if (hasExpensiveRemedy) {
    addFailure(failures, "expensive_remedy_as_default");
  }
  if (hasOverconfidentRemedy || /must do it|only remedy|no other way|compulsory/i.test(response)) {
    addFailure(failures, "overconfident_remedy_claim");
  }
  if (plan?.mode === "exact_fact_only" && hasGemstone) {
    addFailure(failures, "exact_fact_contains_remedy");
  }

  if (input.remedyPlan) {
    if (input.remedyPlan.level <= 2 && /formal ritual|priest|temple travel|required ritual/i.test(response)) {
      addFailure(failures, "expensive_remedy_as_default");
    }
    if (input.remedyPlan.level === 5 && hasGemstone && !hasCaution) {
      addFailure(failures, "gemstone_recommended_without_caution");
    }
    if (input.remedyPlan.avoid.some((item) => normalizeText(item).includes("expensive gemstone")) && hasGemstone) {
      addFailure(failures, "gemstone_recommended_without_caution");
    }
    if (input.remedyPlan.remedies.some((item) => item.optional) && !/optional|if comfortable|within your means|if affordable/i.test(response)) {
      addWarning(warnings, "missing_remedy_optional_language");
    }
  } else if (hasGemstone && !hasCaution) {
    addWarning(warnings, "possible_unsupported_claim");
  }
}

function validateTiming(
  response: string,
  input: ConsultationResponseValidationInput,
  plan: ConsultationResponsePlan | undefined,
  failures: ConsultationValidationFailureCode[],
  warnings: ConsultationValidationWarningCode[],
): void {
  const timingMatches = extractTimingPhrases(response);
  const label = normalizeText(input.timingJudgement?.timeWindow?.label ?? "");
  const from = normalizeText(input.timingJudgement?.timeWindow?.from ?? "");
  const to = normalizeText(input.timingJudgement?.timeWindow?.to ?? "");
  const allowed = new Set<string>([
    label,
    from,
    to,
    ...(plan?.sections
      ?.flatMap((section) => section.id === "timing" ? section.guidance : [])
      .map((value) => normalizeText(value)) ?? []),
  ]);

  const exactAllowedTiming =
    (label.length > 0 && normalizeText(response).includes(label)) ||
    (from.length > 0 && normalizeText(response).includes(from)) ||
    (to.length > 0 && normalizeText(response).includes(to));

  if (exactAllowedTiming) {
    // The response is using the supplied window verbatim.
  } else if (timingMatches.length > 0 && allowed.size > 0) {
    for (const phrase of timingMatches) {
      if (allowed.has(normalizeText(phrase))) continue;
      if (!isSubstringOfAllowedTiming(phrase, allowed)) {
        addFailure(failures, "unsupported_timing_window");
        break;
      }
    }
  } else if (timingMatches.length > 0 && !input.timingJudgement?.timeWindow) {
    addFailure(failures, "unsupported_timing_window");
  }

  if (
    input.timingJudgement?.birthTimeSensitivity === "high" ||
    (plan?.sections ?? []).some((section) => section.id === "timing" && section.guidance.some((item) => normalizeText(item).includes("birth-time sensitivity")))
  ) {
    if (timingMatches.length > 0 && !containsAny(response, BIRTH_TIME_SENSITIVITY_CAVEATS)) {
      addWarning(warnings, "missing_birth_time_sensitivity_caveat");
    }
  }

  if (input.timingJudgement?.confidence === "low" && containsAny(response, ABSOLUTE_PREDICTION_PATTERNS)) {
    addWarning(warnings, "missing_timing_caveat");
  }
}

function validateChartFacts(
  response: string,
  input: ConsultationResponseValidationInput,
  plan: ConsultationResponsePlan | undefined,
  failures: ConsultationValidationFailureCode[],
  warnings: ConsultationValidationWarningCode[],
): void {
  const exactFactMode = plan?.mode === "exact_fact_only" || input.state?.intent.primary === "exact_fact";
  const concreteSentences = splitSentences(response).filter((sentence) => containsAny(sentence, CONCRETE_ASTROLOGY_TERMS));
  const allowedEvidence = buildAllowedEvidence(input, plan);

  if (concreteSentences.length > 0 && allowedEvidence.length === 0 && !exactFactMode) {
    addFailure(failures, "invented_chart_fact");
    addWarning(warnings, "limited_chart_evidence");
    return;
  }

  if (concreteSentences.length === 0) return;

  for (const sentence of concreteSentences) {
    const normalizedSentence = normalizeText(sentence);
    if (containsAny(normalizedSentence, allowedEvidence)) continue;
    if (!sentenceContainsEvidenceOverlap(normalizedSentence, allowedEvidence)) {
      if (containsGenericChartLanguage(normalizedSentence)) {
        addWarning(warnings, "possible_unsupported_claim");
      } else {
        if (!exactFactMode || (!isSimpleExactFactSentence(normalizedSentence) && !containsAny(normalizedSentence, PATTERN_SYNTHESIS_TERMS))) {
          addFailure(failures, "invented_chart_fact");
        }
      }
    }
  }

  if (allowedEvidence.length === 0) {
    addWarning(warnings, "missing_chart_evidence_section");
  }
}

function validatePracticalGuidance(
  response: string,
  plan: ConsultationResponsePlan | undefined,
  failures: ConsultationValidationFailureCode[],
  warnings: ConsultationValidationWarningCode[],
): void {
  const practicalSection = plan?.sections?.find((section) => section.id === "practical_guidance" && section.include);
  if (!practicalSection || plan?.mode === "exact_fact_only") return;

  const practicalSignals = [
    "practical",
    "next step",
    "step",
    "plan",
    "prepare",
    "wait",
    "document",
    "discuss",
    "boundary",
    "budget",
    "routine",
    "avoid impulsive",
    "within your means",
    "realistic",
    "staged",
    "backup",
  ];

  if (!containsAny(response, practicalSignals)) {
    addWarning(warnings, "weak_practical_grounding");
    if (plan?.mode === "answer_now") {
      addFailure(failures, "missing_required_practical_guidance");
    }
  }
}

function validateAcknowledgement(
  response: string,
  plan: ConsultationResponsePlan | undefined,
  warnings: ConsultationValidationWarningCode[],
): void {
  if (!plan?.sections?.some((section) => section.id === "acknowledgement" && section.include)) return;
  const acknowledgementSignals = [
    "i understand",
    "it makes sense",
    "this feels",
    "this can feel",
    "i hear",
    "given the pressure",
    "this is heavy",
    "this is not easy",
    "it is understandable",
  ];
  if (!containsAny(response, acknowledgementSignals)) {
    addWarning(warnings, "missing_emotional_acknowledgement");
  }
}

function validateMemoryReset(
  input: ConsultationResponseValidationInput,
  plan: ConsultationResponsePlan | undefined,
  failures: ConsultationValidationFailureCode[],
): void {
  if (input.expectedMemoryReset === true && plan?.resetAfterFinalAnswer !== true) {
    addFailure(failures, "missing_memory_reset_signal");
  }
}

function validatePlanGuardrails(
  response: string,
  input: ConsultationResponseValidationInput,
  plan: ConsultationResponsePlan | undefined,
  failures: ConsultationValidationFailureCode[],
): void {
  if (!plan) return;
  const exactFactMode = plan.mode === "exact_fact_only";
  const hasEvidenceContext = plan.evidenceSummary.supportive.length > 0 || plan.evidenceSummary.challenging.length > 0 || plan.evidenceSummary.neutral.length > 0;

  let violatedSpecific = false;
  for (const guardrail of plan.safetyGuardrails) {
    const guard = normalizeText(guardrail);
    if (guard.includes("do not invent chart facts") && !exactFactMode && !hasEvidenceContext && containsAny(response, CONCRETE_ASTROLOGY_TERMS)) {
      addFailure(failures, "invented_chart_fact");
      violatedSpecific = true;
    }
    if (guard.includes("do not invent timing windows") && !input.timingJudgement?.timeWindow && extractTimingPhrases(response).length > 0) {
      addFailure(failures, "unsupported_timing_window");
      violatedSpecific = true;
    }
    if (guard.includes("do not make absolute predictions") && containsAny(response, ABSOLUTE_PREDICTION_PATTERNS)) {
      addFailure(failures, "absolute_prediction");
      violatedSpecific = true;
    }
    if (guard.includes("do not give medical, legal, or financial certainty")) {
      if (containsAny(response, MEDICAL_PATTERNS)) {
        addFailure(failures, "medical_certainty");
        violatedSpecific = true;
      }
      if (containsAny(response, LEGAL_PATTERNS)) {
        addFailure(failures, "legal_certainty");
        violatedSpecific = true;
      }
      if (containsAny(response, FINANCIAL_PATTERNS)) {
        addFailure(failures, "financial_certainty");
        violatedSpecific = true;
      }
    }
    if (guard.includes("do not recommend expensive or coercive remedies")) {
      if (containsAny(response, EXPENSIVE_REMEDY_PATTERNS)) {
        addFailure(failures, "expensive_remedy_as_default");
        violatedSpecific = true;
      }
      if (containsAny(response, GEMSTONE_PATTERNS) && !containsAny(response, GEMSTONE_CAUTIONS)) {
        addFailure(failures, "gemstone_recommended_without_caution");
        violatedSpecific = true;
      }
    }
    if (guard.includes("answer only the exact fact") && containsAny(response, PATTERN_SYNTHESIS_TERMS)) {
      addFailure(failures, "exact_fact_contains_pattern_synthesis");
      violatedSpecific = true;
    }
  }

  if (violatedSpecific === false && plan.safetyGuardrails.length > 0 && containsAny(response, ABSOLUTE_PREDICTION_PATTERNS.concat(FEAR_PATTERNS))) {
    addFailure(failures, "response_violates_plan_guardrail");
  }
}

function buildAllowedEvidence(
  input: ConsultationResponseValidationInput,
  plan: ConsultationResponsePlan | undefined,
): string[] {
  const evidence: string[] = [];
  evidence.push(...(input.chartEvidence?.supportiveFactors.map((factor) => factor.factor) ?? []));
  evidence.push(...(input.chartEvidence?.challengingFactors.map((factor) => factor.factor) ?? []));
  evidence.push(...(input.chartEvidence?.neutralFacts.map((fact) => fact.fact) ?? []));
  evidence.push(...(plan?.evidenceSummary.supportive ?? []));
  evidence.push(...(plan?.evidenceSummary.challenging ?? []));
  evidence.push(...(plan?.evidenceSummary.neutral ?? []));
  evidence.push(...(input.state?.chartFacts?.facts.map((fact) => `${fact.label} ${fact.value}`) ?? []));
  return unique(evidence.map(normalizeText).filter(Boolean));
}

function extractTimingPhrases(response: string): string[] {
  const text = normalizeText(response);
  const matches: string[] = [];
  const hasRange = TIMING_PATTERNS[0].test(text);
  for (const [index, pattern] of TIMING_PATTERNS.entries()) {
    if (index === TIMING_PATTERNS.length - 1) {
      // no-op
    }
    if (hasRange && pattern.source === /\bnext\s+\d+\b/i.source) continue;
    const found = text.match(pattern);
    if (found?.[0]) matches.push(found[0]);
  }
  return unique(matches);
}

function sentenceContainsEvidenceOverlap(sentence: string, allowedEvidence: readonly string[]): boolean {
  return allowedEvidence.some((evidence) => evidenceTokenOverlap(sentence, evidence) >= 2);
}

function containsGenericChartLanguage(text: string): boolean {
  return /\b(chart|evidence|placement|indicator|house|lord|transit|dasha|timing)\b/.test(text);
}

function containsPredictiveContext(text: string): boolean {
  return /\b(will|show|shows|indicates|predict|prediction|danger|risk|future|upcoming|soon|next|this year)\b/.test(text);
}

function isSubstringOfAllowedTiming(phrase: string, allowed: Set<string>): boolean {
  const normalized = normalizeText(phrase);
  for (const item of allowed) {
    if (!item) continue;
    if (item.includes(normalized) || normalized.includes(item)) return true;
  }
  return false;
}

function evidenceTokenOverlap(sentence: string, evidence: string): number {
  const stopwords = new Set(["the", "a", "an", "of", "and", "to", "in", "your", "this", "that", "supplied", "chart", "evidence", "points", "shows", "show", "indicates", "may", "feel", "feels"]);
  const sentenceTokens = new Set(sentence.split(/\W+/g).filter((token) => token.length > 2 && !stopwords.has(token)));
  let overlap = 0;
  for (const token of evidence.split(/\W+/g)) {
    if (token.length > 2 && sentenceTokens.has(token) && !stopwords.has(token)) overlap += 1;
  }
  return overlap;
}

function isSimpleExactFactSentence(sentence: string): boolean {
  return sentence.trim().length <= 120 && !containsAny(sentence, PATTERN_SYNTHESIS_TERMS) && !containsAny(sentence, REMEDY_TERMS) && countFollowUpQuestions(sentence) === 0;
}

function looksLikeQuestionStart(text: string): boolean {
  const lower = normalizeText(text);
  return FOLLOW_UP_STARTERS.some((starter) => lower.startsWith(`${starter} `) || lower === starter || lower.startsWith(`${starter}?`));
}

function containsAny(text: string, patterns: readonly string[]): boolean {
  const lower = normalizeText(text);
  return patterns.some((pattern) => {
    const normalizedPattern = normalizeText(pattern);
    if (!normalizedPattern) return false;
    if ((normalizedPattern === "guaranteed" || normalizedPattern === "guarantee") && lower.includes("not guaranteed")) return false;
    return lower.includes(normalizedPattern);
  });
}

function splitSentences(text: string): string[] {
  return normalizeText(text)
    .split(/(?<=[.?!])\s+|\n+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function addFailure(failures: ConsultationValidationFailureCode[], code: ConsultationValidationFailureCode): void {
  if (!failures.includes(code)) failures.push(code);
}

function addWarning(warnings: ConsultationValidationWarningCode[], code: ConsultationValidationWarningCode): void {
  if (!warnings.includes(code)) warnings.push(code);
}

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function finalize(
  failures: readonly ConsultationValidationFailureCode[],
  warnings: readonly ConsultationValidationWarningCode[],
): ConsultationValidationResult {
  const uniqueFailures = unique(failures);
  const uniqueWarnings = unique(warnings);
  return {
    passed: uniqueFailures.length === 0,
    failures: uniqueFailures,
    warnings: uniqueWarnings,
  };
}
