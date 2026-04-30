import type { AnalyzerQuestionType, AnalyzerTopic } from "./analyzer-schema";

export type RequiredDataDomain =
  | "exact_fact"
  | "career"
  | "sleep"
  | "marriage"
  | "money"
  | "foreign"
  | "education"
  | "spirituality"
  | "health"
  | "legal"
  | "safety"
  | "timing"
  | "general";

export type RequiredDataItem = {
  key: string;
  label: string;
  factTypes: string[];
  factKeys: string[];
  tags: string[];
  requiredFor: string[];
  description: string;
};

export type RequiredDataMatrixEntry = {
  domain: RequiredDataDomain;
  required: RequiredDataItem[];
  optional: RequiredDataItem[];
  retrievalTags: string[];
  reasoningRuleDomains: string[];
  benchmarkDomains: string[];
  allowsTiming: boolean;
  allowsRemedy: boolean;
  requiresTimingSource: boolean;
};

function item(key: string, label: string, description: string, factTypes: string[] = [], factKeys: string[] = [], tags: string[] = [], requiredFor: string[] = []): RequiredDataItem {
  return {
    key,
    label,
    factTypes,
    factKeys,
    tags,
    requiredFor,
    description,
  };
}

export const REQUIRED_DATA_MATRIX: Record<RequiredDataDomain, RequiredDataMatrixEntry> = {
  exact_fact: {
    domain: "exact_fact",
    required: [],
    optional: [],
    retrievalTags: ["exact_fact"],
    reasoningRuleDomains: [],
    benchmarkDomains: [],
    allowsTiming: false,
    allowsRemedy: false,
    requiresTimingSource: false,
  },
  career: {
    domain: "career",
    required: [
      item("lagna", "Lagna", "Core chart anchor for career planning.", ["chart_fact"], ["lagna"], ["career"], ["planner"]),
      item("house_10", "10th house", "Career, status, and responsibility house.", ["house"], ["house_10"], ["career"], ["planner"]),
      item("lord_10", "10th lord", "Ruler of career house.", ["lord"], ["lord_10"], ["career"], ["planner"]),
      item("sun_placement", "Sun placement", "Visibility and authority signals.", ["planet_placement"], ["sun_placement"], ["career"], ["planner"]),
      item("house_11", "11th house", "Gains and recognition house.", ["house"], ["house_11"], ["career"], ["planner"]),
      item("current_dasha", "Current dasha", "Running period for timing and interpretation.", ["timing"], ["current_dasha"], ["career"], ["planner"]),
    ],
    optional: [
      item("varshaphal", "Varshaphal", "Annual timing support.", ["timing"], ["varshaphal"], ["career"], ["planner"]),
      item("timing_windows", "Timing windows", "Near-term timing support.", ["timing"], ["timing_windows"], ["career"], ["planner"]),
      item("career_benchmark_examples", "Career benchmark examples", "Comparison examples for career answers.", ["benchmark"], ["career_benchmark_examples"], ["career"], ["planner"]),
      item("safe_remedies", "Safe remedies", "Low-risk support guidance.", ["remedy"], ["safe_remedies"], ["career"], ["planner"]),
      item("moon_placement", "Moon placement", "Mind and stability context.", ["planet_placement"], ["moon_placement"], ["career"], ["planner"]),
      item("mercury_placement", "Mercury placement", "Communication and skill context.", ["planet_placement"], ["mercury_placement"], ["career"], ["planner"]),
      item("saturn_placement", "Saturn placement", "Workload and endurance context.", ["planet_placement"], ["saturn_placement"], ["career"], ["planner"]),
    ],
    retrievalTags: ["career", "house_10", "lord_10", "sun", "house_11", "dasha"],
    reasoningRuleDomains: ["career"],
    benchmarkDomains: ["career"],
    allowsTiming: true,
    allowsRemedy: true,
    requiresTimingSource: false,
  },
  sleep: {
    domain: "sleep",
    required: [
      item("house_12", "12th house", "Sleep, rest, and withdrawal house.", ["house"], ["house_12"], ["sleep"], ["planner"]),
      item("moon_placement", "Moon placement", "Mind and sleep quality context.", ["planet_placement"], ["moon_placement"], ["sleep"], ["planner"]),
      item("house_6", "6th house", "Stress and daily strain house.", ["house"], ["house_6"], ["sleep"], ["planner"]),
      item("safe_remedy_rules", "Safe remedy rules", "Non-medical remedy guardrails.", ["remedy"], ["safe_remedy_rules"], ["sleep"], ["planner"]),
    ],
    optional: [
      item("rahu_placement", "Rahu placement", "Restlessness context.", ["planet_placement"], ["rahu_placement"], ["sleep"], ["planner"]),
      item("ketu_placement", "Ketu placement", "Detachment context.", ["planet_placement"], ["ketu_placement"], ["sleep"], ["planner"]),
      item("sleep_benchmark_examples", "Sleep benchmark examples", "Comparison examples for sleep answers.", ["benchmark"], ["sleep_benchmark_examples"], ["sleep"], ["planner"]),
      item("timing_windows", "Timing windows", "Timing support if explicitly needed.", ["timing"], ["timing_windows"], ["sleep"], ["planner"]),
    ],
    retrievalTags: ["sleep", "moon", "house_12", "house_6", "remedy"],
    reasoningRuleDomains: ["sleep"],
    benchmarkDomains: ["sleep"],
    allowsTiming: false,
    allowsRemedy: true,
    requiresTimingSource: false,
  },
  marriage: {
    domain: "marriage",
    required: [
      item("house_7", "7th house", "Partnership and marriage house.", ["house"], ["house_7"], ["marriage"], ["planner"]),
      item("lord_7", "7th lord", "Marriage significator ruler.", ["lord"], ["lord_7"], ["marriage"], ["planner"]),
      item("venus_placement", "Venus placement", "Relationship and union context.", ["planet_placement"], ["venus_placement"], ["marriage"], ["planner"]),
      item("current_dasha", "Current dasha", "Running period for timing and interpretation.", ["timing"], ["current_dasha"], ["marriage"], ["planner"]),
    ],
    optional: [
      item("moon_placement", "Moon placement", "Emotional context.", ["planet_placement"], ["moon_placement"], ["marriage"], ["planner"]),
      item("jupiter_placement", "Jupiter placement", "Supportive spouse/growth context.", ["planet_placement"], ["jupiter_placement"], ["marriage"], ["planner"]),
      item("timing_windows", "Timing windows", "Marriage timing support.", ["timing"], ["timing_windows"], ["marriage"], ["planner"]),
      item("varshaphal", "Varshaphal", "Annual timing support.", ["timing"], ["varshaphal"], ["marriage"], ["planner"]),
      item("marriage_benchmark_examples", "Marriage benchmark examples", "Comparison examples for marriage answers.", ["benchmark"], ["marriage_benchmark_examples"], ["marriage"], ["planner"]),
    ],
    retrievalTags: ["marriage", "house_7", "venus", "dasha"],
    reasoningRuleDomains: ["marriage"],
    benchmarkDomains: ["marriage"],
    allowsTiming: true,
    allowsRemedy: true,
    requiresTimingSource: false,
  },
  money: {
    domain: "money",
    required: [
      item("house_2", "2nd house", "Income and speech house.", ["house"], ["house_2"], ["money"], ["planner"]),
      item("lord_2", "2nd lord", "Income ruler.", ["lord"], ["lord_2"], ["money"], ["planner"]),
      item("house_11", "11th house", "Gains house.", ["house"], ["house_11"], ["money"], ["planner"]),
      item("lord_11", "11th lord", "Gains ruler.", ["lord"], ["lord_11"], ["money"], ["planner"]),
      item("current_dasha", "Current dasha", "Running period for timing and interpretation.", ["timing"], ["current_dasha"], ["money"], ["planner"]),
    ],
    optional: [
      item("jupiter_placement", "Jupiter placement", "Growth and support context.", ["planet_placement"], ["jupiter_placement"], ["money"], ["planner"]),
      item("venus_placement", "Venus placement", "Comfort and resources context.", ["planet_placement"], ["venus_placement"], ["money"], ["planner"]),
      item("timing_windows", "Timing windows", "Timing support.", ["timing"], ["timing_windows"], ["money"], ["planner"]),
      item("money_benchmark_examples", "Money benchmark examples", "Comparison examples for money answers.", ["benchmark"], ["money_benchmark_examples"], ["money"], ["planner"]),
    ],
    retrievalTags: ["money", "house_2", "house_11", "dasha"],
    reasoningRuleDomains: ["money"],
    benchmarkDomains: ["money"],
    allowsTiming: true,
    allowsRemedy: false,
    requiresTimingSource: false,
  },
  foreign: {
    domain: "foreign",
    required: [
      item("house_12", "12th house", "Foreign residence and distance house.", ["house"], ["house_12"], ["foreign"], ["planner"]),
      item("lord_12", "12th lord", "Foreign movement ruler.", ["lord"], ["lord_12"], ["foreign"], ["planner"]),
      item("rahu_placement", "Rahu placement", "Foreign pull and movement context.", ["planet_placement"], ["rahu_placement"], ["foreign"], ["planner"]),
      item("current_dasha", "Current dasha", "Running period for timing and interpretation.", ["timing"], ["current_dasha"], ["foreign"], ["planner"]),
    ],
    optional: [
      item("ketu_placement", "Ketu placement", "Detachment context.", ["planet_placement"], ["ketu_placement"], ["foreign"], ["planner"]),
      item("saturn_placement", "Saturn placement", "Delay and structure context.", ["planet_placement"], ["saturn_placement"], ["foreign"], ["planner"]),
      item("timing_windows", "Timing windows", "Timing support.", ["timing"], ["timing_windows"], ["foreign"], ["planner"]),
      item("foreign_benchmark_examples", "Foreign benchmark examples", "Comparison examples for foreign answers.", ["benchmark"], ["foreign_benchmark_examples"], ["foreign"], ["planner"]),
    ],
    retrievalTags: ["foreign", "house_12", "rahu", "dasha"],
    reasoningRuleDomains: ["foreign"],
    benchmarkDomains: ["foreign"],
    allowsTiming: true,
    allowsRemedy: true,
    requiresTimingSource: false,
  },
  education: {
    domain: "education",
    required: [
      item("house_5", "5th house", "Learning and intelligence house.", ["house"], ["house_5"], ["education"], ["planner"]),
      item("house_9", "9th house", "Higher learning and guidance house.", ["house"], ["house_9"], ["education"], ["planner"]),
      item("mercury_placement", "Mercury placement", "Learning and skill context.", ["planet_placement"], ["mercury_placement"], ["education"], ["planner"]),
      item("jupiter_placement", "Jupiter placement", "Growth and wisdom context.", ["planet_placement"], ["jupiter_placement"], ["education"], ["planner"]),
    ],
    optional: [
      item("current_dasha", "Current dasha", "Running period for timing and interpretation.", ["timing"], ["current_dasha"], ["education"], ["planner"]),
      item("timing_windows", "Timing windows", "Timing support.", ["timing"], ["timing_windows"], ["education"], ["planner"]),
      item("education_benchmark_examples", "Education benchmark examples", "Comparison examples for education answers.", ["benchmark"], ["education_benchmark_examples"], ["education"], ["planner"]),
    ],
    retrievalTags: ["education", "house_5", "house_9", "mercury", "jupiter"],
    reasoningRuleDomains: ["education"],
    benchmarkDomains: ["education"],
    allowsTiming: true,
    allowsRemedy: true,
    requiresTimingSource: false,
  },
  spirituality: {
    domain: "spirituality",
    required: [
      item("house_9", "9th house", "Dharma and guidance house.", ["house"], ["house_9"], ["spirituality"], ["planner"]),
      item("house_12", "12th house", "Inner practice and surrender house.", ["house"], ["house_12"], ["spirituality"], ["planner"]),
      item("jupiter_placement", "Jupiter placement", "Guidance and wisdom context.", ["planet_placement"], ["jupiter_placement"], ["spirituality"], ["planner"]),
      item("ketu_placement", "Ketu placement", "Detachment and spiritual focus context.", ["planet_placement"], ["ketu_placement"], ["spirituality"], ["planner"]),
    ],
    optional: [
      item("safe_remedy_rules", "Safe remedy rules", "Low-risk remedy guardrails.", ["remedy"], ["safe_remedy_rules"], ["spirituality"], ["planner"]),
      item("spiritual_benchmark_examples", "Spiritual benchmark examples", "Comparison examples for spirituality answers.", ["benchmark"], ["spiritual_benchmark_examples"], ["spirituality"], ["planner"]),
    ],
    retrievalTags: ["spirituality", "house_9", "house_12", "jupiter", "ketu", "remedy"],
    reasoningRuleDomains: ["spirituality"],
    benchmarkDomains: ["spirituality"],
    allowsTiming: false,
    allowsRemedy: true,
    requiresTimingSource: false,
  },
  health: {
    domain: "health",
    required: [
      item("house_6", "6th house", "Health strain and recovery house.", ["house"], ["house_6"], ["health"], ["planner"]),
      item("moon_placement", "Moon placement", "Mind-body context.", ["planet_placement"], ["moon_placement"], ["health"], ["planner"]),
      item("lagna", "Lagna", "Core body and constitution anchor.", ["chart_fact"], ["lagna"], ["health"], ["planner"]),
    ],
    optional: [
      item("house_12", "12th house", "Rest and recovery context.", ["house"], ["house_12"], ["health"], ["planner"]),
      item("safe_remedy_rules", "Safe remedy rules", "Non-medical wellbeing guardrails.", ["remedy"], ["safe_remedy_rules"], ["health"], ["planner"]),
    ],
    retrievalTags: ["health", "house_6", "moon", "lagna"],
    reasoningRuleDomains: ["health"],
    benchmarkDomains: ["health"],
    allowsTiming: false,
    allowsRemedy: true,
    requiresTimingSource: false,
  },
  legal: {
    domain: "legal",
    required: [
      item("house_6", "6th house", "Conflict and dispute house.", ["house"], ["house_6"], ["legal"], ["planner"]),
      item("house_8", "8th house", "Risk and litigation house.", ["house"], ["house_8"], ["legal"], ["planner"]),
      item("house_9", "9th house", "Judgment and law context.", ["house"], ["house_9"], ["legal"], ["planner"]),
      item("current_dasha", "Current dasha", "Running period for timing and interpretation.", ["timing"], ["current_dasha"], ["legal"], ["planner"]),
    ],
    optional: [
      item("saturn_placement", "Saturn placement", "Restriction and delay context.", ["planet_placement"], ["saturn_placement"], ["legal"], ["planner"]),
      item("timing_windows", "Timing windows", "Timing support.", ["timing"], ["timing_windows"], ["legal"], ["planner"]),
    ],
    retrievalTags: ["legal", "house_6", "house_8", "house_9", "dasha"],
    reasoningRuleDomains: ["legal"],
    benchmarkDomains: ["legal"],
    allowsTiming: false,
    allowsRemedy: false,
    requiresTimingSource: false,
  },
  safety: {
    domain: "safety",
    required: [],
    optional: [item("safe_response_rules", "Safe response rules", "Safety response guardrails.", ["safety"], ["safe_response_rules"], ["safety"], ["planner"])],
    retrievalTags: ["safety"],
    reasoningRuleDomains: ["safety"],
    benchmarkDomains: ["safety"],
    allowsTiming: false,
    allowsRemedy: false,
    requiresTimingSource: false,
  },
  timing: {
    domain: "timing",
    required: [item("timing_source", "Timing source", "Grounded timing source required for timing claims.", ["timing"], ["timing_source"], ["timing"], ["planner"])],
    optional: [
      item("current_dasha", "Current dasha", "Running period for timing support.", ["timing"], ["current_dasha"], ["timing"], ["planner"]),
      item("varshaphal", "Varshaphal", "Annual timing support.", ["timing"], ["varshaphal"], ["timing"], ["planner"]),
      item("timing_windows", "Timing windows", "Near-term timing support.", ["timing"], ["timing_windows"], ["timing"], ["planner"]),
    ],
    retrievalTags: ["timing", "dasha", "varshaphal"],
    reasoningRuleDomains: ["timing"],
    benchmarkDomains: ["timing"],
    allowsTiming: true,
    allowsRemedy: false,
    requiresTimingSource: true,
  },
  general: {
    domain: "general",
    required: [
      item("lagna", "Lagna", "Core chart anchor for general readings.", ["chart_fact"], ["lagna"], ["general"], ["planner"]),
      item("moon_placement", "Moon placement", "Mind and general experience context.", ["planet_placement"], ["moon_placement"], ["general"], ["planner"]),
    ],
    optional: [
      item("current_dasha", "Current dasha", "Running period for general interpretation.", ["timing"], ["current_dasha"], ["general"], ["planner"]),
      item("general_benchmark_examples", "General benchmark examples", "General comparison examples.", ["benchmark"], ["general_benchmark_examples"], ["general"], ["planner"]),
    ],
    retrievalTags: ["general", "lagna", "moon"],
    reasoningRuleDomains: ["general"],
    benchmarkDomains: ["general"],
    allowsTiming: false,
    allowsRemedy: false,
    requiresTimingSource: false,
  },
};

export function getRequiredDataMatrixEntry(domain: RequiredDataDomain): RequiredDataMatrixEntry {
  return REQUIRED_DATA_MATRIX[domain];
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

function strongestDomainFromTags(tags: string[]): RequiredDataDomain | null {
  const normalized = new Set(tags.map(normalizeLookup));
  const priorities: RequiredDataDomain[] = ["safety", "exact_fact", "timing", "career", "sleep", "marriage", "money", "foreign", "education", "spirituality", "health", "legal", "general"];
  for (const domain of priorities) {
    if (domain === "exact_fact" && normalized.has("exact_fact")) return "exact_fact";
    if (normalized.has(domain)) return domain;
  }
  return null;
}

export function mapAnalyzerToRequiredDataDomain(input: {
  topic?: AnalyzerTopic | string;
  questionType?: AnalyzerQuestionType | string;
  retrievalTags?: string[];
  requiredFacts?: string[];
  needsTiming?: boolean;
  needsRemedy?: boolean;
}): RequiredDataDomain {
  const topic = typeof input.topic === "string" ? normalizeLookup(input.topic) : "";
  const questionType = typeof input.questionType === "string" ? normalizeLookup(input.questionType) : "";
  const retrievalTags = input.retrievalTags ?? [];
  const requiredFacts = input.requiredFacts ?? [];
  const needsTiming = input.needsTiming ?? false;

  if (questionType === "exact_fact") return "exact_fact";
  if (questionType === "unsafe") return "safety";

  if (topic === "career" || topic === "sleep" || topic === "marriage" || topic === "money" || topic === "foreign" || topic === "education" || topic === "spirituality" || topic === "health" || topic === "legal" || topic === "safety") {
    return topic as RequiredDataDomain;
  }

  if (needsTiming && topic === "general") return "timing";

  const strongFromTags = strongestDomainFromTags([...retrievalTags, ...requiredFacts]);
  if (strongFromTags && strongFromTags !== "general") return strongFromTags;

  if (needsTiming) return "timing";
  if (input.needsRemedy && topic === "general") return "general";
  return "general";
}

export function normalizeRequiredDataKey(value: string): string {
  const normalized = value.trim().toLowerCase();
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
  };
  return aliasMap[normalized] ?? normalized;
}
