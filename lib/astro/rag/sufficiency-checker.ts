import type { AnalyzerResult } from "./analyzer-schema";
import type { RequiredDataPlan } from "./required-data-planner";
import type { RetrievalContext } from "./retrieval-types";
import type { ReasoningPath } from "./reasoning-path-builder";
import type { RagSafetyGateResult } from "./safety-gate";
import type { TimingContext } from "./timing-engine";

export type SufficiencyStatus = "answer_now" | "ask_followup" | "fallback";

export type SufficiencyCheckerInput = {
  question?: string;
  analyzer?: AnalyzerResult;
  safety?: RagSafetyGateResult;
  plan?: RequiredDataPlan;
  context?: RetrievalContext;
  reasoningPath?: ReasoningPath;
  timing?: TimingContext;
};

export type SufficiencyDecision = {
  status: SufficiencyStatus;
  missingFacts: string[];
  missingUserClarification: string[];
  followupQuestion?: string;
  limitations: string[];
  warnings: string[];
  canUseGroq: boolean;
  canUseOllamaCritic: boolean;
  fallbackReason?: string;
  answerMode: "safety" | "exact_fact" | "interpretive" | "timing_limited" | "remedy" | "followup" | "fallback";
  metadata: {
    blockedBySafety: boolean;
    exactFact: boolean;
    retrievalPartial: boolean;
    reasoningPartial: boolean;
    timingRequested: boolean;
    timingAvailable: boolean;
    timingAllowed: boolean;
    requiredFactCount: number;
    presentRequiredFactCount: number;
    missingRequiredFactCount: number;
  };
};

const LIMITATION_MISSING_CONTEXT = "Sufficiency could not be checked because required pipeline context is missing.";
const LIMITATION_MISSING_FACTS = "Required chart facts are missing, so a grounded answer cannot be generated yet.";
const LIMITATION_TIMING_MISSING = "No grounded timing source is available, so timing must be omitted.";
const LIMITATION_TIMING_RESTRICTED = "Timing claims are restricted for this question.";
const LIMITATION_PARTIAL_RETRIEVAL = "Retrieval was partial; answer must state limitations.";
const LIMITATION_EXACT_FACT = "The exact chart fact is not available in structured chart data yet.";
const LIMITATION_REMEDY_RESTRICTED = "Remedy guidance is restricted for this question.";
const LIMITATION_SAFE_REMEDY_MISSING = "Safe remedy rules are missing, so remedy guidance cannot be generated yet.";
const LIMITATION_REASONING_PARTIAL = "Reasoning rules are incomplete; answer must stay conservative.";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeFactRequirement(value: string): string {
  const text = normalizeText(value);
  const aliasMap: Record<string, string> = {
    "planet_placement:sun": "sun_placement",
    "planet_placement:moon": "moon_placement",
    "planet_placement:mercury": "mercury_placement",
    "planet_placement:jupiter": "jupiter_placement",
    "planet_placement:venus": "venus_placement",
    "planet_placement:saturn": "saturn_placement",
    "planet_placement:rahu": "rahu_placement",
    "planet_placement:ketu": "ketu_placement",
    "lord:10": "lord_10",
    "house:10": "house_10",
    "house:7": "house_7",
    "house:6": "house_6",
    "house:12": "house_12",
    "current_mahadasha": "current_dasha",
    "current_antardasha": "current_dasha",
    dasha: "current_dasha",
    safeRemedies: "safe_remedy_rules",
    safe_remedy_rules: "safe_remedy_rules",
    safe_response_rules: "safe_response_rules",
  };
  return aliasMap[text] ?? text;
}

function normalizeTokens(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeFactRequirement(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function hasRequestedTiming(input?: SufficiencyCheckerInput): boolean {
  if (!input) return false;
  if (input.plan?.needsTiming || input.plan?.requiresTimingSource || input.timing?.requested) return true;
  const question = normalizeText(input.question ?? input.analyzer?.followupQuestion ?? "");
  return /(^|\b)(when|exact date|date|timing|month|year|next month|next week|second half|period|window)(\b|$)/i.test(question);
}

export function isTimingOnlyQuestion(input?: SufficiencyCheckerInput): boolean {
  const question = normalizeText(input?.question ?? input?.analyzer?.followupQuestion ?? "");
  if (!question) return Boolean(input?.plan?.answerType === "timing" || input?.analyzer?.questionType === "timing");
  if (input?.analyzer?.questionType === "timing" || input?.plan?.answerType === "timing") return true;
  return (
    /(^|\b)(when|exact date|date|timing|month|year|next month|next week|second half|period|window)(\b|$)/i.test(question) &&
    !/(career|promotion|job|salary|recognition|marriage|relationship|spouse|money|income|savings|debt|business|sleep|health|remedy|foreign|visa|relocation|education)/i.test(question)
  );
}

function inferTopic(question: string): string {
  const normalized = normalizeText(question);
  if (normalized.includes("career") || normalized.includes("promotion") || normalized.includes("job") || normalized.includes("salary") || normalized.includes("recognition")) return "career";
  if (normalized.includes("marriage") || normalized.includes("married") || normalized.includes("wedding") || normalized.includes("relationship") || normalized.includes("spouse")) return "marriage";
  if (normalized.includes("money") || normalized.includes("income") || normalized.includes("savings") || normalized.includes("debt") || normalized.includes("business")) return "money";
  if (normalized.includes("sleep")) return "sleep";
  if (normalized.includes("foreign") || normalized.includes("visa") || normalized.includes("relocation")) return "foreign";
  if (normalized.includes("education") || normalized.includes("study")) return "education";
  return "general";
}

export function buildDefaultFollowupQuestion(input: SufficiencyCheckerInput): string {
  const topic = inferTopic(input.question ?? input.analyzer?.followupQuestion ?? "");
  if (topic === "career") return "Do you want me to focus on promotion timing, job change, salary, or workplace recognition?";
  if (topic === "marriage") return "Do you want me to focus on timing, relationship pattern, or spouse support?";
  if (topic === "money") return "Do you want me to focus on income, savings, debt, or business?";
  if (topic === "sleep") return "Do you want a chart-based explanation, a safe routine, or both?";
  if (topic === "foreign") return "Do you want me to focus on relocation, foreign job, visa timing, or remote work?";
  if (input.analyzer?.questionType === "exact_fact") return "Which exact chart fact do you want — Lagna, Moon sign, planet placement, house sign, house lord, dasha, or SAV?";
  return "Which area should I focus on — career, marriage, money, health, sleep, education, or foreign travel?";
}

export function collectPresentFactKeys(context?: RetrievalContext): string[] {
  const keys = new Set<string>();
  for (const fact of context?.chartFacts ?? []) {
    const factKey = normalizeFactRequirement(fact.factKey);
    const factType = normalizeFactRequirement(fact.factType);
    if (factKey) keys.add(factKey);
    if (factType) keys.add(factType);
    if (factType === "planet_placement" && fact.planet) {
      keys.add(`${normalizeText(fact.planet)}_placement`);
      keys.add(normalizeText(fact.planet));
    }
    if (factType === "house_lord" && /^lord_\d+$/.test(factKey)) keys.add(factKey);
    if (factType === "dasha") keys.add("current_dasha");
  }

  for (const remedy of context?.safeRemedies ?? []) {
    if (remedy && (remedy.restrictions?.length ?? 0) > 0) keys.add("safe_remedy_rules");
  }

  for (const benchmark of context?.benchmarkExamples ?? []) {
    if (benchmark?.domain) keys.add(`${normalizeText(benchmark.domain)}_benchmark_examples`);
  }

  for (const rule of context?.reasoningRules ?? []) {
    const domain = normalizeText(rule.domain);
    if (domain === "safety") keys.add("safe_response_rules");
    if (rule.requiredTags?.some((tag) => normalizeText(tag) === "benchmark")) {
      keys.add(`${domain}_benchmark_examples`);
    }
  }

  for (const window of context?.timingWindows ?? []) {
    if (window) keys.add("timing_source");
  }

  return [...keys];
}

function isRequiredFactPresent(requiredFact: string, context?: RetrievalContext, timing?: TimingContext): boolean {
  const key = normalizeFactRequirement(requiredFact);
  const present = new Set(collectPresentFactKeys(context));
  if (present.has(key)) return true;
  if (key === "timing_source") return Boolean(timing?.available);
  if (key === "safe_remedy_rules") return Boolean(context?.safeRemedies?.length);
  if (key === "safe_response_rules") return Boolean(context?.reasoningRules?.some((rule) => normalizeText(rule.domain) === "safety"));
  if (/^house_\d+$/.test(key)) return present.has(key);
  if (/^lord_\d+$/.test(key)) return present.has(key);
  if (key.endsWith("_benchmark_examples")) return Boolean(context?.benchmarkExamples?.some((example) => normalizeText(example.domain) === key.replace("_benchmark_examples", "")));
  if (key === "current_dasha") return present.has("current_dasha");
  return present.has(key);
}

export function getMissingRequiredFacts(plan: RequiredDataPlan, context?: RetrievalContext, timing?: TimingContext): string[] {
  const required = normalizeTokens(plan?.requiredFacts ?? []);
  const missing: string[] = [];
  for (const fact of required) {
    if (!isRequiredFactPresent(fact, context, timing)) missing.push(fact);
  }
  return [...new Set(missing)];
}

function appendLimitation(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

function hasCoreMissingReasoningAnchors(reasoningPath?: ReasoningPath): boolean {
  return Boolean(reasoningPath?.missingAnchors?.length);
}

function hasReasoningSupport(reasoningPath?: ReasoningPath): boolean {
  return Boolean(reasoningPath && reasoningPath.steps.length > 0);
}

export function checkSufficiency(input?: SufficiencyCheckerInput): SufficiencyDecision {
  if (!input?.plan || !input.context) {
    return {
      status: "fallback",
      missingFacts: [],
      missingUserClarification: [],
      limitations: [LIMITATION_MISSING_CONTEXT],
      warnings: [],
      canUseGroq: false,
      canUseOllamaCritic: false,
      fallbackReason: "missing_sufficiency_input",
      answerMode: "fallback",
      metadata: {
        blockedBySafety: false,
        exactFact: false,
        retrievalPartial: true,
        reasoningPartial: true,
        timingRequested: false,
        timingAvailable: false,
        timingAllowed: false,
        requiredFactCount: 0,
        presentRequiredFactCount: 0,
        missingRequiredFactCount: 0,
      },
    };
  }

  const plan = input.plan;
  const analyzer = input.analyzer;
  const safety = input.safety;
  const context = input.context;
  const timing = input.timing;
  const limitations: string[] = [];
  const warnings: string[] = [];
  const requiredFacts = normalizeTokens(plan.requiredFacts ?? []);
  const missingFacts = getMissingRequiredFacts(plan, context, timing);
  const requiredFactCount = requiredFacts.length;
  const presentRequiredFactCount = requiredFactCount - missingFacts.length;
  const timingRequested = hasRequestedTiming(input);
  const timingAvailable = Boolean(timing?.available);
  const timingAllowed = Boolean(timing?.allowed ?? plan.timingAllowed);
  const blockedBySafety = Boolean(!safety?.allowed || plan.blockedBySafety);
  const exactFact = plan.answerType === "exact_fact";
  const retrievalPartial = Boolean(context.metadata.partial);
  const reasoningPath = input.reasoningPath;
  const reasoningPartial = Boolean(reasoningPath?.metadata.partial || reasoningPath?.missingAnchors?.length);

  if (blockedBySafety) {
    for (const restriction of safety?.restrictions ?? []) appendLimitation(limitations, restriction);
    if (safety?.blockedReason) appendLimitation(limitations, safety.blockedReason);
    if (safety?.safeResponse) appendLimitation(limitations, safety.safeResponse);
    return {
      status: "answer_now",
      missingFacts: [],
      missingUserClarification: [],
      limitations,
      warnings,
      canUseGroq: false,
      canUseOllamaCritic: false,
      fallbackReason: undefined,
      answerMode: "safety",
      metadata: {
        blockedBySafety: true,
        exactFact,
        retrievalPartial,
        reasoningPartial,
        timingRequested,
        timingAvailable,
        timingAllowed,
        requiredFactCount,
        presentRequiredFactCount,
        missingRequiredFactCount: 0,
      },
    };
  }

  if (exactFact) {
    if (!requiredFacts.length) {
      const ask = analyzer?.shouldAskFollowup ? "ask_followup" : "fallback";
      const followupQuestion = analyzer?.followupQuestion ?? buildDefaultFollowupQuestion(input);
      const decision: SufficiencyDecision = {
        status: ask,
        missingFacts: [],
        missingUserClarification: analyzer?.shouldAskFollowup ? ["specific_topic", "question_scope"] : [],
        followupQuestion: ask === "ask_followup" ? followupQuestion : undefined,
        limitations: ask === "fallback" ? [LIMITATION_EXACT_FACT] : [],
        warnings,
        canUseGroq: false,
        canUseOllamaCritic: false,
        fallbackReason: ask === "fallback" ? "missing_required_facts" : undefined,
        answerMode: ask === "fallback" ? "exact_fact" : "followup",
        metadata: {
          blockedBySafety: false,
          exactFact: true,
          retrievalPartial,
          reasoningPartial,
          timingRequested: false,
          timingAvailable,
          timingAllowed: false,
          requiredFactCount,
          presentRequiredFactCount,
          missingRequiredFactCount: 0,
        },
      };
      return decision;
    }

    if (missingFacts.length === 0) {
      return {
        status: "answer_now",
        missingFacts: [],
        missingUserClarification: [],
        limitations,
        warnings,
        canUseGroq: false,
        canUseOllamaCritic: false,
        answerMode: "exact_fact",
        metadata: {
          blockedBySafety: false,
          exactFact: true,
          retrievalPartial,
          reasoningPartial,
          timingRequested: false,
          timingAvailable,
          timingAllowed: false,
          requiredFactCount,
          presentRequiredFactCount,
          missingRequiredFactCount: 0,
        },
      };
    }

    return {
      status: "fallback",
      missingFacts,
      missingUserClarification: [],
      limitations: [LIMITATION_EXACT_FACT],
      warnings,
      canUseGroq: false,
      canUseOllamaCritic: false,
      fallbackReason: "missing_required_facts",
      answerMode: "exact_fact",
      metadata: {
        blockedBySafety: false,
        exactFact: true,
        retrievalPartial,
        reasoningPartial,
        timingRequested: false,
        timingAvailable,
        timingAllowed: false,
        requiredFactCount,
        presentRequiredFactCount,
        missingRequiredFactCount: missingFacts.length,
      },
    };
  }

  if (analyzer?.shouldAskFollowup || plan.missingPlanningWarnings?.some((warning) => /follow-up/i.test(warning))) {
    const followupQuestion = analyzer?.followupQuestion ?? buildDefaultFollowupQuestion(input);
    return {
      status: "ask_followup",
      missingFacts: [],
      missingUserClarification: ["specific_topic", "question_scope"],
      followupQuestion,
      limitations: [],
      warnings,
      canUseGroq: false,
      canUseOllamaCritic: false,
      answerMode: "followup",
      metadata: {
        blockedBySafety: false,
        exactFact: false,
        retrievalPartial,
        reasoningPartial,
        timingRequested,
        timingAvailable,
        timingAllowed,
        requiredFactCount,
        presentRequiredFactCount,
        missingRequiredFactCount: missingFacts.length,
      },
    };
  }

  if (missingFacts.length > 0) {
    if (plan.answerType === "remedy" && missingFacts.includes("safe_remedy_rules")) {
      appendLimitation(limitations, LIMITATION_SAFE_REMEDY_MISSING);
      return {
        status: "fallback",
        missingFacts,
        missingUserClarification: [],
        limitations,
        warnings,
        canUseGroq: false,
        canUseOllamaCritic: false,
        fallbackReason: "missing_required_facts",
        answerMode: "remedy",
        metadata: {
          blockedBySafety: false,
          exactFact: false,
          retrievalPartial,
          reasoningPartial,
          timingRequested,
          timingAvailable,
          timingAllowed,
          requiredFactCount,
          presentRequiredFactCount,
          missingRequiredFactCount: missingFacts.length,
        },
      };
    }
    const timingMissing = missingFacts.includes("timing_source");
    const nonTimingMissing = missingFacts.filter((fact) => fact !== "timing_source");
    if (nonTimingMissing.length > 0) {
      appendLimitation(limitations, LIMITATION_MISSING_FACTS);
      if (retrievalPartial) appendLimitation(limitations, LIMITATION_PARTIAL_RETRIEVAL);
      return {
        status: "fallback",
        missingFacts,
        missingUserClarification: [],
        limitations,
        warnings,
        canUseGroq: false,
        canUseOllamaCritic: false,
        fallbackReason: "missing_required_facts",
        answerMode: "fallback",
        metadata: {
          blockedBySafety: false,
          exactFact: false,
          retrievalPartial,
          reasoningPartial,
          timingRequested,
          timingAvailable,
          timingAllowed,
          requiredFactCount,
          presentRequiredFactCount,
          missingRequiredFactCount: missingFacts.length,
        },
      };
    }
    if (timingMissing && isTimingOnlyQuestion(input)) {
      appendLimitation(limitations, timing?.limitation ?? LIMITATION_TIMING_MISSING);
      return {
        status: "fallback",
        missingFacts,
        missingUserClarification: [],
        limitations,
        warnings,
        canUseGroq: false,
        canUseOllamaCritic: false,
        fallbackReason: "missing_required_facts",
        answerMode: "timing_limited",
        metadata: {
          blockedBySafety: false,
          exactFact: false,
          retrievalPartial,
          reasoningPartial,
          timingRequested,
          timingAvailable,
          timingAllowed,
          requiredFactCount,
          presentRequiredFactCount,
          missingRequiredFactCount: missingFacts.length,
        },
      };
    }
  }

  if (plan.needsTiming || plan.requiresTimingSource || timingRequested) {
    if (!timingAllowed) {
      if (isTimingOnlyQuestion(input)) {
        appendLimitation(limitations, LIMITATION_TIMING_RESTRICTED);
        return {
          status: "fallback",
          missingFacts: missingFacts.includes("timing_source") ? missingFacts : [...missingFacts, "timing_source"],
          missingUserClarification: [],
          limitations,
          warnings,
          canUseGroq: false,
          canUseOllamaCritic: false,
          fallbackReason: "timing_restricted",
          answerMode: "timing_limited",
          metadata: {
            blockedBySafety: false,
            exactFact: false,
            retrievalPartial,
            reasoningPartial,
            timingRequested,
            timingAvailable,
            timingAllowed,
            requiredFactCount,
            presentRequiredFactCount,
            missingRequiredFactCount: missingFacts.length,
          },
        };
      }
      appendLimitation(limitations, LIMITATION_TIMING_RESTRICTED);
      warnings.push(LIMITATION_TIMING_RESTRICTED);
    } else if (!timingAvailable) {
      if (isTimingOnlyQuestion(input)) {
        appendLimitation(limitations, timing?.limitation ?? LIMITATION_TIMING_MISSING);
        return {
          status: "fallback",
          missingFacts: missingFacts.includes("timing_source") ? missingFacts : [...missingFacts, "timing_source"],
          missingUserClarification: [],
          limitations,
          warnings,
          canUseGroq: false,
          canUseOllamaCritic: false,
          fallbackReason: "missing_required_facts",
          answerMode: "timing_limited",
          metadata: {
            blockedBySafety: false,
            exactFact: false,
            retrievalPartial,
            reasoningPartial,
            timingRequested,
            timingAvailable,
            timingAllowed,
            requiredFactCount,
            presentRequiredFactCount,
            missingRequiredFactCount: missingFacts.length,
          },
        };
      }
      appendLimitation(limitations, LIMITATION_TIMING_MISSING);
    }
  }

  if (plan.needsRemedy) {
    if (!plan.remedyAllowed) {
      appendLimitation(limitations, LIMITATION_REMEDY_RESTRICTED);
    } else if (plan.answerType === "remedy" && !context.safeRemedies.length && plan.requiredFacts.includes("safe_remedy_rules")) {
      appendLimitation(limitations, LIMITATION_SAFE_REMEDY_MISSING);
      return {
        status: "fallback",
        missingFacts: missingFacts.includes("safe_remedy_rules") ? missingFacts : [...missingFacts, "safe_remedy_rules"],
        missingUserClarification: [],
        limitations,
        warnings,
        canUseGroq: false,
        canUseOllamaCritic: false,
        fallbackReason: "missing_required_facts",
        answerMode: "remedy",
        metadata: {
          blockedBySafety: false,
          exactFact: false,
          retrievalPartial,
          reasoningPartial,
          timingRequested,
          timingAvailable,
          timingAllowed,
          requiredFactCount,
          presentRequiredFactCount,
          missingRequiredFactCount: missingFacts.length,
        },
      };
    }
  }

  if (reasoningPath && hasCoreMissingReasoningAnchors(reasoningPath)) {
    if (!missingFacts.length) {
      return {
        status: "fallback",
        missingFacts: [...new Set(reasoningPath.missingAnchors.map(normalizeFactRequirement))],
        missingUserClarification: [],
        limitations: [LIMITATION_MISSING_FACTS],
        warnings,
        canUseGroq: false,
        canUseOllamaCritic: false,
        fallbackReason: "missing_required_facts",
        answerMode: plan.needsTiming ? "timing_limited" : plan.needsRemedy ? "remedy" : "fallback",
        metadata: {
          blockedBySafety: false,
          exactFact: false,
          retrievalPartial,
          reasoningPartial: true,
          timingRequested,
          timingAvailable,
          timingAllowed,
          requiredFactCount,
          presentRequiredFactCount,
          missingRequiredFactCount: missingFacts.length,
        },
      };
    }
  }

  if (reasoningPartial || !hasReasoningSupport(input.reasoningPath)) {
    appendLimitation(limitations, LIMITATION_REASONING_PARTIAL);
    warnings.push(LIMITATION_REASONING_PARTIAL);
  }

  if (retrievalPartial) {
    appendLimitation(limitations, LIMITATION_PARTIAL_RETRIEVAL);
    warnings.push(LIMITATION_PARTIAL_RETRIEVAL);
  }

  if (missingFacts.length > 0) {
    appendLimitation(limitations, LIMITATION_MISSING_FACTS);
    return {
      status: "fallback",
      missingFacts,
      missingUserClarification: [],
      limitations,
      warnings,
      canUseGroq: false,
      canUseOllamaCritic: false,
      fallbackReason: "missing_required_facts",
      answerMode: plan.needsTiming ? "timing_limited" : plan.needsRemedy ? "remedy" : "fallback",
      metadata: {
        blockedBySafety: false,
        exactFact: false,
        retrievalPartial,
        reasoningPartial,
        timingRequested,
        timingAvailable,
        timingAllowed,
        requiredFactCount,
        presentRequiredFactCount,
        missingRequiredFactCount: missingFacts.length,
      },
    };
  }

  const answerMode: SufficiencyDecision["answerMode"] =
    plan.answerType === "remedy"
      ? "remedy"
      : plan.answerType === "timing"
        ? "timing_limited"
        : "interpretive";

  return {
    status: "answer_now",
    missingFacts: [],
    missingUserClarification: [],
    limitations,
    warnings,
    canUseGroq: true,
    canUseOllamaCritic: true,
    answerMode,
    metadata: {
      blockedBySafety: false,
      exactFact: false,
      retrievalPartial,
      reasoningPartial,
      timingRequested,
      timingAvailable,
      timingAllowed,
      requiredFactCount,
      presentRequiredFactCount,
      missingRequiredFactCount: 0,
    },
  };
}
