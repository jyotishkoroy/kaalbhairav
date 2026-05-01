/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { CompanionMemoryRetrievalInput, CompanionMemoryRetrievalResult, CompanionMemoryStore } from "./companion-memory-types";
import { buildMemorySummary, filterRetrievedMemories, gateCompanionMemoriesForUserFacingUse, shouldRetrieveCompanionMemory } from "./companion-memory-policy";

export async function retrieveCompanionMemorySafely(input: CompanionMemoryRetrievalInput & { store?: CompanionMemoryStore }): Promise<CompanionMemoryRetrievalResult> {
  const policy = shouldRetrieveCompanionMemory(input);
  if (!policy.allowed || !input.store) {
    return { used: false, memories: [], warnings: [policy.reason ?? "fallback"], source: input.store ? "disabled" : "fallback" };
  }
  try {
    const memories = await input.store.listForUser({ ...input, maxItems: policy.maxItems });
    const filtered = filterRetrievedMemories({ memories, topic: input.topic, question: input.question, maxItems: policy.maxItems, includeLowConfidence: input.includeLowConfidence });
    const gated = gateCompanionMemoriesForUserFacingUse({ memories: filtered, currentPrimaryIntent: input.topic ?? null, currentQuestion: input.question ?? undefined, now: new Date(), env: input.env });
    return { used: gated.usable.length > 0, memories: gated.usable, summary: gated.usable.length ? buildMemorySummary(gated.usable) : undefined, warnings: [], source: "supabase" };
  } catch {
    return { used: false, memories: [], warnings: ["fallback"], source: "fallback" };
  }
}
