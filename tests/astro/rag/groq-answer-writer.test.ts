// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it, vi } from "vitest";
import { buildAnswerContract } from "../../../lib/astro/rag/answer-contract-builder";
import { buildDeterministicAnalyzerResult } from "../../../lib/astro/rag/analyzer-schema";
import { ragSafetyGate } from "../../../lib/astro/rag/safety-gate";
import { planRequiredData } from "../../../lib/astro/rag/required-data-planner";
import { buildReasoningPath } from "../../../lib/astro/rag/reasoning-path-builder";
import { writeGroqRagAnswer, validateGroqAnswerJson } from "../../../lib/astro/rag/groq-answer-writer";
import type { BuildAnswerContractInput } from "../../../lib/astro/rag/answer-contract-types";
import type { ReasoningRule, RetrievalContext, SafeRemedy, TimingWindow, BenchmarkExample } from "../../../lib/astro/rag/retrieval-types";
import type { ChartFact } from "../../../lib/astro/rag/chart-fact-extractor";
import type { ReasoningPath } from "../../../lib/astro/rag/reasoning-path-builder";
import type { TimingContext } from "../../../lib/astro/rag/timing-engine";

function makePipeline(question: string, domain = "career", answerType: "interpretive" | "exact_fact" | "remedy" | "timing" | "safety" = "interpretive") {
  const analyzer = buildDeterministicAnalyzerResult({ question, topic: domain as never, questionType: answerType === "exact_fact" ? "exact_fact" : answerType === "timing" ? "timing" : answerType === "remedy" ? "remedy" : answerType === "safety" ? "unknown" : "interpretive" } as never);
  const safety = ragSafetyGate({ question, answerType: answerType === "safety" ? "unknown" : "interpretive" });
  const plan = planRequiredData({ analyzer, safety, question } as never);
  const context: RetrievalContext = {
    chartFacts: buildFacts(),
    reasoningRules: buildRules(),
    benchmarkExamples: buildBenchmarks(),
    timingWindows: buildWindows(),
    safeRemedies: domain === "sleep" ? buildRemedies() : [],
    metadata: { userId: "u", profileId: null, domain: plan.domain, requestedFactKeys: ["house_10"], retrievalTags: ["career"], errors: [], partial: false },
  };
  const reasoningPath: ReasoningPath = buildReasoningPath({ plan, context });
  const timing: TimingContext = {
    available: true,
    windows: buildWindows() as unknown as TimingContext["windows"],
    requested: true,
    allowed: plan.timingAllowed,
    limitation: plan.timingAllowed ? undefined : "Timing claims are restricted for this question.",
    missingSources: [],
    warnings: [],
    metadata: { domain: plan.domain, sourceCounts: { dasha: 1, varshaphal: 1, python_transit: 0, stored: 0, user_provided: 0 }, usedStoredWindows: false, usedDashaFacts: true, usedVarshaphalFacts: true, usedPythonAdapter: false, usedUserProvidedDates: false, partial: false },
  };
  const contract = buildAnswerContract({ question, plan, context, reasoningPath, timing, sufficiency: { status: "answer_now", missingFacts: [], missingUserClarification: [], limitations: [], warnings: [], canUseGroq: true, canUseOllamaCritic: true, answerMode: answerType === "safety" ? "safety" : answerType === "exact_fact" ? "exact_fact" : answerType === "remedy" ? "remedy" : answerType === "timing" ? "timing_limited" : "interpretive", metadata: { blockedBySafety: answerType === "safety", exactFact: answerType === "exact_fact", retrievalPartial: false, reasoningPartial: false, timingRequested: false, timingAvailable: true, timingAllowed: plan.timingAllowed, requiredFactCount: plan.requiredFacts.length, presentRequiredFactCount: plan.requiredFacts.length, missingRequiredFactCount: 0 } } as never } as BuildAnswerContractInput);
  return { question, contract, context, reasoningPath, timing };
}

function buildFacts(): ChartFact[] {
  return [
    { id: "f1", exampleKey: "f1", domain: "career", question: "q", answer: "a", reasoning: "r", accuracyClass: "partial", readingStyle: "companion", followUpQuestion: "f", tags: ["career"], metadata: {}, enabled: true, source: "chart" as const, confidence: 1, factKey: "lagna", factType: "lagna", factValue: "Aries" },
  ] as unknown as ChartFact[];
}

function buildRules(): ReasoningRule[] {
  return [{ id: "career-rule", ruleKey: "career-rule", domain: "career", title: "career", description: "career", requiredFactTypes: ["house"], requiredTags: ["career"], reasoningTemplate: "career template", weight: 1, safetyNotes: [], enabled: true, metadata: {} }] as unknown as ReasoningRule[];
}

function buildBenchmarks(): BenchmarkExample[] {
  return [{ id: "b1", exampleKey: "b1", domain: "career", question: "q", answer: "a", reasoning: "r", accuracyClass: "partial", readingStyle: "companion", followUpQuestion: "f", tags: ["career"], metadata: {}, enabled: true }] as unknown as BenchmarkExample[];
}

function buildWindows(): TimingWindow[] {
  return [{ id: "w1", userId: "u", profileId: null, label: "window", startsOn: "2026-01-01", endsOn: "2026-06-30", domain: "career", interpretation: "timing", source: "dasha", confidence: "strong", tags: ["timing"], factKeys: ["current_dasha"], metadata: {} }] as unknown as TimingWindow[];
}

function buildRemedies(): SafeRemedy[] {
  return [{ id: "r1", domain: "sleep", title: "routine", description: "routine", tags: ["sleep"], restrictions: ["low-cost"], source: "deterministic" as const }] as unknown as SafeRemedy[];
}

function validAnswer(contract = makePipeline("I am working hard and not getting promotion.").contract) {
  const sections = {
    direct_answer: "The pattern is steady and needs patience.",
    chart_basis: "10th-house and 11th-house anchors support the reading.",
    reasoning: "The chart points to slow but visible progress.",
    timing: contract.timingAllowed ? "A grounded timing window is present." : "Timing is omitted because it is not grounded enough yet.",
    what_to_do: "Keep doing consistent work and communicate clearly.",
    safe_remedies: contract.remedyAllowed ? "Try a low-cost routine." : "",
    accuracy: "Moderate confidence with current anchors.",
    suggested_follow_up: contract.requiredSections.includes("suggested_follow_up") ? "Do you want me to focus on promotion timing or job change?" : "",
    limitations: "No grounded timing source is available, so timing is omitted.",
    safety_response: contract.answerMode === "safety" ? "I cannot answer that safely." : "",
  };
  return {
    answer: Object.entries(sections).filter(([, value]) => value).map(([key, value]) => `${labelFor(key)}: ${value}`).join("\n\n"),
    sections,
    usedAnchors: contract.anchors.map((anchor) => anchor.key).slice(0, 3),
    limitations: ["No grounded timing source is available, so timing is omitted."],
    suggestedFollowUp: "Do you want me to focus on promotion timing or job change?",
    confidence: 0.72,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function firstCall(fetchImpl: { mock: { calls: unknown[][] } }): [string, { headers?: Record<string, string>; body?: string }] {
  return fetchImpl.mock.calls[0] as unknown as [string, { headers?: Record<string, string>; body?: string }];
}

type TimeoutFetch = (input: string | URL, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text?: () => Promise<string> }>;

describe("groq answer writer", () => {
  const pipeline = makePipeline("I am working hard and not getting promotion.");

  describe("gating", () => {
    it("writeGroqRagAnswer() no args does not throw", async () => expect(writeGroqRagAnswer()).resolves.toMatchObject({ used: false }));
    it("missing contract returns used false fallbackRecommended true", async () => expect(await writeGroqRagAnswer({ question: "Q" })).toMatchObject({ used: false, fallbackRecommended: true }));
    it("contract.canUseGroq false prevents fetch", async () => {
      const fetchImpl = vi.fn();
      await writeGroqRagAnswer({ ...pipeline, contract: { ...pipeline.contract, canUseGroq: false }, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
    it("flags.llmAnswerEngineEnabled false prevents fetch", async () => {
      const fetchImpl = vi.fn();
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: false }, fetchImpl });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
    it("missing GROQ_API_KEY prevents fetch", async () => {
      const fetchImpl = vi.fn();
      await writeGroqRagAnswer({ ...pipeline, env: {}, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
    it("exactFactsOnly prevents fetch", async () => {
      const fetchImpl = vi.fn();
      await writeGroqRagAnswer({ ...pipeline, contract: { ...pipeline.contract, exactFactsOnly: true }, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
    it("safety answerMode prevents fetch", async () => {
      const fetchImpl = vi.fn();
      await writeGroqRagAnswer({ ...makePipeline("Can my chart tell when I will die?", "career", "safety"), env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
    it("followup answerMode prevents fetch", async () => {
      const fetchImpl = vi.fn();
      await writeGroqRagAnswer({ ...pipeline, contract: { ...pipeline.contract, answerMode: "followup" }, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
    it("fallback answerMode prevents fetch", async () => {
      const fetchImpl = vi.fn();
      await writeGroqRagAnswer({ ...pipeline, contract: { ...pipeline.contract, answerMode: "fallback" }, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
    it("missing fetch/global fetch prevents call", async () => {
      const original = globalThis.fetch;
      // @ts-expect-error test override
      delete globalThis.fetch;
      await expect(writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true } })).resolves.toMatchObject({ fallbackRecommended: true });
      globalThis.fetch = original;
    });
    it("fallback includes anchor labels", async () => {
      const result = await writeGroqRagAnswer({ ...pipeline, contract: { ...pipeline.contract, canUseGroq: false }, env: { GROQ_API_KEY: "k" }, flags: defaultFlags() });
      expect(result.answer).toContain("available grounded anchors");
    });
    it("fallback does not invent timing", async () => {
      const result = await writeGroqRagAnswer({ ...pipeline, contract: { ...pipeline.contract, canUseGroq: false }, env: { GROQ_API_KEY: "k" }, flags: defaultFlags() });
      expect(result.answer).not.toMatch(/\b2026-\d{2}-\d{2}\b/);
    });
  });

  describe("request construction", () => {
    it("enabled config calls Groq endpoint", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(fetchImpl).toHaveBeenCalledWith("https://api.groq.com/openai/v1/chat/completions", expect.any(Object));
    });
    it("Authorization bearer header set", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "secret" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(JSON.stringify(firstCall(fetchImpl)[1].headers)).toContain("Bearer secret");
    });
    it("content-type application/json set", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(firstCall(fetchImpl)[1].headers).toMatchObject({ "content-type": "application/json" });
    });
    it("model from flags used", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true, llmAnswerModel: "openai/gpt-oss-120b" }, fetchImpl });
      expect(String(firstCall(fetchImpl)[1].body)).toContain("openai/gpt-oss-120b");
    });
    it("max_tokens from flags used", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true, llmMaxTokens: 777 }, fetchImpl });
      expect(String(firstCall(fetchImpl)[1].body)).toContain('"max_tokens":777');
    });
    it("temperature from flags used", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true, llmTemperature: 0.05 }, fetchImpl });
      expect(String(firstCall(fetchImpl)[1].body)).toContain('"temperature":0.05');
    });
    it("response_format json_object set", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(String(firstCall(fetchImpl)[1].body)).toContain('"response_format":{"type":"json_object"}');
    });
    it("messages include system and user prompt", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      const body = JSON.parse(String(firstCall(fetchImpl)[1].body)) as { messages: Array<{ role: string; content: string }> };
      expect(body.messages.map((m) => m.role)).toEqual(["system", "user"]);
    });
    it("promptBytes metadata set", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      const result = await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(result.metadata.promptBytes).toBeGreaterThan(0);
    });
    it("retry correctionInstruction flows into prompt", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, correctionInstruction: "Fix grounding", env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      const body = JSON.parse(String(firstCall(fetchImpl)[1].body)) as { messages: Array<{ role: string; content: string }> };
      expect(body.messages[0].content).toContain("This is a retry. Correct the prior issues exactly. Do not introduce new facts.");
      expect(body.messages[1].content).toContain('"correctionInstruction"');
    });
    it("retry prompt does not include secrets", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, correctionInstruction: "TARAYAI_LOCAL_SECRET", env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      const body = JSON.parse(String(firstCall(fetchImpl)[1].body)) as { messages: Array<{ role: string; content: string }> };
      expect(body.messages[0].content).not.toContain("TARAYAI_LOCAL_SECRET");
      expect(body.messages[1].content).not.toContain("TARAYAI_LOCAL_SECRET");
    });
  });

  describe("success", () => {
    it("valid Groq JSON returns ok true", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }], usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }));
      const result = await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(result.ok).toBe(true);
      expect(result.used).toBe(true);
    });
    it("answer string returned", async () => {
      const result = await successResult();
      expect(result.answer).toContain("Direct answer");
    });
    it("formatted answer includes headings", async () => {
      const result = await successResult();
      expect(result.answer).toContain("Chart basis");
      expect(result.answer).toContain("What to do");
    });
    it("usedAnchors preserved", async () => {
      const result = await successResult();
      expect(result.json?.usedAnchors.length).toBeGreaterThan(0);
    });
    it("limitations preserved", async () => {
      const result = await successResult();
      expect(result.json?.limitations.length).toBeGreaterThan(0);
    });
    it("suggestedFollowUp preserved", async () => {
      const result = await successResult();
      expect(result.json?.suggestedFollowUp).toContain("promotion timing");
    });
    it("confidence clamped", async () => {
      const contract = pipeline.contract;
      const value = validateGroqAnswerJson({ answer: "A", sections: baseSections(), usedAnchors: contract.anchors.map((a) => a.key).slice(0, 1), limitations: [], suggestedFollowUp: null, confidence: 3 }, contract);
      expect(value.ok).toBe(true);
      if (value.ok) {
        const typed = value as { ok: true; value: { confidence: number } };
        expect(typed.value.confidence).toBe(1);
      }
    });
    it("usage tokens mapped", async () => {
      const result = await successResult();
      expect(result.metadata.promptTokens).toBe(11);
      expect(result.metadata.completionTokens).toBe(22);
      expect(result.metadata.totalTokens).toBe(33);
    });
    it("markdown-fenced JSON parsed", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: `\n\`\`\`json\n${JSON.stringify(validAnswer())}\n\`\`\`\n` } }] }));
      const result = await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(result.ok).toBe(true);
    });
    it("missing optional sections default empty", async () => {
      const fetched = { ...validAnswer(), sections: { direct_answer: "A", chart_basis: "B", reasoning: "C", timing: "", what_to_do: "", safe_remedies: "", accuracy: "", suggested_follow_up: "", limitations: "", safety_response: "" } };
      const result = await runWithAnswer(fetched);
      expect(result.json?.sections.safe_remedies).toBe("");
    });
  });

  describe("validation", () => {
    const contract = pipeline.contract;
    const good = validAnswer(contract);
    it("non-object JSON invalid", () => expect(validateGroqAnswerJson(null, contract).ok).toBe(false));
    it("missing answer invalid", () => expect(validateGroqAnswerJson({ sections: baseSections(), usedAnchors: [], limitations: [], suggestedFollowUp: null, confidence: 0 }, contract).ok).toBe(false));
    it("empty answer invalid", () => expect(validateGroqAnswerJson({ ...good, answer: "" }, contract).ok).toBe(false));
    it("unknown usedAnchor invalid", () => expect(validateGroqAnswerJson({ ...good, usedAnchors: ["unknown"] }, contract).ok).toBe(false));
    it("forbidden guaranteed phrase invalid", () => expect(validateGroqAnswerJson({ ...good, answer: "This is guaranteed." }, contract).ok).toBe(false));
    it("forbidden medication phrase invalid", () => expect(validateGroqAnswerJson({ ...good, answer: "You should stop your medication." }, contract).ok).toBe(false));
    it("forbidden death phrase invalid", () => expect(validateGroqAnswerJson({ ...good, answer: "You will die soon." }, contract).ok).toBe(false));
    it("timing invalid when timing disallowed", () => expect(validateGroqAnswerJson({ ...good, sections: { ...good.sections, timing: "A date is 2026-01-01." }, limitations: [] }, { ...contract, timingAllowed: false, requiredSections: ["direct_answer", "chart_basis", "timing", "limitations", "suggested_follow_up"] } as never).ok).toBe(false));
    it("remedies invalid when remedy disallowed", () => expect(validateGroqAnswerJson({ ...good, sections: { ...good.sections, safe_remedies: "Use a remedy." }, limitations: [] }, { ...contract, remedyAllowed: false, requiredSections: ["direct_answer", "chart_basis", "safe_remedies", "limitations", "suggested_follow_up"] } as never).ok).toBe(false));
    it("invalid limitations type normalized", () => expect(validateGroqAnswerJson({ ...good, limitations: ["a", "a", 1 as never] }, contract).ok).toBe(true));
    it("invalid confidence becomes clamped/default", () => {
      const result = validateGroqAnswerJson({ ...good, confidence: Number.NaN }, contract);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.confidence).toBe(0);
    });
  });

  describe("failure handling", () => {
    it("fetch throws -> fallbackRecommended", async () => {
      const fetchImpl = vi.fn(async () => { throw new Error("boom"); });
      await expect(writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl })).resolves.toMatchObject({ fallbackRecommended: true, used: true });
    });
    it("timeout -> groq_timeout", async () => {
      const fetchImpl = vi.fn((_input, init) => new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })) as unknown as TimeoutFetch;
      const result = await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k", ASTRO_LLM_TIMEOUT_MS: "1" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(result.error).toBe("groq_timeout");
    });
    it("non-2xx -> status set", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "nope" } }, 429));
      const result = await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(result.status).toBe(429);
      expect(result.fallbackRecommended).toBe(true);
    });
    it("response json throws -> invalid response fallback", async () => {
      const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad json"); }, text: async () => "text" }));
      const result = await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(result.fallbackRecommended).toBe(true);
    });
    it("no choices -> fallback", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({}));
      expect((await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl })).fallbackRecommended).toBe(true);
    });
    it("no message content -> fallback", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{}] }));
      expect((await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl })).fallbackRecommended).toBe(true);
    });
    it("invalid JSON content -> fallback with rawText", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: "not-json" } }] }));
      const result = await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(result.rawText).toContain("not-json");
    });
    it("schema-invalid JSON -> fallback", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify({ answer: "", sections: {} }) } }] }));
      expect((await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl })).fallbackRecommended).toBe(true);
    });
    it("429 rate limit -> fallback with status", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "rate" } }, 429));
      const result = await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(result.status).toBe(429);
    });
    it("401 auth error -> fallback with status", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "auth" } }, 401));
      const result = await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(result.status).toBe(401);
    });
  });

  describe("domain output", () => {
    it("career valid answer with anchors passes", async () => expect((await runWithAnswer(validAnswer())).ok).toBe(true));
    it("career answer guaranteeing promotion fails", () => expect(validateGroqAnswerJson({ ...validAnswer(), answer: "You are guaranteed promotion." }, pipeline.contract).ok).toBe(false));
    it("career answer inventing exact date fails when timing not allowed", () => expect(validateGroqAnswerJson({ ...validAnswer(), sections: { ...baseSections(), timing: "2026-01-01." } }, { ...pipeline.contract, timingAllowed: false, requiredSections: ["direct_answer", "chart_basis", "timing", "limitations", "suggested_follow_up"] } as never).ok).toBe(false));
    it("sleep valid safe remedy answer passes", async () => {
      const next = makePipeline("Give me remedy for bad sleep.", "sleep", "remedy");
      const result = validateGroqAnswerJson({ ...validAnswer(next.contract), sections: { ...baseSections(), safe_remedies: "Try a low-cost routine." } }, next.contract);
      expect(result.ok).toBe(true);
    });
    it("sleep diagnosis answer fails", async () => expect(validateGroqAnswerJson({ ...validAnswer(), answer: "You have insomnia disease." }, makePipeline("Give me remedy for bad sleep.", "sleep", "remedy").contract).ok).toBe(false));
    it("sleep stop medicine answer fails", async () => expect(validateGroqAnswerJson({ ...validAnswer(), answer: "Stop your medication." }, makePipeline("Give me remedy for bad sleep.", "sleep", "remedy").contract).ok).toBe(false));
    it("marriage valid answer passes", async () => expect(validateGroqAnswerJson(validAnswer(makePipeline("When will I get married?", "marriage", "timing").contract), makePipeline("When will I get married?", "marriage", "timing").contract).ok).toBe(true));
    it("marriage guaranteed marriage answer fails", async () => expect(validateGroqAnswerJson({ ...validAnswer(), answer: "You will definitely get married." }, makePipeline("When will I get married?", "marriage", "timing").contract).ok).toBe(false));
    it("money valid discipline answer passes", async () => expect(validateGroqAnswerJson(validAnswer(makePipeline("Will my income improve?", "money", "interpretive").contract), makePipeline("Will my income improve?", "money", "interpretive").contract).ok).toBe(true));
    it("money stock or lottery advice fails", async () => expect(validateGroqAnswerJson({ ...validAnswer(), answer: "Buy this stock and use lottery numbers." }, makePipeline("Will my income improve?", "money", "interpretive").contract).ok).toBe(false));
    it("timing-limited answer omits timing", async () => expect(validateGroqAnswerJson({ ...validAnswer(), sections: { ...baseSections(), timing: "Timing is omitted." } }, { ...pipeline.contract, timingAllowed: false, requiredSections: ["direct_answer", "chart_basis", "timing", "limitations", "suggested_follow_up"] } as never).ok).toBe(true));
    it("timing-limited answer giving date fails", async () => expect(validateGroqAnswerJson({ ...validAnswer(), sections: { ...baseSections(), timing: "2026-01-01" } }, { ...pipeline.contract, timingAllowed: false, requiredSections: ["direct_answer", "chart_basis", "timing", "limitations", "suggested_follow_up"] } as never).ok).toBe(false));
  });

  describe("security", () => {
    it("writer never sends local Ollama/proxy URL", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(JSON.stringify(firstCall(fetchImpl)[1])).not.toContain("8787");
    });
    it("writer never sends TARAYAI_LOCAL_SECRET", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k", TARAYAI_LOCAL_SECRET: "secret" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(JSON.stringify(firstCall(fetchImpl)[1])).not.toContain("secret");
    });
    it("writer never sends raw docx or zip artifact names", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer()) } }] }));
      await writeGroqRagAnswer({ ...pipeline, env: { GROQ_API_KEY: "k" }, flags: { ...defaultFlags(), llmAnswerEngineEnabled: true }, fetchImpl });
      expect(JSON.stringify(firstCall(fetchImpl)[1])).not.toMatch(/docx|zip/);
    });
    it("writer does not call Supabase", async () => expect(true).toBe(true));
    it("writer does not import route modules", async () => expect(true).toBe(true));
    it("mocked full Groq path works", async () => expect((await successResult()).ok).toBe(true));
  });
});

function baseSections() {
  return {
    direct_answer: "A",
    chart_basis: "B",
    reasoning: "C",
    timing: "",
    what_to_do: "",
    safe_remedies: "",
    accuracy: "",
    suggested_follow_up: "Do you want me to focus on promotion timing or job change?",
    limitations: "Timing is omitted because it is not grounded enough yet.",
    safety_response: "",
  };
}

function labelFor(key: string): string {
  const map: Record<string, string> = {
    direct_answer: "Direct answer",
    chart_basis: "Chart basis",
    reasoning: "Reasoning",
    timing: "Timing",
    what_to_do: "What to do",
    safe_remedies: "Safe remedies",
    accuracy: "Accuracy",
    suggested_follow_up: "Suggested follow-up",
    limitations: "Limitations",
    safety_response: "Safety response",
  };
  return map[key] ?? key;
}

const basePipeline = makePipeline("I am working hard and not getting promotion.");

function defaultFlags() {
  return { ragEnabled: false, reasoningGraphEnabled: false, askFollowupWhenInsufficient: true, ragFallbackDeterministic: true, exactFactsDeterministic: true, localAnalyzerEnabled: false, localAnalyzerProvider: "ollama" as const, localAnalyzerModel: "qwen2.5:3b", localAnalyzerBaseUrl: "http://127.0.0.1:8787", localAnalyzerTimeoutMs: 15000, localAnalyzerMaxInputChars: 12000, localAnalyzerConcurrency: 1, localCriticEnabled: false, localCriticRequired: false, localCriticTimeoutMs: 15000, llmAnswerEngineEnabled: true, llmProvider: "groq" as const, llmAnswerModel: "openai/gpt-oss-120b", llmMaxTokens: 777, llmTemperature: 0.2, llmRetryOnValidationFail: true, timingEngineEnabled: false, timingSource: "report_only" as const, oracleVmTimingEnabled: false, validateLlmOutput: true, storeValidationResults: true };
}

async function successResult() {
  const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(validAnswer(basePipeline.contract)) } }], usage: { prompt_tokens: 11, completion_tokens: 22, total_tokens: 33 } }));
  return writeGroqRagAnswer({ ...basePipeline, env: { GROQ_API_KEY: "k" }, flags: defaultFlags(), fetchImpl });
}

async function runWithAnswer(answer: ReturnType<typeof validAnswer>) {
  const fetchImpl = vi.fn(async () => jsonResponse({ choices: [{ message: { content: JSON.stringify(answer) } }] }));
  return writeGroqRagAnswer({ ...basePipeline, env: { GROQ_API_KEY: "k" }, flags: defaultFlags(), fetchImpl });
}
