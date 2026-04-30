import type { AnalyzerResult } from "./analyzer-schema";
import type { RagSafetyGateResult } from "./safety-gate";
import {
  getRequiredDataMatrixEntry,
  mapAnalyzerToRequiredDataDomain,
  normalizeRequiredDataKey,
  type RequiredDataDomain,
  type RequiredDataItem,
} from "./required-data-matrix";

export type RequiredDataPlannerInput = {
  analyzer: AnalyzerResult;
  safety: RagSafetyGateResult;
  question?: string;
};

export type RequiredDataPlan = {
  domain: RequiredDataDomain;
  answerType: "exact_fact" | "interpretive" | "timing" | "remedy" | "safety" | "general";
  requiredFacts: string[];
  optionalFacts: string[];
  requiredItems: RequiredDataItem[];
  optionalItems: RequiredDataItem[];
  retrievalTags: string[];
  reasoningRuleDomains: string[];
  benchmarkDomains: string[];
  needsTiming: boolean;
  needsRemedy: boolean;
  requiresTimingSource: boolean;
  timingAllowed: boolean;
  remedyAllowed: boolean;
  blockedBySafety: boolean;
  safetyRestrictions: string[];
  missingPlanningWarnings: string[];
  metadata: {
    analyzerSource: AnalyzerResult["source"];
    analyzerConfidence: number;
    safetySeverity: RagSafetyGateResult["severity"];
    llmAllowed: boolean;
  };
};

function emptyPlan(): RequiredDataPlan {
  return {
    domain: "general",
    answerType: "general",
    requiredFacts: [],
    optionalFacts: [],
    requiredItems: [],
    optionalItems: [],
    retrievalTags: ["general"],
    reasoningRuleDomains: ["general"],
    benchmarkDomains: ["general"],
    needsTiming: false,
    needsRemedy: false,
    requiresTimingSource: false,
    timingAllowed: false,
    remedyAllowed: false,
    blockedBySafety: false,
    safetyRestrictions: [],
    missingPlanningWarnings: [],
    metadata: {
      analyzerSource: "deterministic_fallback",
      analyzerConfidence: 0.4,
      safetySeverity: "allow",
      llmAllowed: false,
    },
  };
}

function dedupeStable(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeRequiredDataKey(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function toAnalyzerItem(key: string): RequiredDataItem {
  return {
    key,
    label: key.replace(/_/g, " "),
    factTypes: [],
    factKeys: [],
    tags: [],
    requiredFor: ["analyzer"],
    description: "Analyzer-requested fact.",
  };
}

function combineItems(domain: RequiredDataDomain, keys: string[]): RequiredDataItem[] {
  const entry = getRequiredDataMatrixEntry(domain);
  const matrixItems = [...entry.required, ...entry.optional];
  const byKey = new Map(matrixItems.map((item) => [item.key, item]));
  const out: RequiredDataItem[] = [];
  for (const key of keys) {
    const normalized = normalizeRequiredDataKey(key);
    const existing = byKey.get(normalized) ?? byKey.get(key);
    out.push(existing ?? toAnalyzerItem(normalized));
  }
  return out;
}

function mergeStable(base: string[], additions: string[]): string[] {
  return dedupeStable([...base, ...additions]);
}

function computeTimingAllowed(safety: RagSafetyGateResult, restricted: boolean): boolean {
  if (!safety.allowed) return false;
  if (!safety.metadata.timingClaimsAllowed) return false;
  if (restricted) return false;
  return true;
}

function computeRemedyAllowed(safety: RagSafetyGateResult): boolean {
  return safety.allowed && safety.metadata.remedyClaimsAllowed;
}

function hasRestriction(restrictions: string[], needle: RegExp): boolean {
  return restrictions.some((restriction) => needle.test(restriction));
}

export function planRequiredData(input?: Partial<RequiredDataPlannerInput>): RequiredDataPlan {
  if (!input?.analyzer || !input?.safety) return emptyPlan();

  const analyzer = input.analyzer;
  const safety = input.safety;
  const domain = mapAnalyzerToRequiredDataDomain({
    topic: analyzer.topic,
    questionType: analyzer.questionType,
    retrievalTags: analyzer.retrievalTags,
    requiredFacts: analyzer.requiredFacts,
    needsTiming: analyzer.needsTiming,
    needsRemedy: analyzer.needsRemedy,
  });
  const matrix = getRequiredDataMatrixEntry(domain);
  const safetyBlocked = !safety.allowed;

  if (safetyBlocked) {
    return {
      ...emptyPlan(),
      domain: "safety",
      answerType: "safety",
      blockedBySafety: true,
      retrievalTags: dedupeStable(["safety", ...matrix.retrievalTags, ...analyzer.retrievalTags]),
      reasoningRuleDomains: matrix.reasoningRuleDomains.length ? matrix.reasoningRuleDomains : ["safety"],
      benchmarkDomains: matrix.benchmarkDomains.length ? matrix.benchmarkDomains : ["safety"],
      safetyRestrictions: [...safety.restrictions],
      metadata: {
        analyzerSource: analyzer.source,
        analyzerConfidence: analyzer.confidence,
        safetySeverity: safety.severity,
        llmAllowed: false,
      },
    };
  }

  const requiredKeys = new Set<string>();
  const optionalKeys = new Set<string>();
  const warnings = new Set<string>();
  const requiresTimingSource = domain === "timing" || analyzer.needsTiming;
  const timingRestricted = hasRestriction(safety.restrictions, /timing/);

  for (const item of matrix.required) requiredKeys.add(item.key);
  for (const item of matrix.optional) optionalKeys.add(item.key);

  for (const key of analyzer.requiredFacts) {
    const normalized = normalizeRequiredDataKey(key);
    if (!requiredKeys.has(normalized)) requiredKeys.add(normalized);
  }

  const retrievalTags = mergeStable(matrix.retrievalTags, analyzer.retrievalTags);
  let answerType: RequiredDataPlan["answerType"] = "interpretive";
  let needsTiming = analyzer.needsTiming || domain === "timing";
  let needsRemedy = analyzer.needsRemedy;
  let timingAllowed = computeTimingAllowed(safety, timingRestricted);
  let remedyAllowed = computeRemedyAllowed(safety);
  let blockedBySafety = false;

  if (analyzer.questionType === "exact_fact") {
    answerType = "exact_fact";
    needsTiming = analyzer.needsTiming;
    needsRemedy = false;
    remedyAllowed = false;
    timingAllowed = analyzer.needsTiming ? timingAllowed : false;
    const exactFacts = dedupeStable(analyzer.requiredFacts);
    requiredKeys.clear();
    optionalKeys.clear();
    for (const key of exactFacts) requiredKeys.add(key);
  } else if (analyzer.questionType === "unsafe") {
    answerType = "safety";
  } else if (analyzer.questionType === "general" && domain === "general" && !analyzer.needsTiming && !analyzer.needsRemedy) {
    answerType = "general";
    if (analyzer.shouldAskFollowup) {
      warnings.add("Analyzer requested follow-up before retrieval.");
    }
  } else if (analyzer.questionType === "timing" || (analyzer.needsTiming && (domain === "timing" || domain === "general"))) {
    answerType = "timing";
  } else if (analyzer.needsRemedy) {
    answerType = "remedy";
  } else if (analyzer.questionType === "general" && analyzer.shouldAskFollowup) {
    answerType = "general";
    warnings.add("Analyzer requested follow-up before retrieval.");
  }

  if (analyzer.needsTiming) {
    needsTiming = true;
    if (!requiredKeys.has("timing_source")) requiredKeys.add("timing_source");
    optionalKeys.add("current_dasha");
    optionalKeys.add("varshaphal");
    optionalKeys.add("timing_windows");
    if (!timingAllowed) {
      warnings.add("Timing was requested, but timing claims are restricted until a grounded timing source is available.");
    }
  }

  if (analyzer.needsRemedy) {
    needsRemedy = true;
    if (domain === "sleep") {
      requiredKeys.add("safe_remedy_rules");
    } else if (domain === "spirituality" || domain === "career" || domain === "marriage" || domain === "foreign" || domain === "education" || domain === "health") {
      optionalKeys.add("safe_remedy_rules");
    }
    if (!remedyAllowed) warnings.add("Low-cost, safe remedy guidance is restricted by safety settings.");
  }

  if (domain === "timing") {
    answerType = "timing";
  }

  if (domain === "safety") {
    answerType = "safety";
    blockedBySafety = true;
  }

  if (hasRestriction(safety.restrictions, /exact timing|timing certainty/i)) {
    timingAllowed = false;
  }

  if (domain === "health" && safety.riskFlags.includes("medical")) {
    blockedBySafety = safety.allowed === false;
  }

  const requiredFactList = dedupeStable([...requiredKeys]);
  const optionalFactList = dedupeStable([...optionalKeys].filter((key) => !requiredKeys.has(key)));
  const requiredItemList = combineItems(domain, requiredFactList);
  const optionalItemList = combineItems(domain, optionalFactList);

  return {
    domain,
    answerType,
    requiredFacts: requiredFactList,
    optionalFacts: optionalFactList,
    requiredItems: requiredItemList,
    optionalItems: optionalItemList,
    retrievalTags,
    reasoningRuleDomains: matrix.reasoningRuleDomains,
    benchmarkDomains: matrix.benchmarkDomains,
    needsTiming,
    needsRemedy,
    requiresTimingSource,
    timingAllowed,
    remedyAllowed,
    blockedBySafety,
    safetyRestrictions: [...safety.restrictions],
    missingPlanningWarnings: [...warnings],
    metadata: {
      analyzerSource: analyzer.source,
      analyzerConfidence: analyzer.confidence,
      safetySeverity: safety.severity,
      llmAllowed: false,
    },
  };
}
