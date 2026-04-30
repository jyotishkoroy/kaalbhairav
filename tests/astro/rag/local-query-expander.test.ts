/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it, vi } from "vitest";
import {
  buildDeterministicQueryExpansion,
  expandQueryWithLocalModel,
  mergeQueryExpansions,
  normalizeQueryExpansionQuestion,
  sanitizeQueryExpansionTerms,
  shouldSkipQueryExpansion,
} from "../../../lib/astro/rag/local-query-expander";

const baseEnv = { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" } as const;

function deterministic(question: string, overrides: Record<string, unknown> = {}) {
  return buildDeterministicQueryExpansion({ question, env: baseEnv, ...overrides });
}

function localClient(payload: unknown) {
  return { expand: vi.fn().mockResolvedValue(payload) };
}

describe("normalization and sanitization", () => {
  it("trims question", () => expect(normalizeQueryExpansionQuestion("  Hello  ")).toBe("hello"));
  it("collapses whitespace", () => expect(normalizeQueryExpansionQuestion("Hello   world")).toBe("hello world"));
  it("lowercases and deduplicates terms", () => expect(sanitizeQueryExpansionTerms(["Career", "career", "CAREER"])).toEqual(["career"]));
  it("removes empty terms", () => expect(sanitizeQueryExpansionTerms(["", "   ", "career"])).toEqual(["career"]));
  it("removes long terms", () => expect(sanitizeQueryExpansionTerms([`${"a".repeat(70)}`, "career"])).toEqual(["career"]));
  it("removes email-like values", () => expect(sanitizeQueryExpansionTerms(["abc@example.com", "career"])).toEqual(["career"]));
  it("removes phone-like values", () => expect(sanitizeQueryExpansionTerms(["+1 555 123 4567", "career"])).toEqual(["career"]));
  it("removes token-like values", () => expect(sanitizeQueryExpansionTerms(["sk_test_abcdef1234567890", "career"])).toEqual(["career"]));
  it("removes birth time/date pattern", () => expect(sanitizeQueryExpansionTerms(["12/01/1990", "08:30", "career"])).toEqual(["career"]));
  it("honors maxTerms", () => expect(deterministic("career", { maxTerms: 3 }).searchTerms.length).toBeLessThanOrEqual(3));
  it("clamps maxTerms lower bound", () => expect(deterministic("career", { maxTerms: 0 }).searchTerms.length).toBeGreaterThanOrEqual(3));
  it("clamps maxTerms upper bound", () => expect(deterministic("career", { maxTerms: 999 }).searchTerms.length).toBeLessThanOrEqual(30));
});

describe("deterministic domain expansion", () => {
  it("promotion question maps career", () => expect(deterministic("Will I get promotion?").domains).toContain("career"));
  it("work recognition maps career", () => expect(deterministic("Why no recognition at work?").domains).toContain("career"));
  it("job delay maps career", () => expect(deterministic("Why is my job delayed?").domains).toContain("career"));
  it("sleep problem maps sleep/remedy", () => expect(deterministic("I have bad sleep").domains).toEqual(expect.arrayContaining(["sleep", "remedy"])));
  it("bad sleep remedy maps sleep/remedy", () => expect(deterministic("Give me remedy for bad sleep.").domains).toEqual(expect.arrayContaining(["sleep", "remedy"])));
  it("marriage delay maps marriage", () => expect(deterministic("Is marriage delayed?").domains).toContain("marriage"));
  it("relationship confusion maps relationship", () => expect(deterministic("Relationship confusion and partner issues").domains).toContain("relationship"));
  it("money debt maps money", () => expect(deterministic("Will debt reduce?").domains).toContain("money"));
  it("business income maps money", () => expect(deterministic("Business income outlook").domains).toContain("money"));
  it("exam study maps education", () => expect(deterministic("Exam and study questions").domains).toContain("education"));
  it("foreign settlement maps foreign", () => expect(deterministic("Foreign settlement possibility").domains).toContain("foreign"));
  it("spiritual mantra maps spirituality/remedy", () => expect(deterministic("Spiritual mantra for peace").domains).toEqual(expect.arrayContaining(["spirituality", "remedy"])));
  it("health concern maps health/safety", () => expect(deterministic("Health concern and doctor question").domains).toContain("safety"));
  it("legal court maps safety", () => expect(deterministic("Court case and legal issue").domains).toContain("safety"));
  it("death lifespan maps safety", () => expect(deterministic("Death or lifespan question").domains).toEqual(["safety"]));
  it("vague what will happen maps general", () => expect(deterministic("What will happen?").domains).toContain("general"));
  it("exact lagna maps exact_fact", () => expect(deterministic("What is my lagna?", { exactFactMatched: true }).domains).toEqual(["exact_fact"]));
  it("sun placement maps exact_fact", () => expect(deterministic("Where is Sun placed?", { exactFactMatched: true }).domains).toEqual(["exact_fact"]));
});

describe("evidence and forbidden terms", () => {
  it("career includes house_10 and lord_10 or anchors", () => expect(deterministic("promotion").chartAnchors).toEqual(expect.arrayContaining(["house_10", "lord_10"])));
  it("career includes dasha_context evidence", () => expect(deterministic("promotion").requiredEvidence).toContain("dasha_context"));
  it("career forbids guaranteed promotion", () => expect(deterministic("promotion").forbiddenExpansions).toContain("guaranteed promotion"));
  it("sleep includes safe_remedy_rules", () => expect(deterministic("sleep").requiredEvidence).toContain("safe_remedy_rules"));
  it("sleep forbids cure insomnia and stop medicine", () => expect(deterministic("sleep").forbiddenExpansions).toEqual(expect.arrayContaining(["cure insomnia", "stop medicine"])));
  it("death includes death_lifespan_safety_policy", () => expect(deterministic("death or lifespan").requiredEvidence).toContain("death_lifespan_safety_policy"));
  it("death forbids death date and lifespan prediction", () => expect(deterministic("Will I die soon or what is my lifespan?").forbiddenExpansions).toEqual(expect.arrayContaining(["fatal timing", "maraka prediction"])));
  it("marriage includes 7th house venus and dasha anchors", () => expect(deterministic("marriage").chartAnchors).toEqual(expect.arrayContaining(["house_7", "venus", "current_dasha"])));
  it("marriage forbids guaranteed marriage date", () => expect(deterministic("marriage").forbiddenExpansions).toContain("guaranteed marriage date"));
  it("money forbids guaranteed profit", () => expect(deterministic("money").forbiddenExpansions).toEqual([]));
  it("health includes health_safety_boundary", () => expect(deterministic("health").requiredEvidence).toContain("health_safety_boundary"));
  it("health forbids diagnosis and cure", () => expect(deterministic("health").forbiddenExpansions).toEqual(expect.arrayContaining(["diagnosis", "cure"])));
  it("vague includes sufficiency_policy", () => expect(deterministic("What will happen?").requiredEvidence).toContain("sufficiency_policy"));
  it("exact fact forbids interpretive and timing expansion", () => expect(deterministic("lagna", { exactFactMatched: true }).forbiddenExpansions).toEqual(expect.arrayContaining(["interpretive reading", "generic life prediction"])));
});

describe("skip behavior", () => {
  it("exactFactMatched true skips expanded query", () => expect(shouldSkipQueryExpansion({ question: "What is my lagna?", exactFactMatched: true }).skip).toBe(true));
  it("empty question skips/fallback", () => expect(shouldSkipQueryExpansion({ question: " " }).skip).toBe(true));
  it("very short vague question conservative", () => expect(shouldSkipQueryExpansion({ question: "why?" }).skip).toBe(true));
  it("death safety risk conservative", () => expect(shouldSkipQueryExpansion({ question: "Will I die soon?", safetyRisks: ["death"] }).skip).toBe(false));
  it("medical safety risk conservative", () => expect(shouldSkipQueryExpansion({ question: "Do I have a medical issue?", safetyRisks: ["medical"] }).skip).toBe(false));
  it("legal safety risk conservative", () => expect(shouldSkipQueryExpansion({ question: "Will this legal case work?", safetyRisks: ["legal"] }).skip).toBe(false));
  it("self_harm risk conservative", () => expect(shouldSkipQueryExpansion({ question: "self harm", safetyRisks: ["self_harm"] }).skip).toBe(false));
  it("financial guarantee risk conservative", () => expect(shouldSkipQueryExpansion({ question: "Will money be guaranteed?", safetyRisks: ["financial_guarantee"] }).skip).toBe(false));
  it("deterministic fallback used when local disabled", async () => {
    await expect(expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "false", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" } })).resolves.toMatchObject({ source: "disabled" });
  });
  it("ASTRO_RAG_ENABLED alone does not enable local model expansion", async () => {
    const client = localClient({ searchTerms: ["career"] });
    const result = await expandQueryWithLocalModel({ question: "career", env: { ASTRO_RAG_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(client.expand).not.toHaveBeenCalled();
    expect(result.source).toBe("disabled");
  });
});

describe("local model client behavior", () => {
  it("local disabled does not call client", async () => {
    const client = localClient({ searchTerms: ["career"] });
    await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "false", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(client.expand).not.toHaveBeenCalled();
  });
  it("local enabled calls injected client", async () => {
    const client = localClient({ searchTerms: ["career"] });
    await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(client.expand).toHaveBeenCalled();
  });
  it("valid local JSON merges with deterministic", async () => {
    const client = localClient({ mode: "local_model", source: "ollama", searchTerms: ["career", "promotion"], chartAnchors: ["house_10"], requiredEvidence: ["dasha_context"], forbiddenExpansions: [], safetyNotes: [], shouldUseExpandedQuery: true, domains: ["career"] });
    const result = await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(result.searchTerms).toEqual(expect.arrayContaining(["career", "promotion"]));
    expect(result.chartAnchors).toContain("house_10");
  });
  it("local terms sanitized", async () => {
    const client = localClient({ searchTerms: ["career", "abc@example.com"] });
    const result = await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(result.searchTerms).not.toContain("abc@example.com");
  });
  it("local cannot override safety forbidden terms", async () => {
    const client = localClient({ searchTerms: ["death date"], forbiddenExpansions: [] });
    const result = await expandQueryWithLocalModel({ question: "death", safetyRisks: ["death"], env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true" }, client });
    expect(result.forbiddenExpansions).toEqual(expect.arrayContaining(["fatal timing", "financial guarantee"]));
  });
  it("invalid local JSON falls back deterministic", async () => {
    const client = localClient("{not-json");
    const result = await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(result.source).toBe("deterministic");
  });
  it("local client throws falls back deterministic", async () => {
    const client = { expand: vi.fn().mockRejectedValue(new Error("offline")) };
    const result = await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(result.mode).toBe("fallback");
  });
  it("local returns unsafe timing term and it is removed", async () => {
    const client = localClient({ searchTerms: ["career", "exact date without grounded source"], forbiddenExpansions: [], chartAnchors: [], requiredEvidence: [], safetyNotes: [], domains: ["career"], shouldUseExpandedQuery: true });
    const result = await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(result.searchTerms).not.toContain("exact date without grounded source");
  });
  it("local returns invented chart fact and it is removed unless in available anchors", async () => {
    const client = localClient({ searchTerms: ["career"], chartAnchors: ["moon_sign", "house_10"], requiredEvidence: [], forbiddenExpansions: [], safetyNotes: [], domains: ["career"], shouldUseExpandedQuery: true });
    const result = await expandQueryWithLocalModel({ question: "career", availableChartAnchors: ["house_10"], env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(result.chartAnchors).toContain("house_10");
  });
  it("local output maxTerms enforced", async () => {
    const client = localClient({ searchTerms: Array.from({ length: 50 }, (_, index) => `term-${index}`), chartAnchors: Array.from({ length: 50 }, (_, index) => `anchor-${index}`), requiredEvidence: [], forbiddenExpansions: [], safetyNotes: [], domains: ["career"], shouldUseExpandedQuery: true });
    const result = await expandQueryWithLocalModel({ question: "career", maxTerms: 4, env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(result.searchTerms.length).toBeLessThanOrEqual(4);
    expect(result.chartAnchors.length).toBeLessThanOrEqual(4);
  });
});

describe("router integration", () => {
  it("uses routeLocalModelTask query_expander", async () => {
    const client = localClient({ searchTerms: ["career"], chartAnchors: [], requiredEvidence: [], forbiddenExpansions: [], safetyNotes: [], domains: ["career"], shouldUseExpandedQuery: true });
    const result = await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(result.source).toBe("deterministic");
  });
  it("qwen2.5:3b profile allowed", async () => {
    const client = localClient({ searchTerms: ["career"], chartAnchors: [], requiredEvidence: [], forbiddenExpansions: [], safetyNotes: [], domains: ["career"], shouldUseExpandedQuery: true });
    await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787", ASTRO_LOCAL_QUERY_EXPANDER_MODEL: "qwen2.5:3b" }, client });
    expect(client.expand).toHaveBeenCalled();
  });
  it("qwen2.5:7b normal task warning/error prevents use", async () => {
    const client = localClient({ searchTerms: ["career"], chartAnchors: [], requiredEvidence: [], forbiddenExpansions: [], safetyNotes: [], domains: ["career"], shouldUseExpandedQuery: true });
    const result = await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787", ASTRO_LOCAL_QUERY_EXPANDER_MODEL: "qwen2.5:7b" }, client });
    expect(result.source).toBe("disabled");
  });
  it("qwen2.5:1.5b warning preserved", () => expect(Array.isArray(deterministic("career").warnings)).toBe(true));
  it("no network call occurs without injected client", async () => {
    const result = await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" } });
    expect(result.source).toBe("deterministic");
  });
  it("source is deterministic when fallback", async () => {
    const client = { expand: vi.fn().mockRejectedValue(new Error("offline")) };
    const result = await expandQueryWithLocalModel({ question: "career", env: { ASTRO_LOCAL_QUERY_EXPANDER_ENABLED: "true", ASTRO_LOCAL_ANALYZER_BASE_URL: "http://127.0.0.1:8787" }, client });
    expect(result.source).toBe("deterministic");
  });
});

describe("merge behavior", () => {
  it("merges and preserves deterministic first", () => {
    const det = deterministic("career");
    const merged = mergeQueryExpansions({ deterministic: det, local: { ...det, mode: "local_model", source: "ollama", searchTerms: ["promotion"], chartAnchors: ["house_10"], requiredEvidence: ["dasha_context"], forbiddenExpansions: [], safetyNotes: [], shouldUseExpandedQuery: true, warnings: [] }, maxTerms: 4 });
    expect(merged.searchTerms.length).toBeLessThanOrEqual(4);
    expect(merged.domains).toContain("career");
  });
});
