import { getAstroRagFlags } from "./feature-flags";
import {
  buildDeterministicAnalyzerResult,
  normalizeAnalyzerResult,
  type AnalyzerResult,
  type AnalyzerTopic,
  type AnalyzerQuestionType,
} from "./analyzer-schema";
import { detectRagSafetyRiskFlags } from "./safety-gate";

export type LocalAnalyzerClientInput = {
  question: string;
  language?: string;
  context?: Record<string, unknown>;
  env?: Record<string, string | undefined>;
  flags?: ReturnType<typeof getAstroRagFlags>;
  fetchImpl?: typeof fetch;
};

export type LocalAnalyzerClientResult = {
  ok: boolean;
  result: AnalyzerResult;
  usedOllama: boolean;
  fallbackUsed: boolean;
  error?: string;
  status?: number;
};

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
};

type FetchLike = (input: string | URL, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<FetchLikeResponse>;

const FOLLOWUP_QUESTION = "Which area should I focus on — career, marriage, money, health, sleep, education, or foreign travel?";

function normalizeQuestion(question: string): string {
  return question.replace(/\s+/g, " ").trim();
}

function isBlank(question: string): boolean {
  return !normalizeQuestion(question);
}

function truncateQuestion(question: string, maxChars: number): string {
  if (question.length <= maxChars) return question;
  return question.slice(0, maxChars);
}

function compactContext(context: Record<string, unknown> | undefined, maxChars = 1500): Record<string, unknown> {
  if (!context) return {};
  try {
    const json = JSON.stringify(context);
    if (json.length <= maxChars) return context;
    const keys = Object.keys(context).slice(0, 12);
    const compact: Record<string, unknown> = { omitted: true };
    for (const key of keys) compact[key] = context[key];
    return compact;
  } catch {
    return {};
  }
}

function lowerIncludes(question: string, patterns: string[]): boolean {
  const normalized = question.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

function addFacts(set: Set<string>, facts: string[]): void {
  for (const fact of facts) {
    if (!fact) continue;
    set.add(fact.trim().toLowerCase());
  }
}

function addTags(set: Set<string>, tags: string[]): void {
  for (const tag of tags) {
    if (!tag) continue;
    set.add(tag.trim().toLowerCase());
  }
}

function hasAny(question: string, patterns: string[]): boolean {
  return lowerIncludes(question, patterns);
}

function hasRequiredAnalyzerShape(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return [
    "language",
    "topic",
    "questionType",
    "riskFlags",
    "needsTiming",
    "needsRemedy",
    "requiredFacts",
    "retrievalTags",
    "shouldAskFollowup",
    "followupQuestion",
    "confidence",
  ].every((key) => key in value);
}

function classifyFallback(question: string, language?: string): AnalyzerResult {
  const normalized = normalizeQuestion(question);
  const lower = normalized.toLowerCase();
  const riskFlags = new Set(detectRagSafetyRiskFlags(normalized));
  const requiredFacts = new Set<string>();
  const retrievalTags = new Set<string>();
  let topic: AnalyzerTopic = "general";
  let questionType: AnalyzerQuestionType = "general";
  let shouldAskFollowup = false;
  let followupQuestion: string | null = null;
  let confidence = 0.4;
  let needsTiming = false;
  let needsRemedy = false;

  const vague = hasAny(lower, ["what will happen", "tell me everything", "general future", "good or bad", "any problem", "future"]);
  if (vague) {
    shouldAskFollowup = true;
    followupQuestion = FOLLOWUP_QUESTION;
    confidence = 0.45;
  }

  const unsafe = riskFlags.has("death") || riskFlags.has("lifespan") || riskFlags.has("medical") || riskFlags.has("self_harm") || riskFlags.has("legal") || riskFlags.has("financial_guarantee") || riskFlags.has("gemstone_guarantee") || riskFlags.has("expensive_puja_pressure");

  if (unsafe) {
    topic = riskFlags.has("medical") ? "health" : riskFlags.has("legal") ? "legal" : riskFlags.has("financial_guarantee") || riskFlags.has("gemstone_guarantee") ? "money" : "safety";
    questionType = "unsafe";
    shouldAskFollowup = false;
    followupQuestion = null;
    confidence = 0.85;
  }

  const q = lower;
  const exactFactTriggers = ["lagna", "ascendant", "rasi", "moon sign", "where is sun", "where is moon", "where is mars", "where is mercury", "where is jupiter", "where is venus", "where is saturn", "rahu", "ketu", "10th house", "lord of", "ruler of", "mahadasha", "antardasha", "nakshatra", "sarvashtakavarga", "sav", "with mercury", "conjunct"];
  if (exactFactTriggers.some((trigger) => q.includes(trigger)) && !unsafe) {
    questionType = "exact_fact";
    confidence = 0.85;
    addTags(retrievalTags, ["exact_fact"]);
    if (q.includes("lagna") || q.includes("ascendant")) addFacts(requiredFacts, ["lagna"]);
    if (q.includes("rasi") || q.includes("moon sign")) addFacts(requiredFacts, ["moon_sign"]);
    if (q.includes("where is sun")) addFacts(requiredFacts, ["planet_placement:sun", "sun_placement"]);
    if (q.includes("where is moon")) addFacts(requiredFacts, ["planet_placement:moon", "moon_placement"]);
    if (q.includes("where is mars")) addFacts(requiredFacts, ["planet_placement:mars"]);
    if (q.includes("where is mercury")) addFacts(requiredFacts, ["planet_placement:mercury"]);
    if (q.includes("where is jupiter")) addFacts(requiredFacts, ["planet_placement:jupiter"]);
    if (q.includes("where is venus")) addFacts(requiredFacts, ["planet_placement:venus"]);
    if (q.includes("where is saturn")) addFacts(requiredFacts, ["planet_placement:saturn"]);
    if (q.includes("10th house")) addFacts(requiredFacts, ["house:10", "house_10", "lord:10", "lord_10"]);
    if (q.includes("lord of") || q.includes("ruler of")) addFacts(requiredFacts, ["lord_10"]);
    if (q.includes("mahadasha") || q.includes("antardasha")) addFacts(requiredFacts, ["current_dasha"]);
    if (q.includes("nakshatra")) addFacts(requiredFacts, ["moon_nakshatra"]);
    if (q.includes("sav") || q.includes("sarvashtakavarga")) addFacts(requiredFacts, ["sav"]);
    if (q.includes("with mercury") || q.includes("conjunct")) {
      addTags(retrievalTags, ["co_presence", "moon", "mercury"]);
      addFacts(requiredFacts, ["co_presence:moon_mercury"]);
    }
  }

  const foreignTriggers = ["foreign", "abroad", "overseas", "relocation", "remote company", "visa"];
  if (foreignTriggers.some((trigger) => q.includes(trigger)) && topic === "general" && !unsafe) {
    topic = "foreign";
    confidence = 0.75;
    addFacts(requiredFacts, ["house_12", "rahu_placement", "lord_12", "current_dasha"]);
    addTags(retrievalTags, ["foreign", "house_12", "rahu", "dasha"]);
  }

  const marriageTriggers = ["marriage", "married", "marry", "spouse", "wife", "husband", "relationship", "love", "partner"];
  if (marriageTriggers.some((trigger) => q.includes(trigger)) && topic === "general" && !unsafe) {
    topic = "marriage";
    questionType = hasAny(q, ["when ", " when", "date", "year", "timing"]) ? "timing" : "interpretive";
    needsTiming = needsTiming || questionType === "timing";
    confidence = 0.75;
    addFacts(requiredFacts, ["house_7", "lord_7", "venus_placement", "current_dasha"]);
    addTags(retrievalTags, ["marriage", "house_7", "venus", "dasha"]);
  }

  const careerTriggers = ["promotion", "job", "work", "career", "recognition", "salary", "boss", "business", "office"];
  if (careerTriggers.some((trigger) => q.includes(trigger)) && topic === "general" && !unsafe) {
    topic = "career";
    questionType = hasAny(q, ["when ", " when", "date", "month", "year", "timing"]) ? "timing" : "interpretive";
    needsTiming = questionType === "timing";
    confidence = 0.75;
    addFacts(requiredFacts, ["lagna", "house_10", "lord_10", "sun_placement", "house_11", "current_dasha"]);
    addTags(retrievalTags, ["career", "house_10", "house_11", "dasha"]);
  }

  const sleepTriggers = ["sleep", "insomnia", "bad sleep", "remedy", "peace", "anxiety at night"];
  if (sleepTriggers.some((trigger) => q.includes(trigger)) && topic === "general" && !unsafe) {
    topic = "sleep";
    questionType = hasAny(q, ["remedy", "mantra", "what to do", "puja"]) ? "remedy" : "interpretive";
    needsRemedy = questionType === "remedy";
    confidence = 0.75;
    addFacts(requiredFacts, ["house_12", "moon_placement", "house_6", "safe_remedy_rules"]);
    addTags(retrievalTags, ["sleep", "moon", "house_12", "remedy"]);
  }

  const moneyTriggers = ["money", "income", "wealth", "debt", "loan", "savings", "profit"];
  if (moneyTriggers.some((trigger) => q.includes(trigger)) && topic === "general" && !unsafe) {
    topic = "money";
    questionType = "interpretive";
    confidence = 0.75;
    addFacts(requiredFacts, ["house_2", "house_11", "lord_2", "lord_11", "current_dasha"]);
    addTags(retrievalTags, ["money", "house_2", "house_11", "dasha"]);
    if (hasAny(q, ["stock", "crypto", "lottery", "guarantee"])) riskFlags.add("financial_guarantee");
  }

  const educationTriggers = ["education", "exam", "study", "college", "degree", "learning"];
  if (educationTriggers.some((trigger) => q.includes(trigger)) && topic === "general" && !unsafe) {
    topic = "education";
    confidence = 0.75;
    addFacts(requiredFacts, ["house_5", "house_9", "mercury_placement", "jupiter_placement"]);
    addTags(retrievalTags, ["education", "house_5", "house_9", "mercury", "jupiter"]);
  }

  const spiritualityTriggers = ["spiritual", "mantra", "meditation", "guru", "puja"];
  if (spiritualityTriggers.some((trigger) => q.includes(trigger)) && topic === "general" && !unsafe) {
    topic = "spirituality";
    questionType = hasAny(q, ["remedy", "mantra", "puja"]) ? "remedy" : questionType;
    needsRemedy = needsRemedy || questionType === "remedy";
    confidence = 0.75;
    addTags(retrievalTags, ["spirituality", "remedy"]);
  }

  if (!riskFlags.size) riskFlags.add("general");
  if (questionType === "general" && !shouldAskFollowup && !unsafe && !vague) confidence = 0.4;

  return buildDeterministicAnalyzerResult({
    question: normalized,
    language,
    topic,
    questionType,
    riskFlags: [...riskFlags],
    needsTiming,
    needsRemedy,
    requiredFacts: [...requiredFacts],
    retrievalTags: [...retrievalTags],
    shouldAskFollowup,
    followupQuestion,
    confidence,
  });
}

function getAbortControllerCtor(): typeof AbortController | null {
  return typeof globalThis.AbortController === "function" ? globalThis.AbortController : null;
}

function getSecret(env: Record<string, string | undefined>): string {
  return env.TARAYAI_LOCAL_SECRET || env.ASTRO_LOCAL_ANALYZER_SECRET || "";
}

async function readJsonResponse(response: FetchLikeResponse): Promise<unknown> {
  return response.json();
}

export async function analyzeQuestionWithLocalAnalyzer(input: LocalAnalyzerClientInput): Promise<LocalAnalyzerClientResult> {
  const flags = input.flags ?? getAstroRagFlags(input.env);
  const fetchImpl = (input.fetchImpl ?? globalThis.fetch) as FetchLike;
  const question = typeof input.question === "string" ? input.question : "";
  const language = input.language || "en";
  const env = input.env ?? {};
  const fallback = (error?: string): LocalAnalyzerClientResult => ({
    ok: !error,
    result: deterministicAnalyzeQuestion(question, language),
    usedOllama: false,
    fallbackUsed: true,
    error,
  });

  if (!flags.localAnalyzerEnabled) return fallback();
  if (isBlank(question)) {
    const result = buildDeterministicAnalyzerResult({
      question,
      language,
      shouldAskFollowup: true,
      followupQuestion: "Please provide a specific astrology question.",
      confidence: 0.45,
    });
    return { ok: true, result, usedOllama: false, fallbackUsed: true };
  }

  const secret = getSecret(env);
  if (!secret) return fallback("missing_local_analyzer_secret");

  const baseUrl = flags.localAnalyzerBaseUrl.replace(/\/$/, "");
  const requestBody = {
    question: truncateQuestion(question, flags.localAnalyzerMaxInputChars),
    language,
    context: compactContext(input.context),
  };
  const headers = {
    "content-type": "application/json",
    "X-tarayai-local-secret": secret,
  };

  const controllerCtor = getAbortControllerCtor();
  const controller = controllerCtor ? new controllerCtor() : null;
  const timeoutMs = flags.localAnalyzerTimeoutMs;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const request = fetchImpl(`${baseUrl}/analyze-question`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      ...(controller ? { signal: controller.signal } : {}),
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller?.abort();
        reject(Object.assign(new Error("timeout"), { name: "AbortError" }));
      }, timeoutMs);
    });
    const response = (await Promise.race([request, timeoutPromise])) as FetchLikeResponse;
    if (!response || !response.ok) {
      return { ...fallback(`proxy_status_${response?.status ?? 0}`), status: response?.status ?? 0 };
    }
    const payload = await readJsonResponse(response);
    if (!hasRequiredAnalyzerShape(payload)) {
      return { ...fallback("invalid_analyzer_schema"), status: response.status };
    }
    const validated = normalizeAnalyzerResult(payload, "ollama");
    if (!validated) {
      return { ...fallback("invalid_analyzer_schema"), status: response.status };
    }
    if ((payload as { fallbackRecommended?: unknown } | null)?.fallbackRecommended === true) {
      return { ...fallback("fallback_recommended"), status: response.status };
    }
    return {
      ok: true,
      result: validated,
      usedOllama: true,
      fallbackUsed: false,
      status: response.status,
    };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "timeout" : "proxy_request_failed";
    return { ...fallback(message), status: error instanceof Error && error.name === "AbortError" ? 504 : undefined };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function deterministicAnalyzeQuestion(question: string, language?: string): AnalyzerResult {
  return classifyFallback(question, language);
}

export type { AnalyzerResult } from "./analyzer-schema";
