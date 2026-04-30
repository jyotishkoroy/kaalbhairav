// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerContract } from "./answer-contract-types";
import type { RetrievalContext } from "./retrieval-types";
import type { ReasoningPath } from "./reasoning-path-builder";
import type { TimingContext } from "./timing-engine";

export type GroqPromptInput = {
  question: string;
  contract: AnswerContract;
  context: RetrievalContext;
  reasoningPath: ReasoningPath;
  timing: TimingContext;
  correctionInstruction?: string;
};

export type GroqPromptMessages = {
  system: string;
  user: string;
};

function trimText(value: unknown, max = 300): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? text.slice(0, max) : text;
}

function sanitizeRetryInstruction(value: unknown): string {
  return trimText(value, 2000)
    .replace(/TARAYAI_LOCAL_SECRET/gi, "[redacted]")
    .replace(/GROQ_API_KEY/gi, "[redacted]");
}

function compactList(values: unknown, max = 30): string[] {
  const source = Array.isArray(values) ? values : [];
  const out: string[] = [];
  for (const value of source) {
    const text = trimText(value, 300);
    if (!text) continue;
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function compactObjects<T extends Record<string, unknown>>(values: unknown, max = 30, mapper?: (value: Record<string, unknown>) => T): T[] {
  const source = Array.isArray(values) ? values : [];
  const out: T[] = [];
  for (const value of source) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const mapped = mapper ? mapper(value as Record<string, unknown>) : (value as T);
    out.push(mapped);
    if (out.length >= max) break;
  }
  return out;
}

function compactExamples(values: unknown, max = 4): Array<Record<string, unknown>> {
  return compactObjects(values, max, (example) => ({
      id: trimText(example.id, 80),
      exampleKey: trimText(example.exampleKey, 120),
      domain: trimText(example.domain, 80),
      question: trimText(example.question, 300),
      answer: trimText(example.answer, 500),
      reasoning: trimText(example.reasoning, 300),
      accuracyClass: trimText(example.accuracyClass, 80),
      followUpQuestion: trimText(example.followUpQuestion, 200),
      tags: compactList(example.tags, 8),
    }));
}

function compactChartFacts(context: RetrievalContext): Array<Record<string, unknown>> {
  return compactObjects(context.chartFacts, 30, (value) => {
    return {
      factKey: trimText(value.factKey, 80),
      factType: trimText(value.factType, 80),
      factValue: trimText(value.factValue, 300),
      house: typeof value.house === "number" ? value.house : undefined,
      planet: trimText(value.planet, 80),
      sign: trimText(value.sign, 80),
      tags: compactList(value.tags, 10),
    };
  });
}

function compactTimingWindows(timing: TimingContext): Array<Record<string, unknown>> {
  return compactObjects(timing.windows, 8, (value) => {
    return {
      label: trimText(value.label, 120),
      startsOn: trimText(value.startsOn, 40),
      endsOn: trimText(value.endsOn, 40),
      domain: trimText(value.domain, 80),
      interpretation: trimText(value.interpretation, 300),
      source: trimText(value.source, 40),
      confidence: trimText(value.confidence, 40),
      tags: compactList(value.tags, 8),
    };
  });
}

export function compactContractForPrompt(contract: AnswerContract): Record<string, unknown> {
  return {
    domain: trimText(contract.domain, 80),
    answerMode: trimText(contract.answerMode, 80),
    question: trimText(contract.question, 600),
    requiredSections: compactList(contract.requiredSections, 20),
    optionalSections: compactList(contract.optionalSections, 20),
    anchors: compactObjects(contract.anchors, 30, (value) => {
      return {
        key: trimText(value.key, 120),
        label: trimText(value.label, 300),
        required: Boolean(value.required),
        source: trimText(value.source, 80),
        factKeys: compactList(value.factKeys, 10),
        ruleKeys: compactList(value.ruleKeys, 10),
        description: trimText(value.description, 300),
      };
    }),
    forbiddenClaims: compactObjects(contract.forbiddenClaims, 30, (value) => {
      return {
        key: trimText(value.key, 120),
        description: trimText(value.description, 300),
        severity: trimText(value.severity, 40),
      };
    }),
    timingAllowed: contract.timingAllowed,
    timingRequired: contract.timingRequired,
    remedyAllowed: contract.remedyAllowed,
    exactFactsOnly: contract.exactFactsOnly,
    canUseGroq: contract.canUseGroq,
    accuracyClass: trimText(contract.accuracyClass, 80),
    limitations: compactList(contract.limitations, 20),
    safetyRestrictions: compactList(contract.safetyRestrictions, 20),
    writerInstructions: compactList(contract.writerInstructions, 20),
    metadata: {
      requiredFactKeys: compactList(contract.metadata.requiredFactKeys, 30),
      missingFacts: compactList(contract.metadata.missingFacts, 30),
      selectedRuleKeys: compactList(contract.metadata.selectedRuleKeys, 30),
      timingWindowCount: contract.metadata.timingWindowCount,
      retrievalPartial: contract.metadata.retrievalPartial,
      reasoningPartial: contract.metadata.reasoningPartial,
      blockedBySafety: contract.metadata.blockedBySafety,
    },
  };
}

export function compactContextForPrompt(context: RetrievalContext): Record<string, unknown> {
  return {
    chartFacts: compactChartFacts(context),
    reasoningRules: compactObjects(context.reasoningRules, 12, (value) => {
      return {
        ruleKey: trimText(value.ruleKey, 120),
        domain: trimText(value.domain, 80),
        title: trimText(value.title, 160),
        description: trimText(value.description, 300),
        requiredFactTypes: compactList(value.requiredFactTypes, 10),
        requiredTags: compactList(value.requiredTags, 10),
        reasoningTemplate: trimText(value.reasoningTemplate, 300),
        weight: typeof value.weight === "number" ? value.weight : undefined,
        safetyNotes: compactList(value.safetyNotes, 8),
        enabled: Boolean(value.enabled),
      };
    }),
    benchmarkExamples: compactExamples(context.benchmarkExamples, 4),
    timingWindows: compactTimingWindows(({
      ...context,
      available: true,
      requested: true,
      allowed: true,
      windows: [],
      warnings: [],
      missingSources: [],
      metadata: {
        domain: String(context.metadata.domain),
        sourceCounts: { dasha: 0, varshaphal: 0, python_transit: 0, stored: 0, user_provided: 0 },
        usedStoredWindows: false,
        usedDashaFacts: false,
        usedVarshaphalFacts: false,
        usedPythonAdapter: false,
        usedUserProvidedDates: false,
        partial: false,
      },
    } as unknown) as TimingContext),
    safeRemedies: compactObjects(context.safeRemedies, 8, (value) => {
      return {
        id: trimText(value.id, 120),
        domain: trimText(value.domain, 80),
        title: trimText(value.title, 160),
        description: trimText(value.description, 300),
        tags: compactList(value.tags, 8),
        restrictions: compactList(value.restrictions, 8),
        source: trimText(value.source, 40),
      };
    }),
    memorySummary: trimText(context.memorySummary, 600),
    metadata: {
      userId: trimText(context.metadata.userId, 120),
      profileId: trimText(context.metadata.profileId, 120),
      domain: trimText(context.metadata.domain, 80),
      requestedFactKeys: compactList(context.metadata.requestedFactKeys, 30),
      retrievalTags: compactList(context.metadata.retrievalTags, 30),
      errors: compactList(context.metadata.errors, 20),
      partial: context.metadata.partial,
    },
  };
}

export function compactReasoningPathForPrompt(reasoningPath: ReasoningPath): Record<string, unknown> {
  return {
    domain: trimText(reasoningPath.domain, 80),
    steps: compactObjects(reasoningPath.steps, 8, (value) => {
      return {
        id: trimText(value.id, 120),
        label: trimText(value.label, 160),
        factKeys: compactList(value.factKeys, 10),
        ruleKeys: compactList(value.ruleKeys, 10),
        explanation: trimText(value.explanation, 300),
        confidence: trimText(value.confidence, 40),
        tags: compactList(value.tags, 8),
      };
    }),
    selectedRuleKeys: compactList(reasoningPath.selectedRuleKeys, 30),
    selectedRuleIds: compactList(reasoningPath.selectedRuleIds, 30),
    missingAnchors: compactList(reasoningPath.missingAnchors, 20),
    warnings: compactList(reasoningPath.warnings, 20),
    summary: trimText(reasoningPath.summary, 500),
    metadata: {
      factCount: reasoningPath.metadata.factCount,
      ruleCount: reasoningPath.metadata.ruleCount,
      partial: reasoningPath.metadata.partial,
      stored: reasoningPath.metadata.stored,
    },
  };
}

export function compactTimingForPrompt(timing: TimingContext): Record<string, unknown> {
  return {
    available: timing.available,
    requested: timing.requested,
    allowed: timing.allowed,
    limitation: trimText(timing.limitation, 300),
    windows: compactTimingWindows(timing),
    missingSources: compactList(timing.missingSources, 20),
    warnings: compactList(timing.warnings, 20),
    metadata: {
      domain: trimText(timing.metadata.domain, 80),
      sourceCounts: timing.metadata.sourceCounts,
      usedStoredWindows: timing.metadata.usedStoredWindows,
      usedDashaFacts: timing.metadata.usedDashaFacts,
      usedVarshaphalFacts: timing.metadata.usedVarshaphalFacts,
      usedPythonAdapter: timing.metadata.usedPythonAdapter,
      usedUserProvidedDates: timing.metadata.usedUserProvidedDates,
      partial: timing.metadata.partial,
    },
  };
}

export function buildGroqAnswerMessages(input: GroqPromptInput): GroqPromptMessages {
  const system = [
    "You are writing a grounded Vedic astrology answer for tarayai.",
    "Use only supplied contract, anchors, chart facts, reasoning path, timing context, and restrictions.",
    "Do not invent chart facts.",
    "Do not invent dates or timing windows.",
    "Do not guarantee outcomes.",
    "Do not provide medical/legal/financial advice.",
    "Do not predict death/lifespan/fatal events.",
    "Do not claim gemstones/puja guarantee outcomes.",
    "Keep tone human, clear, calm, companion-like, not robotic.",
    input.correctionInstruction ? "This is a retry. Correct the prior issues exactly. Do not introduce new facts." : "",
    "Must output valid JSON only.",
    "JSON keys exactly: answer, sections, usedAnchors, limitations, suggestedFollowUp, confidence",
  ].filter(Boolean).join(" ");

  const user = JSON.stringify(
    {
      question: trimText(input.question, 1000),
      correctionInstruction: sanitizeRetryInstruction(input.correctionInstruction),
      contract: compactContractForPrompt(input.contract),
      retrievedFacts: compactContextForPrompt(input.context),
      reasoningPath: compactReasoningPathForPrompt(input.reasoningPath),
      timing: compactTimingForPrompt(input.timing),
      requiredSections: compactList(input.contract.requiredSections, 20),
      forbiddenClaims: compactObjects(input.contract.forbiddenClaims, 20, (value) => {
        return {
          key: trimText(value.key, 120),
          description: trimText(value.description, 300),
          severity: trimText(value.severity, 40),
        };
      }),
      writerInstructions: compactList(input.contract.writerInstructions, 20),
      retryDirective: input.correctionInstruction ? "This is a retry. Correct the prior issues exactly. Do not introduce new facts." : "",
    },
    null,
    2,
  );

  return { system, user };
}
