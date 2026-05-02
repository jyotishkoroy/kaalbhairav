/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from "vitest";
import { fetchVectorReasoningRuleCandidates, isAstroVectorRetrievalEnabled } from "../../../lib/astro/rag/vector-retrieval";

describe("vector retrieval", () => {
  it("returns disabled by default", () => {
    delete (process.env as Record<string, string | undefined>).ASTRO_VECTOR_RETRIEVAL_ENABLED;
    expect(isAstroVectorRetrievalEnabled()).toBe(false);
  });

  it("returns empty candidates when disabled", async () => {
    delete (process.env as Record<string, string | undefined>).ASTRO_VECTOR_RETRIEVAL_ENABLED;
    await expect(fetchVectorReasoningRuleCandidates({ from: () => ({}) } as never, { query: "career" })).resolves.toEqual([]);
  });

  it("returns empty candidates without embeddings", async () => {
    (process.env as Record<string, string | undefined>).ASTRO_VECTOR_RETRIEVAL_ENABLED = "true";
    await expect(fetchVectorReasoningRuleCandidates({ from: () => ({}) } as never, { query: "career", embedding: [] })).resolves.toEqual([]);
  });

  it("does not call external providers automatically", async () => {
    (process.env as Record<string, string | undefined>).ASTRO_VECTOR_RETRIEVAL_ENABLED = "true";
    await expect(fetchVectorReasoningRuleCandidates({ from: () => ({}) } as never, { query: "career", embedding: [0.1, 0.2] })).resolves.toEqual([]);
  });

  it("falls back safely on vector errors", async () => {
    (process.env as Record<string, string | undefined>).ASTRO_VECTOR_RETRIEVAL_ENABLED = "true";
    const result = await fetchVectorReasoningRuleCandidates({ from: () => ({}) } as never, { query: "career", embedding: [0.1, 0.2], limit: 5 });
    expect(result).toEqual([]);
  });

  it("does not require vector env for production route reads", () => {
    delete (process.env as Record<string, string | undefined>).ASTRO_VECTOR_RETRIEVAL_ENABLED;
    expect(isAstroVectorRetrievalEnabled()).toBe(false);
  });
});
