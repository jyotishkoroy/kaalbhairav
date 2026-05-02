/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { SupabaseLikeClient } from "./retrieval-types";

export function isAstroVectorRetrievalEnabled(): boolean {
  return process.env.ASTRO_VECTOR_RETRIEVAL_ENABLED === "true";
}

export interface AstroVectorSearchInput {
  query: string;
  embedding?: readonly number[];
  limit?: number;
}

export async function fetchVectorReasoningRuleCandidates(
  _supabase: SupabaseLikeClient,
  input: AstroVectorSearchInput,
): Promise<unknown[]> {
  if (!isAstroVectorRetrievalEnabled()) return [];
  if (!input.embedding || input.embedding.length === 0) return [];
  return [];
}
