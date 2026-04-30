/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { CompanionMemoryDraft, CompanionMemoryExtractionInput, CompanionMemoryExtractionResult, CompanionMemoryStore } from "./companion-memory-types";
import { sanitizeMemoryDraft } from "./companion-memory-redactor";
import { shouldStoreCompanionMemory, shouldStoreDraft } from "./companion-memory-policy";

function uniqueDrafts(drafts: CompanionMemoryDraft[]): CompanionMemoryDraft[] {
  const seen = new Set<string>();
  return drafts.filter((draft) => {
    const key = `${draft.memoryType}|${draft.topic ?? ""}|${draft.content.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pushDraft(drafts: CompanionMemoryDraft[], draft: CompanionMemoryDraft): void {
  if (drafts.length < 3) drafts.push(draft);
}

export function extractCompanionMemoryDrafts(input: CompanionMemoryExtractionInput): CompanionMemoryExtractionResult {
  const policy = shouldStoreCompanionMemory(input);
  if (!policy.allowed) return { drafts: [], skipped: true, reason: policy.reason, warnings: [] };
  const question = `${input.question} ${input.listening?.userSituationSummary ?? ""}`.toLowerCase();
  const answer = input.finalAnswer.toLowerCase();
  const drafts: CompanionMemoryDraft[] = [];
  if (/(vedic|traditional|practical remedies?|simple language|non-fear|fear-based)/.test(question + " " + answer)) pushDraft(drafts, { memoryType: "preference", topic: "spirituality", content: "User prefers Vedic, practical, simple, non-fear guidance.", sourceMessageId: input.sourceMessageId ?? null });
  if (/(career recognition|promotion delay|job recognition|career pressure)/.test(question + " " + answer)) pushDraft(drafts, { memoryType: "recurring_concern", topic: "career", content: "Recurring concern around career recognition and timing." });
  if (/(marriage delay|marriage confusion|relationship confusion)/.test(question + " " + answer)) pushDraft(drafts, { memoryType: "recurring_concern", topic: "marriage", content: "Recurring concern around marriage delay or relationship clarity." });
  if (/(money anxiety|income pressure|salary stress)/.test(question + " " + answer)) pushDraft(drafts, { memoryType: "recurring_concern", topic: "money", content: "Recurring concern around money anxiety and stability." });
  if (/(consistency over intensity|journaling|sleep routine|communication boundaries|avoid expensive|avoid fear)/.test(answer)) pushDraft(drafts, { memoryType: "guidance_given", topic: "general", content: answer.includes("consistency over intensity") ? "Consistency over intensity." : answer.includes("sleep routine") ? "Use a steady sleep routine." : "Use clear and calm boundaries.", sourceMessageId: input.sourceMessageId ?? null });
  if (/(avoid fear|avoid generic|avoid certainty|avoid expensive)/.test(question + " " + answer)) pushDraft(drafts, { memoryType: "boundary", topic: "remedy", content: "Avoid fear-based, generic, or expensive remedies." });
  if (/(education|study|exam|family pressure)/.test(question + " " + answer)) pushDraft(drafts, { memoryType: "recurring_concern", topic: /family pressure/.test(question + " " + answer) ? "family" : "education", content: /family pressure/.test(question + " " + answer) ? "Recurring concern around family pressure." : "Recurring concern around education confusion." });
  const cleaned = uniqueDrafts(drafts)
    .map((draft) => sanitizeMemoryDraft(draft))
    .filter((draft): draft is CompanionMemoryDraft => draft !== null && shouldStoreDraft(draft).allowed);
  return { drafts: cleaned.slice(0, 3), skipped: cleaned.length === 0, warnings: [] };
}

export async function saveCompanionMemorySafely(input: CompanionMemoryExtractionInput & { store?: CompanionMemoryStore }): Promise<CompanionMemoryExtractionResult> {
  const extracted = extractCompanionMemoryDrafts(input);
  if (!input.store || extracted.skipped) return extracted;
  const warnings = [...extracted.warnings];
  try {
    for (const draft of extracted.drafts) {
      await input.store.upsertMemory({ userId: input.userId as string, draft });
    }
    return { ...extracted, warnings };
  } catch {
    warnings.push("store_failed");
    return { ...extracted, warnings };
  }
}
