/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

type CompanionDomain =
  | "career"
  | "sleep"
  | "marriage"
  | "money"
  | "general";

export type CompanionMemoryInput = {
  userId?: string;
  profileId?: string | null;
  question: string;
  answer?: string | null;
  domain?: string | null;
  safetyFlags?: string[];
  followUpQuestion?: string | null;
  language?: string | null;
  tone?: string | null;
  existingSummary?: string | null;
  now?: string;
};

export type CompanionMemorySummary = {
  memoryKey: string;
  memorySummary: string;
  domains: string[];
  lastTopic: string | null;
  lastConcern: string | null;
  adviceGiven: string | null;
  openFollowUp: string | null;
  languagePreference: string | null;
  tonePreference: string | null;
  safetyRedactions: string[];
  shouldStore: boolean;
  reason: string;
};

export type CompanionMemoryContext = {
  memorySummary: string | null;
  domains: string[];
  openFollowUp: string | null;
  languagePreference: string | null;
  tonePreference: string | null;
  source: "supabase" | "none";
};

export type CompanionMemoryStoreResult = {
  ok: boolean;
  stored: boolean;
  error?: string;
  memory?: CompanionMemorySummary;
};

export type CompanionMemoryRetrieveResult = {
  ok: boolean;
  context: CompanionMemoryContext;
  error?: string;
};

export type CompanionMemoryRepository = {
  retrieve: (input: {
    userId: string;
    profileId?: string | null;
    domain?: string | null;
    limit?: number;
  }) => Promise<CompanionMemoryRetrieveResult>;
  store: (input: {
    userId: string;
    profileId?: string | null;
    memory: CompanionMemorySummary;
  }) => Promise<CompanionMemoryStoreResult>;
};

const MAX_SUMMARY_CHARS_DEFAULT = 1200;
const MAX_SUMMARY_CHARS_MIN = 200;
const MAX_SUMMARY_CHARS_MAX = 3000;

const SECRET_PATTERNS = [
  { category: "secret_or_token", patterns: [/\bapi[_-]?key\b/i, /\bsecret\b/i, /\btoken\b/i, /\bpassword\b/i, /\bbearer\b/i] },
  { category: "death/lifespan", patterns: [/\bwhen will i die\b/i, /\bwhen i will die\b/i, /\bdeath date\b/i, /\blifespan\b/i, /\blife span\b/i, /\blongevity\b/i] },
  { category: "medical", patterns: [/\bcancer\b/i, /\bdiagnos/i, /\bmedication\b/i, /\bmedicine\b/i, /\bdoctor\b/i, /\bdisease\b/i, /\bhospital\b/i] },
  { category: "legal", patterns: [/\blegal\b/i, /\bcourt\b/i, /\blawsuit\b/i, /\battorney\b/i, /\blawyer\b/i] },
  { category: "self_harm", patterns: [/\bsuicide\b/i, /\bkill myself\b/i, /\bend my life\b/i, /\bself[- ]harm\b/i, /\bwant to die\b/i] },
  { category: "financial_guarantee", patterns: [/\bguarantee\b/i, /\bsure shot\b/i, /\bprofit\b/i, /\bcrypto\b/i, /\bstock\b/i, /\blottery\b/i] },
  { category: "gemstone_guarantee", patterns: [/\bgemstone\b/i, /\bblue sapphire\b/i, /\bstone\b/i] },
  { category: "expensive_puja_pressure", patterns: [/\bpuja\b/i, /\bexpensive\b/i, /\brupees\b/i, /\brs\./i] },
  { category: "precise_birth_data", patterns: [/\bborn at\b/i, /\btime of birth\b/i, /\bplace of birth\b/i, /\bexact birth\b/i, /\bbirth date\b/i] },
  { category: "raw_chart_fact", patterns: [/\bchart\b/i, /\bhouse \d+\b/i, /\blagna\b/i, /\bnakshatra\b/i, /\bplanet\b/i] },
  { category: "sexual/private intimate detail", patterns: [/\bsex\b/i, /\bintimate\b/i, /\bprivate part\b/i] },
];

function normalizeText(input: string, maxChars: number): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function clampMaxChars(maxChars?: number): number {
  if (!Number.isFinite(maxChars ?? NaN)) return MAX_SUMMARY_CHARS_DEFAULT;
  const value = Math.trunc(maxChars as number);
  if (value < MAX_SUMMARY_CHARS_MIN || value > MAX_SUMMARY_CHARS_MAX) return MAX_SUMMARY_CHARS_DEFAULT;
  return value;
}

function inferDomain(input: CompanionMemoryInput): CompanionDomain {
  const explicit = input.domain?.trim().toLowerCase();
  if (explicit === "career" || explicit === "sleep" || explicit === "marriage" || explicit === "money" || explicit === "general") {
    return explicit;
  }
  const text = `${input.domain ?? ""} ${input.question}`.toLowerCase();
  if (text.includes("career") || text.includes("promotion") || text.includes("job") || text.includes("work")) return "career";
  if (text.includes("sleep")) return "sleep";
  if (text.includes("marriage") || text.includes("spouse") || text.includes("relationship") || text.includes("partner")) return "marriage";
  if (text.includes("money") || text.includes("income") || text.includes("salary") || text.includes("budget")) return "money";
  return "general";
}

function topicFromQuestion(question: string, domain: CompanionDomain): string | null {
  const text = question.toLowerCase();
  if (domain === "career") return text.includes("promotion") ? "career promotion" : text.includes("recognition") ? "career recognition" : "career concern";
  if (domain === "sleep") return "sleep routine";
  if (domain === "marriage") return "marriage concern";
  if (domain === "money") return text.includes("budget") ? "budgeting" : "money concern";
  return null;
}

function concernFromQuestion(question: string, domain: CompanionDomain): string | null {
  const normalized = normalizeText(question, 180);
  if (!normalized) return null;
  if (domain === "general") {
    return normalized.length > 90 ? `${normalized.slice(0, 87).trimEnd()}...` : normalized;
  }
  return normalized.length > 120 ? `${normalized.slice(0, 117).trimEnd()}...` : normalized;
}

function adviceFromAnswer(answer?: string | null): string | null {
  if (!answer) return null;
  const normalized = normalizeText(answer, 220);
  return normalized ? `Advice given: ${normalized}` : null;
}

function detectRedactions(input: CompanionMemoryInput): string[] {
  const text = [input.question, input.answer, input.followUpQuestion, input.existingSummary, ...(input.safetyFlags ?? [])].filter(Boolean).join(" ");
  const redactions: string[] = [];
  for (const entry of SECRET_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(text))) redactions.push(entry.category);
  }
  return Array.from(new Set(redactions));
}

export function sanitizeCompanionMemoryText(input: string, options?: { maxChars?: number }): { text: string; redactions: string[] } {
  const maxChars = clampMaxChars(options?.maxChars);
  const redactions = detectRedactions({ question: input, answer: null, safetyFlags: [], followUpQuestion: null, existingSummary: null });
  return { text: normalizeText(input, maxChars), redactions };
}

export function shouldStoreCompanionMemory(input: CompanionMemoryInput): { store: boolean; reason: string; redactions: string[] } {
  const redactions = detectRedactions(input);
  if (redactions.length) return { store: false, reason: `blocked:${redactions.join(",")}`, redactions };
  if (!input.userId?.trim()) return { store: false, reason: "missing_user_id", redactions };
  if (!input.question.trim()) return { store: false, reason: "missing_question", redactions };
  return { store: true, reason: "safe_summary", redactions };
}

export function summarizeCompanionMemory(input: CompanionMemoryInput): CompanionMemorySummary {
  const domain = inferDomain(input);
  const memoryKey = domain === "general" ? "general_preferences" : `${domain}_context`;
  const safety = shouldStoreCompanionMemory(input);
  const topic = topicFromQuestion(input.question, domain);
  const summaryPieces = [
    topic ? `Last topic: ${topic}.` : null,
    concernFromQuestion(input.question, domain) ? `Last concern: ${concernFromQuestion(input.question, domain)}.` : null,
    adviceFromAnswer(input.answer),
    input.followUpQuestion?.trim() ? `Open follow-up: ${normalizeText(input.followUpQuestion, 160)}.` : null,
    input.language?.trim() ? `Language preference: ${normalizeText(input.language, 40)}.` : null,
    input.tone?.trim() ? `Tone preference: ${normalizeText(input.tone, 40)}.` : null,
  ].filter(Boolean) as string[];

  const memorySummary = normalizeText(summaryPieces.join(" "), clampMaxChars(MAX_SUMMARY_CHARS_DEFAULT));
  return {
    memoryKey,
    memorySummary,
    domains: [domain],
    lastTopic: topic,
    lastConcern: concernFromQuestion(input.question, domain),
    adviceGiven: adviceFromAnswer(input.answer),
    openFollowUp: input.followUpQuestion?.trim() ? normalizeText(input.followUpQuestion, 160) : null,
    languagePreference: input.language?.trim() ? normalizeText(input.language, 40) : null,
    tonePreference: input.tone?.trim() ? normalizeText(input.tone, 40) : null,
    safetyRedactions: safety.redactions,
    shouldStore: safety.store,
    reason: safety.reason,
  };
}

export function mergeCompanionMemory(input: { existingSummary?: string | null; next: CompanionMemorySummary; maxChars?: number }): CompanionMemorySummary {
  const maxChars = clampMaxChars(input.maxChars);
  const existing = input.existingSummary?.trim() ? normalizeText(input.existingSummary, maxChars) : null;
  const mergedText = [existing, input.next.memorySummary].filter(Boolean).join(" ");
  return {
    ...input.next,
    memorySummary: normalizeText(mergedText, maxChars),
  };
}

export function buildCompanionMemoryContext(input: CompanionMemorySummary[] | null | undefined): CompanionMemoryContext {
  const memories = (input ?? []).filter((item): item is CompanionMemorySummary => Boolean(item && item.memorySummary.trim()));
  if (!memories.length) {
    return { memorySummary: null, domains: [], openFollowUp: null, languagePreference: null, tonePreference: null, source: "none" };
  }
  const first = memories[0];
  return {
    memorySummary: memories.map((item) => item.memorySummary).join(" "),
    domains: Array.from(new Set(memories.flatMap((item) => item.domains))),
    openFollowUp: first.openFollowUp,
    languagePreference: first.languagePreference,
    tonePreference: first.tonePreference,
    source: "supabase",
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapMemoryRow(row: Record<string, unknown>): CompanionMemorySummary {
  return {
    memoryKey: asString(row.memory_key) ?? "general_preferences",
    memorySummary: asString(row.memory_summary) ?? "",
    domains: Array.isArray(row.domains) ? row.domains.filter((value): value is string => typeof value === "string") : [],
    lastTopic: asString(row.last_topic),
    lastConcern: asString(row.last_concern),
    adviceGiven: asString(row.advice_given),
    openFollowUp: asString(row.open_follow_up),
    languagePreference: asString(row.language_preference),
    tonePreference: asString(row.tone_preference),
    safetyRedactions: Array.isArray(row.safety_redactions) ? row.safety_redactions.filter((value): value is string => typeof value === "string") : [],
    shouldStore: true,
    reason: "retrieved",
  };
}

export function createSupabaseCompanionMemoryRepository(input: {
  supabase: {
    from: (table: string) => unknown;
  };
}): CompanionMemoryRepository {
  return {
    async retrieve({ userId, profileId, domain, limit = 5 }) {
      try {
        const table = input.supabase.from("astro_companion_memory") as {
          select: (columns?: string) => {
            eq: (column: string, value: unknown) => unknown;
            overlaps: (column: string, value: unknown) => unknown;
            order: (column: string, options?: { ascending?: boolean }) => { limit: (count: number) => Promise<{ data: unknown[] | null; error: { message?: string } | null }> };
          };
        };
        let query = table
          .select("id, user_id, profile_id, memory_key, memory_summary, domains, open_follow_up, language_preference, tone_preference, safety_redactions, source_turn_count, last_topic, last_concern, advice_given, updated_at, created_at")
          .eq("user_id", userId);
        if (profileId != null) query = (query as { eq: (column: string, value: unknown) => unknown }).eq("profile_id", profileId) as never;
        if (domain?.trim()) query = (query as { overlaps: (column: string, value: unknown) => unknown }).overlaps("domains", [domain]) as never;
        const result = await (query as { order: (column: string, options?: { ascending?: boolean }) => { limit: (count: number) => Promise<{ data: unknown[] | null; error: { message?: string } | null }> } }).order("updated_at", { ascending: false }).limit(limit);
        if (result.error) return { ok: false, context: { memorySummary: null, domains: [], openFollowUp: null, languagePreference: null, tonePreference: null, source: "none" }, error: result.error.message ?? "retrieval failed" };
        const rows = (result.data ?? []).filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row)).map(mapMemoryRow);
        return { ok: true, context: buildCompanionMemoryContext(rows) };
      } catch (error) {
        return { ok: false, context: { memorySummary: null, domains: [], openFollowUp: null, languagePreference: null, tonePreference: null, source: "none" }, error: error instanceof Error ? error.message : "retrieval failed" };
      }
    },
    async store({ userId, profileId, memory }) {
      try {
        const row = {
          user_id: userId,
          profile_id: profileId ?? null,
          memory_key: memory.memoryKey,
          memory_summary: normalizeText(memory.memorySummary, MAX_SUMMARY_CHARS_MAX),
          domains: memory.domains,
          open_follow_up: memory.openFollowUp,
          language_preference: memory.languagePreference,
          tone_preference: memory.tonePreference,
          safety_redactions: memory.safetyRedactions,
          source_turn_count: 1,
          last_topic: memory.lastTopic,
          last_concern: memory.lastConcern,
          advice_given: memory.adviceGiven,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        const table = input.supabase.from("astro_companion_memory") as {
          upsert: (value: Record<string, unknown>, options?: Record<string, unknown>) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
        };
        const result = await table.upsert(row, { onConflict: "user_id,profile_id,memory_key", ignoreDuplicates: false });
        if (result.error) return { ok: false, stored: false, error: result.error.message ?? "store failed", memory };
        return { ok: true, stored: true, memory };
      } catch (error) {
        return { ok: false, stored: false, error: error instanceof Error ? error.message : "store failed", memory };
      }
    },
  };
}
