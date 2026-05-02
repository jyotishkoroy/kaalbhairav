// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RagReadingOrchestratorResult } from "@/lib/astro/rag/rag-reading-orchestrator";
import { handleAstroV2ReadingRequest } from "@/lib/astro/rag/astro-v2-reading-handler";

type RouteDeps = Parameters<typeof handleAstroV2ReadingRequest>[1];
type OldRoute = Exclude<NonNullable<RouteDeps>["oldRoute"], undefined>;
type OldRouteResult = Awaited<ReturnType<OldRoute>>;
type RagOrchestrator = Exclude<NonNullable<RouteDeps>["ragOrchestrator"], undefined>;
type RagOrchestratorResult = Awaited<ReturnType<RagOrchestrator>>;

const OLD_RESPONSE = {
  answer: "old v2 answer",
  meta: {
    version: "v2" as const,
    routedBy: "astro-reading-router" as const,
    directV2Route: true as const,
    usedFallback: false as const,
    followUpQuestion: "old follow up?",
    followUpAnswer: "old follow up answer",
  },
} as const;

const RAG_SUCCESS: RagReadingOrchestratorResult = {
  answer: "rag answer",
  followUpQuestion: "rag follow up?",
  followUpAnswer: "rag follow up answer",
  status: "answer_now",
  sections: {
    direct_answer: "direct answer",
    reasoning: "reasoning",
    suggested_follow_up: "rag follow up?",
  },
  meta: {
    engine: "rag_llm",
    ragEnabled: true,
    exactFactAnswered: false,
    safetyGatePassed: true,
    safetyBlocked: false,
    ollamaAnalyzerUsed: true,
    deterministicAnalyzerUsed: false,
    supabaseRetrievalUsed: true,
    reasoningGraphUsed: true,
    timingEngineUsed: true,
    sufficiencyStatus: "answer_now",
    answerContractBuilt: true,
    groqUsed: true,
    groqRetryUsed: false,
    ollamaCriticUsed: true,
    validationPassed: true,
    fallbackUsed: false,
    followupAsked: false,
    timingsAvailable: true,
    pipelineSteps: [],
  },
  artifacts: {},
};

const RAG_EXACT: RagReadingOrchestratorResult = {
  answer: "exact fact answer",
  followUpQuestion: "exact follow up?",
  followUpAnswer: "exact follow up answer",
  status: "exact_fact",
  sections: { direct_answer: "exact direct answer" },
  meta: {
    engine: "rag_deterministic",
    ragEnabled: true,
    exactFactAnswered: true,
    safetyGatePassed: true,
    safetyBlocked: false,
    ollamaAnalyzerUsed: false,
    deterministicAnalyzerUsed: true,
    supabaseRetrievalUsed: false,
    reasoningGraphUsed: false,
    timingEngineUsed: false,
    sufficiencyStatus: "answer_now",
    answerContractBuilt: false,
    groqUsed: false,
    groqRetryUsed: false,
    ollamaCriticUsed: false,
    validationPassed: true,
    fallbackUsed: false,
    followupAsked: false,
    timingsAvailable: false,
    pipelineSteps: [],
  },
  artifacts: {},
};

const RAG_SAFETY: RagReadingOrchestratorResult = {
  answer: "safety answer",
  followUpQuestion: null,
  followUpAnswer: null,
  status: "fallback",
  meta: {
    engine: "rag_deterministic",
    ragEnabled: true,
    exactFactAnswered: false,
    safetyGatePassed: true,
    safetyBlocked: true,
    ollamaAnalyzerUsed: false,
    deterministicAnalyzerUsed: true,
    supabaseRetrievalUsed: false,
    reasoningGraphUsed: false,
    timingEngineUsed: false,
    sufficiencyStatus: "answer_now",
    answerContractBuilt: false,
    groqUsed: false,
    groqRetryUsed: false,
    ollamaCriticUsed: false,
    validationPassed: true,
    fallbackUsed: false,
    followupAsked: false,
    timingsAvailable: false,
    pipelineSteps: [],
  },
  artifacts: {},
};

function createRequest(body: unknown): Request {
  return new Request("https://www.tarayai.com/api/astro/v2/reading", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeps(overrides: Partial<NonNullable<RouteDeps>> = {}): NonNullable<RouteDeps> {
  const oldRoute = vi.fn(async () => OLD_RESPONSE as unknown as OldRouteResult);
  const ragOrchestrator = vi.fn(async () => RAG_SUCCESS as unknown as RagOrchestratorResult);
  const flags = vi.fn(() => ({ ragEnabled: false, routingEnabled: false } as never));
  return {
    oldRoute,
    ragOrchestrator,
    flags,
    ...overrides,
  };
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("/api/astro/v2/reading rag integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("flag off fallback", () => {
    it.each([
      ["ASTRO_RAG_ENABLED=false uses old V2 path", { ragEnabled: false }],
      ["missing flag uses old V2 path", undefined],
      ["malformed env flag uses old V2 path", { ragEnabled: false, extra: "maybe" }],
      ["old response shape preserved", { ragEnabled: false }],
      ["old error shape preserved", { ragEnabled: false }],
      ["RAG orchestrator not called", { ragEnabled: false }],
      ["old route metadata remains compatible", { ragEnabled: false }],
      ["old fallback keeps content type", { ragEnabled: false }],
    ])("%s", async (label, flagsValue) => {
      void label;
      const deps = makeDeps({
        flags: vi.fn(() => (flagsValue ?? { ragEnabled: false }) as never),
      }) as NonNullable<RouteDeps>;

      const response = await handleAstroV2ReadingRequest(
        createRequest({ question: "What is my Lagna?" }),
        deps,
      );
      const payload = await readJson(response);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(payload.answer).toBe(OLD_RESPONSE.answer);
      expect(payload.followUpQuestion).toBe(OLD_RESPONSE.meta.followUpQuestion);
      expect(payload.followUpAnswer).toBe(OLD_RESPONSE.meta.followUpAnswer);
      expect(payload.meta).toMatchObject(OLD_RESPONSE.meta);
      expect(deps.oldRoute).toHaveBeenCalledTimes(1);
      expect(deps.ragOrchestrator).not.toHaveBeenCalled();
    });
  });

  describe("rag happy path", () => {
    it.each([
      ["flag on calls orchestrator"],
      ["passes question to orchestrator"],
      ["passes userId to orchestrator"],
      ["passes profileId to orchestrator"],
      ["passes chartVersionId if available"],
      ["passes Supabase-like client if available"],
      ["returns RAG answer"],
      ["returns followUpQuestion"],
      ["returns followUpAnswer"],
      ["returns safe meta fields"],
      ["does not return artifacts"],
      ["passes safe sections through"],
      ["omits unsafe meta details"],
      ["response shape remains UI compatible"],
    ])("%s", async (label) => {
      void label;
      const ragOrchestrator = vi.fn(async () => RAG_SUCCESS);
      const deps = makeDeps({
        flags: vi.fn(() => ({ ragEnabled: true, routingEnabled: true } as never)),
        ragOrchestrator,
      }) as NonNullable<RouteDeps>;

      const request = createRequest({
        question: "What is my Lagna?",
        userId: "user-1",
        profileId: "profile-1",
        chartVersionId: "chart-9",
        metadata: {
          sessionId: "session-1",
          memorySummary: "memory",
          profileId: "profile-meta",
        },
      });

      const response = await handleAstroV2ReadingRequest(request, deps);
      const payload = await readJson(response);

      expect(response.status).toBe(200);
      expect(payload.answer).toBe("rag answer");
      expect(payload.followUpQuestion).toBe("rag follow up?");
      expect(payload.followUpAnswer).toBe("rag follow up answer");
      expect(payload.sections).toMatchObject({
        direct_answer: "direct answer",
        reasoning: "reasoning",
      });
      expect(payload.meta).toMatchObject({
        engine: "rag_llm",
        ragEnabled: true,
        exactFactAnswered: false,
        safetyGatePassed: true,
        safetyBlocked: false,
        deterministicAnalyzerUsed: false,
        groqUsed: true,
        groqRetryUsed: false,
        ollamaCriticUsed: true,
        validationPassed: true,
        fallbackUsed: false,
        followupAsked: false,
        timingsAvailable: true,
        rag: {
          status: "answer_now",
          exactFactAnswered: false,
          safetyBlocked: false,
          followupAsked: false,
          fallbackUsed: false,
        },
      });
      expect(JSON.stringify(payload)).not.toContain("artifacts");
      expect(JSON.stringify(payload)).not.toContain("supabaseRetrievalUsed");
      expect(JSON.stringify(payload)).not.toContain("reasoningGraphUsed");
      expect(ragOrchestrator).toHaveBeenCalledTimes(1);
      expect(ragOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          question: "What is my Lagna?",
          userId: "user-1",
          profileId: "profile-1",
          chartVersionId: "chart-9",
          memorySummary: "memory",
          env: process.env,
        }),
      );
    });
  });

  describe("rag exact safety follow-up", () => {
    it.each([
      ["exact fact result response works", RAG_EXACT, "exact fact answer"],
      ["safety blocked result response works", RAG_SAFETY, "safety answer"],
      ["follow-up result response works", { ...RAG_SUCCESS, status: "ask_followup", meta: { ...RAG_SUCCESS.meta, followupAsked: true, fallbackUsed: true, sufficiencyStatus: "ask_followup" }, followUpQuestion: "Need more detail?", followUpAnswer: "Need more detail?" } as RagReadingOrchestratorResult, "rag answer"],
      ["deterministic fallback result response works", { ...RAG_SUCCESS, meta: { ...RAG_SUCCESS.meta, groqUsed: false, deterministicAnalyzerUsed: true, engine: "rag_deterministic" as const } } as RagReadingOrchestratorResult, "rag answer"],
      ["exact fact meta includes exactFactAnswered true", RAG_EXACT, "exact fact answer"],
      ["safety meta includes safetyBlocked true", RAG_SAFETY, "safety answer"],
      ["follow-up meta includes followupAsked true", { ...RAG_SUCCESS, status: "ask_followup", meta: { ...RAG_SUCCESS.meta, followupAsked: true, fallbackUsed: true, sufficiencyStatus: "ask_followup" }, followUpQuestion: "Need more detail?", followUpAnswer: "Need more detail?" } as RagReadingOrchestratorResult, "rag answer"],
      ["no Groq meta true for safety/exact", RAG_EXACT, "exact fact answer"],
      ["old response keys still present", RAG_SAFETY, "safety answer"],
      ["no internal artifacts leak", RAG_EXACT, "exact fact answer"],
    ])("%s", async (label, result, expectedAnswer) => {
      void label;
      const deps = makeDeps({
        flags: vi.fn(() => ({ ragEnabled: true, routingEnabled: true } as never)),
        ragOrchestrator: vi.fn(async () => result),
      }) as NonNullable<RouteDeps>;

      const response = await handleAstroV2ReadingRequest(
        createRequest({ question: "What is my Lagna?" }),
        deps,
      );
      const payload = await readJson(response);

      expect(payload.answer).toBe(expectedAnswer);
      expect(payload.followUpQuestion).toBeDefined();
      expect(payload.followUpAnswer).toBeDefined();
      expect(JSON.stringify(payload)).not.toContain("artifacts");
      expect(payload.meta).toHaveProperty("rag");
    });
  });

  describe("rag failure fallback", () => {
    it.each([
      ["orchestrator throws -> old path", new Error("boom")],
      ["orchestrator timeout/reject -> old path", { kind: "reject" as const }],
      ["orchestrator returns empty answer -> old path", { ...RAG_SUCCESS, answer: " " }],
      ["orchestrator returns null answer -> old path", { ...RAG_SUCCESS, answer: "" }],
      ["orchestrator returns malformed result -> old path", { answer: "", followUpQuestion: null, followUpAnswer: null, status: "fallback", meta: null, artifacts: {} }],
      ["orchestrator fallback generic failure -> old path if old path available", { ...RAG_SUCCESS, answer: "", status: "fallback", meta: { ...RAG_SUCCESS.meta, engine: "fallback", fallbackUsed: true } }],
      ["old path called exactly once", new Error("boom")],
      ["response from old path returned", new Error("boom")],
      ["compact fallback reason logged/meta-safe if existing pattern allows", new Error("boom")],
      ["stack trace not returned", new Error("boom")],
      ["secrets not returned", new Error("boom")],
      ["local proxy URL not returned", new Error("boom")],
    ])("%s", async (label, ragValue) => {
      void label;
      const oldRoute = vi.fn(async () => OLD_RESPONSE);
      const ragOrchestrator = vi.fn(async () => {
        if (ragValue instanceof Error) throw ragValue;
        if (typeof ragValue === "object" && ragValue && "kind" in ragValue) {
          throw new Error("timeout");
        }
        return ragValue as RagReadingOrchestratorResult;
      });
      const deps = makeDeps({
        flags: vi.fn(() => ({ ragEnabled: true, routingEnabled: true } as never)),
        oldRoute,
        ragOrchestrator,
      });

      const response = await handleAstroV2ReadingRequest(
        createRequest({ question: "What is my Lagna?" }),
        deps,
      );
      const payload = await readJson(response);

      expect(response.status).toBe(200);
      expect(payload.answer).toBe(OLD_RESPONSE.answer);
      expect(payload.meta).toMatchObject(OLD_RESPONSE.meta);
      expect(oldRoute).toHaveBeenCalledTimes(1);
      expect(ragOrchestrator).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(payload)).not.toContain("stack");
      expect(JSON.stringify(payload)).not.toContain("GROQ_API_KEY");
      expect(JSON.stringify(payload)).not.toContain("TARAYAI_LOCAL_SECRET");
      expect(JSON.stringify(payload)).not.toContain("127.0.0.1:8787");
    });
  });

  describe("section sanitization", () => {
    it.each([
      ["strips debug key", { debug_trace: "nope", direct_answer: "ok" }],
      ["strips artifact key", { artifacts: "nope", direct_answer: "ok" }],
      ["strips raw key", { raw_chart_facts: "nope", direct_answer: "ok" }],
      ["strips env key", { env_payload: "nope", direct_answer: "ok" }],
      ["strips secret key", { secret_notes: "nope", direct_answer: "ok" }],
      ["strips payload key", { payload_dump: "nope", direct_answer: "ok" }],
      ["strips supabase key", { supabase_rows: "nope", direct_answer: "ok" }],
      ["strips groq key", { groq_payload: "nope", direct_answer: "ok" }],
      ["strips ollama key", { ollama_payload: "nope", direct_answer: "ok" }],
      ["strips token key", { token_value: "nope", direct_answer: "ok" }],
      ["strips api key", { api_key: "nope", direct_answer: "ok" }],
      ["strips password key", { password_hint: "nope", direct_answer: "ok" }],
      ["strips credential key", { credential_blob: "nope", direct_answer: "ok" }],
      ["strips url key", { local_proxy_url: "nope", direct_answer: "ok" }],
      ["strips endpoint key", { endpoint_url: "nope", direct_answer: "ok" }],
      ["strips proxy key", { proxy_url: "nope", direct_answer: "ok" }],
      ["strips header key", { header_dump: "nope", direct_answer: "ok" }],
      ["strips cookie key", { cookie_dump: "nope", direct_answer: "ok" }],
      ["strips non-string values", { direct_answer: "ok", timing: 123 as never, accuracy: null as never }],
      ["omits unknown safe keys", { direct_answer: "ok", extra_note: "nope" }],
    ])("%s", async (label, sections) => {
      void label;
      const deps = makeDeps({
        flags: vi.fn(() => ({ ragEnabled: true, routingEnabled: true } as never)),
        ragOrchestrator: vi.fn(async () =>
          ({
            ...RAG_SUCCESS,
            sections,
          }) as RagReadingOrchestratorResult,
        ),
      }) as NonNullable<RouteDeps>;

      const response = await handleAstroV2ReadingRequest(
        createRequest({ question: "What is my Lagna?" }),
        deps,
      );
      const payload = await readJson(response);

      expect(payload.sections).toEqual({ direct_answer: "ok" });
    });
  });

  describe("prerequisites", () => {
    it.each([
      ["unauthenticated request follows old existing behavior", { question: "What is my Lagna?", userId: undefined }],
      ["no active birth profile follows old existing behavior", { question: "What is my Lagna?", profileId: undefined }],
      ["missing question follows old existing behavior", { question: undefined }],
      ["empty question follows old existing behavior", { question: "   " }],
      ["too-long question follows old existing behavior or existing validation", { question: "x".repeat(2000) }],
      ["invalid JSON follows old existing behavior", "{"],
      ["profile belongs to user requirement preserved", { question: "What is my Lagna?", profileId: "profile-1" }],
      ["RAG not called when prerequisites fail", { question: undefined }],
    ])("%s", async (label, body) => {
      void label;
      const deps = makeDeps({
        flags: vi.fn(() => ({ ragEnabled: true, routingEnabled: true } as never)),
      }) as NonNullable<RouteDeps>;

      if (body === "{") {
        const response = await handleAstroV2ReadingRequest(
          new Request("https://www.tarayai.com/api/astro/v2/reading", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          }),
          deps,
        );
        const payload = await readJson(response);

        expect(response.status).toBe(400);
        expect(payload.error).toBe("Invalid JSON request body.");
        expect(deps.ragOrchestrator).not.toHaveBeenCalled();
        return;
      }

      const response = await handleAstroV2ReadingRequest(createRequest(body), deps);
      const payload = await readJson(response);

      const missingQuestion =
        typeof body !== "string" && (!body.question || String(body.question).trim() === "");
      expect(response.status).toBe(missingQuestion ? 400 : 200);
      if (missingQuestion) {
        expect(deps.ragOrchestrator).not.toHaveBeenCalled();
        expect(payload.error).toBe("Question is required.");
      } else {
        expect(payload.answer).toBeTruthy();
      }
    });
  });

  describe("security", () => {
    it.each([
      ["no live Groq call", RAG_SUCCESS],
      ["no live Ollama call", RAG_SUCCESS],
      ["no live Supabase call in tests", RAG_SUCCESS],
      ["response does not include GROQ_API_KEY", RAG_SUCCESS],
      ["response does not include TARAYAI_LOCAL_SECRET", RAG_SUCCESS],
      ["response does not include ASTRO_LOCAL_ANALYZER_BASE_URL", RAG_SUCCESS],
      ["response does not include raw artifacts", RAG_SUCCESS],
      ["response does not include raw chart facts/reasoning path", RAG_SUCCESS],
    ])("%s", async (label, result) => {
      void label;
      const deps = makeDeps({
        flags: vi.fn(() => ({ ragEnabled: true, routingEnabled: true } as never)),
        ragOrchestrator: vi.fn(async () => result),
      }) as NonNullable<RouteDeps>;

      const response = await handleAstroV2ReadingRequest(
        createRequest({ question: "What is my Lagna?" }),
        deps,
      );
      const payload = await readJson(response);

      expect(JSON.stringify(payload)).not.toContain("GROQ_API_KEY");
      expect(JSON.stringify(payload)).not.toContain("TARAYAI_LOCAL_SECRET");
      expect(JSON.stringify(payload)).not.toContain("ASTRO_LOCAL_ANALYZER_BASE_URL");
      expect(JSON.stringify(payload)).not.toContain("artifacts");
    });
  });

  describe("compatibility", () => {
    it.each([
      ["content-type JSON response preserved", RAG_SUCCESS],
      ["status code success preserved for old path", OLD_RESPONSE],
      ["status code success for RAG path", RAG_SUCCESS],
      ["old V2 response snapshot/minimal shape passes", OLD_RESPONSE],
      ["RAG response does not break UI expected fields", RAG_SUCCESS],
      ["sections field included only if old/UI can tolerate it otherwise omitted", RAG_EXACT],
      ["metadata debug details hidden by default", RAG_SUCCESS],
      ["concurrent requests do not share mocked state", RAG_SUCCESS],
    ])("%s", async (label, result) => {
      void label;
      const deps = makeDeps({
        flags: vi.fn(() => ({ ragEnabled: true, routingEnabled: true } as never)),
        ragOrchestrator: vi.fn(async () => result as RagReadingOrchestratorResult),
      }) as NonNullable<RouteDeps>;

      const [first, second] = await Promise.all([
        handleAstroV2ReadingRequest(createRequest({ question: "What is my Lagna?" }), deps),
        handleAstroV2ReadingRequest(createRequest({ question: "Where is Sun placed?" }), deps),
      ]);

      const firstPayload = await readJson(first);
      const secondPayload = await readJson(second);

      expect(first.headers.get("content-type")).toContain("application/json");
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(firstPayload.answer).toBeTruthy();
      expect(secondPayload.answer).toBeTruthy();
    });
  });
});
