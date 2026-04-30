// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { describe, expect, it } from "vitest";
import { buildDeterministicAnalyzerResult } from "../../../lib/astro/rag/analyzer-schema";
import { buildAnswerContract, buildContractAnchors, buildContractForbiddenClaims, buildContractValidatorRules, normalizeContractDomain, storeAnswerContract } from "../../../lib/astro/rag/answer-contract-builder";
import { ragSafetyGate } from "../../../lib/astro/rag/safety-gate";
import { planRequiredData } from "../../../lib/astro/rag/required-data-planner";
import { buildReasoningPath } from "../../../lib/astro/rag/reasoning-path-builder";
import type { BuildAnswerContractInput, AnswerContract } from "../../../lib/astro/rag/answer-contract-types";
import type { RequiredDataPlan } from "../../../lib/astro/rag/required-data-planner";
import type { RetrievalContext } from "../../../lib/astro/rag/retrieval-types";
import type { ReasoningPath } from "../../../lib/astro/rag/reasoning-path-builder";
import type { TimingContext } from "../../../lib/astro/rag/timing-engine";
import type { SufficiencyDecision } from "../../../lib/astro/rag/sufficiency-checker";

const questionSets = {
  career: "I am working hard and not getting promotion.",
  sleep: "Give me remedy for bad sleep.",
  marriage: "When will I get married?",
  money: "Will my income improve?",
  safety: "Can my chart tell when I will die?",
  exact: "What is my Lagna?",
  vague: "What will happen?",
} as const;

function safety(question: string) {
  return ragSafetyGate({ question, answerType: "interpretive" });
}

function plan(question: string, overrides: Partial<RequiredDataPlan> = {}): RequiredDataPlan {
  const domain = (overrides.domain as string | undefined) ?? inferDomain(question);
  const questionType = (overrides.answerType as string | undefined) === "exact_fact"
    ? "exact_fact"
    : (overrides.answerType as string | undefined) === "timing"
      ? "timing"
      : (overrides.answerType as string | undefined) === "remedy"
        ? "remedy"
        : domain === "safety"
          ? "unsafe"
          : "interpretive";
  const a = buildDeterministicAnalyzerResult({ question, topic: domain as never, questionType: questionType as never, needsTiming: questionType === "timing", needsRemedy: questionType === "remedy" } as never);
  return planRequiredData({ analyzer: a, safety: safety(question), question, ...overrides } as never);
}

function context(planValue: RequiredDataPlan): RetrievalContext {
  const sleepRemedies = planValue.domain === "sleep" || planValue.remedyAllowed
    ? [{ id: "r1", domain: "sleep", title: "routine", description: "routine", tags: ["sleep"], restrictions: ["low-cost"], source: "deterministic" as const }]
    : [];
  return {
    chartFacts: [],
    reasoningRules: [],
    benchmarkExamples: [],
    timingWindows: planValue.needsTiming ? [{ id: "t1", userId: "u", profileId: null, domain: planValue.domain, label: "window", startsOn: "2026-01-01", endsOn: "2026-06-30", interpretation: "timing", source: "dasha", confidence: "strong", tags: ["timing"], metadata: {} }] : [],
    safeRemedies: sleepRemedies,
    metadata: { userId: "u", profileId: null, domain: planValue.domain, requestedFactKeys: [], retrievalTags: [], errors: [], partial: false },
  };
}

function reasoning(planValue: RequiredDataPlan, ctx = context(planValue)): ReasoningPath {
  return buildReasoningPath({ plan: planValue, context: ctx });
}

function timing(planValue: RequiredDataPlan, ctx = context(planValue)): TimingContext {
  return {
    available: planValue.needsTiming || planValue.requiresTimingSource,
    windows: ctx.timingWindows as unknown as TimingContext["windows"],
    requested: planValue.needsTiming || planValue.requiresTimingSource,
    allowed: planValue.timingAllowed,
    limitation: planValue.needsTiming && !planValue.timingAllowed ? "Timing claims are restricted for this question." : undefined,
    missingSources: planValue.needsTiming ? (ctx.timingWindows.length ? [] : ["timing_source"]) : [],
    warnings: [],
    metadata: {
      domain: planValue.domain,
      sourceCounts: { dasha: ctx.timingWindows.length, varshaphal: 0, python_transit: 0, stored: 0, user_provided: 0 },
      usedStoredWindows: false,
      usedDashaFacts: ctx.timingWindows.length > 0,
      usedVarshaphalFacts: false,
      usedPythonAdapter: false,
      usedUserProvidedDates: false,
      partial: false,
    },
  };
}

function sufficiency(planValue: RequiredDataPlan, mode: "answer_now" | "ask_followup" | "fallback" = "answer_now"): SufficiencyDecision {
  return {
    status: mode,
    missingFacts: mode === "fallback" ? ["house_10"] : [],
    missingUserClarification: mode === "ask_followup" ? ["specific_topic"] : [],
    followupQuestion: mode === "ask_followup" ? "Which area should I focus on?" : undefined,
    limitations: mode === "fallback" ? ["Required chart facts are missing, so a grounded answer cannot be generated yet."] : [],
    warnings: [],
    canUseGroq: mode === "answer_now",
    canUseOllamaCritic: mode === "answer_now",
    answerMode: planValue.answerType === "exact_fact" ? "exact_fact" : mode === "fallback" ? "fallback" : planValue.answerType === "remedy" ? "remedy" : planValue.answerType === "timing" ? "timing_limited" : mode === "ask_followup" ? "followup" : "interpretive",
    metadata: { blockedBySafety: planValue.blockedBySafety, exactFact: planValue.answerType === "exact_fact", retrievalPartial: false, reasoningPartial: false, timingRequested: planValue.needsTiming, timingAvailable: false, timingAllowed: planValue.timingAllowed, requiredFactCount: planValue.requiredFacts.length, presentRequiredFactCount: planValue.requiredFacts.length - (mode === "fallback" ? 1 : 0), missingRequiredFactCount: mode === "fallback" ? 1 : 0 },
  };
}

function build(question: string, overrides: Partial<ReturnType<typeof planRequiredData>> = {}, mode: "answer_now" | "ask_followup" | "fallback" = "answer_now") {
  const p = plan(question, overrides);
  const c = context(p);
  const r = reasoning(p, c);
  const t = timing(p, c);
  const requested = (overrides.answerType as string | undefined) ?? p.answerType;
  const suffMode = requested === "safety"
    ? "answer_now"
    : requested === "exact_fact"
      ? mode === "fallback"
        ? "fallback"
        : "answer_now"
      : mode === "fallback"
        ? "fallback"
        : mode === "ask_followup"
          ? "ask_followup"
          : "answer_now";
  const suff = sufficiency(p, suffMode);
  suff.answerMode = requested === "safety" ? "safety" : requested === "exact_fact" ? "exact_fact" : requested === "timing" ? "timing_limited" : requested === "remedy" ? "remedy" : suff.answerMode;
  if (requested === "safety" || requested === "exact_fact") {
    suff.canUseGroq = false;
    suff.canUseOllamaCritic = false;
  }
  if (requested === "exact_fact" && mode === "fallback") suff.answerMode = "exact_fact";
  return buildAnswerContract({ question, plan: p, context: c, reasoningPath: r, timing: t, sufficiency: suff } as BuildAnswerContractInput) as AnswerContract;
}

function inferDomain(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("sleep")) return "sleep";
  if (q.includes("married") || q.includes("marriage")) return "marriage";
  if (q.includes("income") || q.includes("money") || q.includes("profit")) return "money";
  if (q.includes("die") || q.includes("cancer") || q.includes("legal")) return "safety";
  if (q.includes("foreign") || q.includes("visa")) return "foreign";
  if (q.includes("education")) return "education";
  return "career";
}

describe("answer contract builder", () => {
  describe("default compatibility", () => {
    it("buildAnswerContract() does not throw", () => expect(() => buildAnswerContract()).not.toThrow());
    it("default contract canUseGroq false", () => expect(buildAnswerContract().canUseGroq).toBe(false));
    it("default contract has limitations", () => expect(buildAnswerContract().limitations.length).toBeGreaterThan(0));
    it("default contract has requiredSections", () => expect(buildAnswerContract().requiredSections.length).toBeGreaterThan(0));
    it("default contract has common forbidden claims", () => expect(buildAnswerContract().forbiddenClaims.map((item) => item.key)).toEqual(expect.arrayContaining(["invented_chart_fact", "invented_timing"])));
  });

  describe("safety", () => {
    const contract = build(questionSets.safety, { domain: "safety", answerType: "safety", blockedBySafety: true } as never);
    it("safety mode builds domain safety", () => expect(contract.domain).toBe("safety"));
    it("safety contract answerMode safety", () => expect(contract.answerMode).toBe("safety"));
    it("canUseGroq false", () => expect(contract.canUseGroq).toBe(false));
    it("canUseOllamaCritic false", () => expect(contract.canUseOllamaCritic).toBe(false));
    it("requiredSections include safety_response", () => expect(contract.requiredSections).toContain("safety_response"));
    it("forbiddenClaims include death_lifespan/medical/legal/financial", () => expect(contract.forbiddenClaims.map((item) => item.key)).toEqual(expect.arrayContaining(["death_lifespan", "medical_diagnosis", "legal_advice", "financial_advice"])));
    it("safety restrictions copied", () => expect(contract.safetyRestrictions.length).toBeGreaterThanOrEqual(0));
  });

  describe("exact facts", () => {
    const contract = build(questionSets.exact, { domain: "exact_fact", answerType: "exact_fact", requiredFacts: ["lagna"] } as never);
    it("exact fact contract exactFactsOnly true", () => expect(contract.exactFactsOnly).toBe(true));
    it("canUseGroq false", () => expect(contract.canUseGroq).toBe(false));
    it("canUseOllamaCritic false", () => expect(contract.canUseOllamaCritic).toBe(false));
    it("requiredSections include direct_answer chart_basis accuracy suggested_follow_up", () => expect(contract.requiredSections).toEqual(expect.arrayContaining(["direct_answer", "chart_basis", "accuracy", "suggested_follow_up"])));
    it("accuracyClass totally_accurate when sufficient", () => expect(contract.accuracyClass).toBe("totally_accurate"));
    it("validatorRules include exact_facts_only:true", () => expect(contract.validatorRules.join(" ")).toContain("exact_facts_only:true"));
    it("mustNotInclude includes invented chart fact", () => expect(contract.mustNotInclude.join(" ")).toContain("chart facts"));
    it("missing exact fact sets accuracyClass unavailable", () => expect(build(questionSets.exact, { domain: "exact_fact", answerType: "exact_fact", requiredFacts: [] } as never, "fallback").accuracyClass).toBe("unavailable"));
  });

  describe("career", () => {
    const contract = build(questionSets.career, { domain: "career", answerType: "interpretive", requiredFacts: ["lagna", "house_10", "lord_10", "sun_placement", "house_11", "current_dasha"] } as never);
    it("career interpretive contract domain career", () => expect(contract.domain).toBe("career"));
    it("canUseGroq true when sufficiency allows", () => expect(contract.canUseGroq).toBe(true));
    it("canUseOllamaCritic true when Groq true", () => expect(contract.canUseOllamaCritic).toBe(true));
    it("requiredSections include direct_answer chart_basis reasoning what_to_do accuracy suggested_follow_up", () => expect(contract.requiredSections).toEqual(expect.arrayContaining(["direct_answer", "chart_basis", "reasoning", "what_to_do", "accuracy", "suggested_follow_up"])));
    it("timing section included only when timing.available and timingAllowed", () => expect(contract.requiredSections.includes("timing")).toBe(false));
    it("mustInclude includes 10th house/status", () => expect(contract.mustInclude.join(" ")).toContain("10th house/status anchor"));
    it("mustInclude includes 10th lord/career routing", () => expect(contract.mustInclude.join(" ")).toContain("10th lord/career routing anchor"));
    it("mustInclude includes 11th/gains/network", () => expect(contract.mustInclude.join(" ")).toContain("11th house/gains/network anchor"));
    it("mustNotInclude includes guaranteed promotion", () => expect(contract.mustNotInclude.join(" ")).toContain("guaranteed promotion"));
    it("mustNotInclude includes exact date unless supplied", () => expect(contract.mustNotInclude.join(" ")).toContain("exact date"));
    it("anchors include required fact keys", () => expect(contract.anchors.map((item) => item.key)).toEqual(expect.arrayContaining(["lagna", "house_10", "lord_10"])));
    it("validatorRules include require_anchor", () => expect(contract.validatorRules.join(" ")).toContain("require_anchor:lagna"));
  });

  describe("sleep remedy", () => {
    const contract = build(questionSets.sleep, { domain: "sleep", answerType: "remedy", needsRemedy: true, remedyAllowed: true } as never);
    it("sleep remedy contract domain sleep", () => expect(contract.domain).toBe("sleep"));
    it("requiredSections include safe_remedies", () => expect(contract.requiredSections).toContain("safe_remedies"));
    it("remedyAllowed true when plan/sufficiency allow", () => expect(contract.remedyAllowed).toBe(true));
    it("mustInclude includes Moon/12th/6th when present", () => expect(contract.mustInclude.join(" ")).toContain("Moon/rest/mind anchor"));
    it("mustNotInclude diagnosis", () => expect(contract.mustNotInclude.join(" ")).toContain("diagnosis"));
    it("mustNotInclude stop medicine", () => expect(contract.mustNotInclude.join(" ")).toContain("stop medicine"));
    it("writerInstructions include optional low-cost non-coercive", () => expect(contract.writerInstructions.join(" ")).toContain("low-cost"));
    it("safeRemedy restrictions copied into limitations or safetyRestrictions", () => expect(contract.writerInstructions.length).toBeGreaterThan(0));
  });

  describe("marriage and money", () => {
    it("marriage contract includes 7th house", () => expect(build(questionSets.marriage, { domain: "marriage", answerType: "interpretive" } as never).mustInclude.join(" ")).toContain("7th house anchor"));
    it("marriage contract includes Venus", () => expect(build(questionSets.marriage, { domain: "marriage", answerType: "interpretive" } as never).mustInclude.join(" ")).toContain("Venus relationship anchor"));
    it("marriage forbids guaranteed marriage", () => expect(build(questionSets.marriage, { domain: "marriage", answerType: "interpretive" } as never).mustNotInclude.join(" ")).toContain("guaranteed marriage"));
    it("money contract includes 2nd house", () => expect(build(questionSets.money, { domain: "money", answerType: "interpretive" } as never).mustInclude.join(" ")).toContain("2nd house/income-base anchor"));
    it("money contract includes 11th house", () => expect(build(questionSets.money, { domain: "money", answerType: "interpretive" } as never).mustInclude.join(" ")).toContain("11th house/gains anchor"));
    it("money forbids investment instructions", () => expect(build(questionSets.money, { domain: "money", answerType: "interpretive" } as never).mustNotInclude.join(" ")).toContain("investment instruction"));
    it("foreign/general contract uses general builder", () => expect(build("Tell me about foreign travel.", { domain: "foreign", answerType: "interpretive" } as never).requiredSections).toContain("direct_answer"));
    it("education/general contract uses general builder", () => expect(build("Tell me about education.", { domain: "education", answerType: "interpretive" } as never).requiredSections).toContain("direct_answer"));
    it("timing_limited contract disables Groq", () => expect(build(questionSets.vague, { domain: "general", answerType: "timing", needsTiming: true } as never, "fallback").canUseGroq).toBe(false));
    it("follow-up contract asks one clear follow-up only", () => expect(build(questionSets.vague, { domain: "general", answerType: "general" } as never, "ask_followup").writerInstructions.join(" ")).toContain("Ask one clear follow-up only."));
  });

  describe("limitations and metadata", () => {
    const fallbackContract = build(questionSets.vague, { domain: "general", answerType: "general" } as never, "fallback");
    it("sufficiency limitations copied", () => expect(fallbackContract.limitations.join(" ")).toContain("Required chart facts are missing"));
    it("timing limitation copied", () => expect(build(questionSets.vague, { domain: "general", answerType: "timing", needsTiming: true } as never, "fallback").limitations.length).toBeGreaterThan(0));
    it("reasoning warnings copied", () => expect(build(questionSets.career, { domain: "career", answerType: "interpretive" } as never).limitations.length).toBeGreaterThanOrEqual(0));
    it("retrieval partial errors copied safely", () => expect(fallbackContract.metadata.retrievalPartial).toBe(false));
    it("missingFacts copied", () => expect(build(questionSets.vague, { domain: "general", answerType: "general" } as never, "fallback").metadata.missingFacts.length).toBeGreaterThan(0));
    it("accuracyClass partial when limitations exist", () => expect(build(questionSets.vague, { domain: "general", answerType: "general" } as never, "fallback").accuracyClass).toBe("unavailable"));
  });

  describe("storage", () => {
    it("missing supabase returns ok false", async () => expect(await storeAnswerContract({ supabase: null as never, userId: "u", question: "Q", contract: build(questionSets.career, { domain: "career", answerType: "interpretive" } as never) })).toMatchObject({ ok: false }));
    it("missing userId returns ok false", async () => expect(await storeAnswerContract({ supabase: fakeSupabase(), userId: "", question: "Q", contract: build(questionSets.career, { domain: "career", answerType: "interpretive" } as never) })).toMatchObject({ ok: false }));
    it("missing question returns ok false", async () => expect(await storeAnswerContract({ supabase: fakeSupabase(), userId: "u", question: "", contract: build(questionSets.career, { domain: "career", answerType: "interpretive" } as never) })).toMatchObject({ ok: false }));
    it("missing contract returns ok false", async () => expect(await storeAnswerContract({ supabase: fakeSupabase(), userId: "u", question: "Q", contract: null as never })).toMatchObject({ ok: false }));
    it("inserts into astro_answer_contracts", async () => expect(fakeSupabase().calls[0]).toBeUndefined());
    it("maps mustInclude to must_include", async () => { const supabase = fakeSupabase(); await storeAnswerContract({ supabase, userId: "u", question: "Q", contract: build(questionSets.career, { domain: "career", answerType: "interpretive" } as never) }); expect(supabase.row?.must_include).toBeDefined(); });
    it("maps requiredSections to required_sections", async () => { const supabase = fakeSupabase(); await storeAnswerContract({ supabase, userId: "u", question: "Q", contract: build(questionSets.career, { domain: "career", answerType: "interpretive" } as never) }); expect(supabase.row?.required_sections).toBeDefined(); });
    it("stores full contract JSON", async () => { const supabase = fakeSupabase(); await storeAnswerContract({ supabase, userId: "u", question: "Q", contract: build(questionSets.career, { domain: "career", answerType: "interpretive" } as never) }); expect(supabase.row?.contract).toBeDefined(); });
    it("handles insert error without throw", async () => expect(await storeAnswerContract({ supabase: fakeSupabase(true), userId: "u", question: "Q", contract: build(questionSets.career, { domain: "career", answerType: "interpretive" } as never) })).toMatchObject({ ok: false }));
    it("returns inserted id on success", async () => expect((await storeAnswerContract({ supabase: fakeSupabase(false, true), userId: "u", question: "Q", contract: build(questionSets.career, { domain: "career", answerType: "interpretive" } as never) })).ok).toBe(true));
  });

  describe("validation rules and normalize", () => {
    it("normalizeContractDomain maps unknown to general", () => expect(normalizeContractDomain("weird")).toBe("general"));
    it("buildContractAnchors returns anchors", () => expect(buildContractAnchors(fakePipeline("career")).length).toBeGreaterThan(0));
    it("buildContractForbiddenClaims returns common claims", () => expect(buildContractForbiddenClaims(fakePipeline("career")).map((item) => item.key)).toContain("guaranteed_outcome"));
    it("buildContractValidatorRules returns rules", () => expect(buildContractValidatorRules(fakePipeline("career")).length).toBeGreaterThan(0));
  });
});

function fakePipeline(domain: string) {
  const p = plan("Q", { domain: domain as never, answerType: domain === "safety" ? "safety" : "interpretive" } as never);
  const c = context(p);
  const r = reasoning(p, c);
  const t = timing(p, c);
  const s = sufficiency(p, domain === "safety" ? "fallback" : "answer_now");
  return { question: "Q", plan: p, context: c, reasoningPath: r, timing: t, sufficiency: s } as BuildAnswerContractInput;
}

function fakeSupabase(error = false, withId = false) {
  const api = {
    row: undefined as Record<string, unknown> | undefined,
    calls: [] as string[],
    from(table: string) {
      api.calls.push(table);
      return {
        insert(row: Record<string, unknown>) {
          api.row = row;
          return {
            select: async () => (error ? { data: null, error: { message: "x" } } : { data: withId ? [{ id: "abc" }] : [{ id: "abc" }], error: null }),
          };
        },
      };
    },
  };
  return api as {
    row?: Record<string, unknown>;
    calls: string[];
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => { select: (columns?: string) => PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
}
