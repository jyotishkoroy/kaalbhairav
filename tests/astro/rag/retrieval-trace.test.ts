/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import { createAstroRetrievalTraceId, sanitizeAstroRetrievalTrace } from "../../../lib/astro/rag/retrieval-trace";

describe("retrieval trace", () => {
  it("creates an id with the expected prefix", () => {
    expect(createAstroRetrievalTraceId()).toMatch(/^astro_rag_/);
  });

  it("sanitizes raw rule bodies", () => {
    const trace = sanitizeAstroRetrievalTrace({
      traceId: "t1",
      enabled: true,
      questionDomain: "career",
      structuredRagEnabled: true,
      fallbackUsed: false,
      candidateCount: 2,
      selectedCount: 1,
      selectedRules: [{ ruleId: "r1", score: 10, rankingReasons: ["domain"], rejectionReasons: ["raw"], sourceReliability: "primary_classical", lifeAreaTags: ["career"], conditionTags: ["10th"] }],
      rejectedRules: [{ ruleId: "r2", score: 1, rankingReasons: ["bad"], rejectionReasons: ["missing"], sourceReliability: "modern_interpretation", lifeAreaTags: ["marriage"], conditionTags: ["7th"] }],
      packedPromptCharacters: 300,
      exactFactMode: false,
      safetyBlocked: false,
      fallbackReason: "none",
    });
    expect(trace.selectedRules[0].ruleId).toBe("r1");
    expect(JSON.stringify(trace)).not.toMatch(/raw rule body|user birth data|secret/i);
  });

  it("keeps counts and flags", () => {
    const trace = sanitizeAstroRetrievalTrace({
      traceId: "t2",
      enabled: true,
      structuredRagEnabled: false,
      fallbackUsed: true,
      candidateCount: 0,
      selectedCount: 0,
      selectedRules: [],
      exactFactMode: true,
      safetyBlocked: true,
    });
    expect(trace.fallbackUsed).toBe(true);
    expect(trace.exactFactMode).toBe(true);
    expect(trace.safetyBlocked).toBe(true);
  });

  it("normalizes missing arrays", () => {
    const trace = sanitizeAstroRetrievalTrace({
      traceId: "t3",
      enabled: true,
      structuredRagEnabled: true,
      fallbackUsed: false,
      candidateCount: 1,
      selectedCount: 1,
      selectedRules: [{ ruleId: "r3" }],
    });
    expect(trace.selectedRules).toHaveLength(1);
    expect(trace.selectedRules[0].lifeAreaTags).toEqual([]);
  });

  it("does not leak prompt character details when absent", () => {
    const trace = sanitizeAstroRetrievalTrace({
      traceId: "t4",
      enabled: true,
      structuredRagEnabled: true,
      fallbackUsed: false,
      candidateCount: 0,
      selectedCount: 0,
      selectedRules: [],
    });
    expect(trace.packedPromptCharacters).toBeUndefined();
  });
});
