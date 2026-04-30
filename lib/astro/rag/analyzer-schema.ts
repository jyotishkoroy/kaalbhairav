export type AnalyzerQuestionType =
  | "exact_fact"
  | "interpretive"
  | "timing"
  | "remedy"
  | "unsafe"
  | "general";

export type AnalyzerTopic =
  | "career"
  | "sleep"
  | "marriage"
  | "money"
  | "health"
  | "legal"
  | "safety"
  | "foreign"
  | "spirituality"
  | "education"
  | "family"
  | "general";

export type AnalyzerSource = "ollama" | "deterministic_fallback";

export type AnalyzerResult = {
  language: string;
  topic: AnalyzerTopic;
  questionType: AnalyzerQuestionType;
  riskFlags: string[];
  needsTiming: boolean;
  needsRemedy: boolean;
  requiredFacts: string[];
  retrievalTags: string[];
  shouldAskFollowup: boolean;
  followupQuestion: string | null;
  confidence: number;
  source: AnalyzerSource;
};

export type AnalyzerValidationResult = { ok: true; value: AnalyzerResult } | { ok: false; error: string };

const TOPICS = new Set<AnalyzerTopic>(["career", "sleep", "marriage", "money", "health", "legal", "safety", "foreign", "spirituality", "education", "family", "general"]);
const QUESTION_TYPES = new Set<AnalyzerQuestionType>(["exact_fact", "interpretive", "timing", "remedy", "unsafe", "general"]);
const RISK_FLAGS = new Set(["medical", "legal", "death", "lifespan", "self_harm", "pregnancy", "financial_guarantee", "gemstone_guarantee", "expensive_puja_pressure", "unsafe_remedy", "timing_certainty", "general"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTopic(value: unknown): AnalyzerTopic {
  return typeof value === "string" && TOPICS.has(value as AnalyzerTopic) ? (value as AnalyzerTopic) : "general";
}

function normalizeQuestionType(value: unknown): AnalyzerQuestionType {
  return typeof value === "string" && QUESTION_TYPES.has(value as AnalyzerQuestionType) ? (value as AnalyzerQuestionType) : "general";
}

function normalizeStringArray(value: unknown, lowercase = false): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = lowercase ? item.trim().toLowerCase() : item.trim();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    items.push(normalized);
  }
  return items;
}

function normalizeBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.4;
  return Math.max(0, Math.min(1, value));
}

function normalizeFollowupQuestion(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSource(value: unknown, source?: AnalyzerSource): AnalyzerSource {
  if (value === "ollama" || value === "deterministic_fallback") return value;
  return source ?? "deterministic_fallback";
}

export function normalizeAnalyzerResult(value: unknown, source?: AnalyzerSource): AnalyzerResult | null {
  const validation = validateAnalyzerResult(value, source);
  return validation.ok ? validation.value : null;
}

export function validateAnalyzerResult(value: unknown, source?: AnalyzerSource): AnalyzerValidationResult {
  if (!isObject(value)) return { ok: false, error: "invalid_analyzer_result" };
  const result: AnalyzerResult = {
    language: normalizeString(value.language, "en"),
    topic: normalizeTopic(value.topic),
    questionType: normalizeQuestionType(value.questionType),
    riskFlags: normalizeStringArray(value.riskFlags, true).filter((flag) => RISK_FLAGS.has(flag)),
    needsTiming: normalizeBoolean(value.needsTiming),
    needsRemedy: normalizeBoolean(value.needsRemedy),
    requiredFacts: normalizeStringArray(value.requiredFacts, true),
    retrievalTags: normalizeStringArray(value.retrievalTags, true),
    shouldAskFollowup: normalizeBoolean(value.shouldAskFollowup),
    followupQuestion: normalizeFollowupQuestion(value.followupQuestion),
    confidence: normalizeConfidence(value.confidence),
    source: normalizeSource(value.source, source),
  };
  return { ok: true, value: result };
}

export function buildDeterministicAnalyzerResult(input: {
  question: string;
  language?: string;
  topic?: AnalyzerTopic;
  questionType?: AnalyzerQuestionType;
  riskFlags?: string[];
  needsTiming?: boolean;
  needsRemedy?: boolean;
  requiredFacts?: string[];
  retrievalTags?: string[];
  shouldAskFollowup?: boolean;
  followupQuestion?: string | null;
  confidence?: number;
}): AnalyzerResult {
  const validation = validateAnalyzerResult({
    language: input.language ?? "en",
    topic: input.topic ?? "general",
    questionType: input.questionType ?? "general",
    riskFlags: input.riskFlags ?? [],
    needsTiming: input.needsTiming ?? false,
    needsRemedy: input.needsRemedy ?? false,
    requiredFacts: input.requiredFacts ?? [],
    retrievalTags: input.retrievalTags ?? [],
    shouldAskFollowup: input.shouldAskFollowup ?? false,
    followupQuestion: input.followupQuestion ?? null,
    confidence: input.confidence ?? 0.4,
    source: "deterministic_fallback",
  }, "deterministic_fallback");
  if (!validation.ok) {
    return {
      language: "en",
      topic: "general",
      questionType: "general",
      riskFlags: [],
      needsTiming: false,
      needsRemedy: false,
      requiredFacts: [],
      retrievalTags: [],
      shouldAskFollowup: false,
      followupQuestion: null,
      confidence: 0.4,
      source: "deterministic_fallback",
    };
  }
  return validation.value;
}
