/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type CompanionMemoryType =
  | "preference"
  | "recurring_concern"
  | "emotional_pattern"
  | "guidance_given"
  | "boundary"
  | "birth_context"
  | "relationship_context"
  | "career_context";

export type CompanionMemoryConfidence = "low" | "medium" | "high";

export type CompanionMemoryTopic =
  | "relationship"
  | "marriage"
  | "career"
  | "money"
  | "health"
  | "family"
  | "education"
  | "timing"
  | "remedy"
  | "spirituality"
  | "general"
  | "unknown";

export type CompanionMemoryItem = {
  id: string;
  userId: string;
  memoryType: CompanionMemoryType;
  topic: CompanionMemoryTopic | string | null;
  content: string;
  confidence: CompanionMemoryConfidence;
  sourceMessageId?: string | null;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type CompanionMemoryDraft = {
  memoryType: CompanionMemoryType;
  topic?: CompanionMemoryTopic | string | null;
  content: string;
  confidence?: CompanionMemoryConfidence;
  sourceMessageId?: string | null;
};

export type CompanionMemoryRetrievalInput = {
  userId: string;
  topic?: CompanionMemoryTopic | string | null;
  question?: string;
  maxItems?: number;
  includeLowConfidence?: boolean;
  env?: Record<string, string | undefined>;
};

export type CompanionMemoryExtractionInput = {
  userId?: string | null;
  question: string;
  finalAnswer: string;
  listening?: import("../listening").ListeningAnalysis | null;
  plan?: import("../synthesis").ReadingPlan | null;
  critic?: import("../critic").ReadingCriticResult | null;
  sourceMessageId?: string | null;
  env?: Record<string, string | undefined>;
};

export type CompanionMemoryStore = {
  listForUser: (input: CompanionMemoryRetrievalInput) => Promise<CompanionMemoryItem[]>;
  upsertMemory: (input: { userId: string; draft: CompanionMemoryDraft }) => Promise<CompanionMemoryItem | null>;
  archiveMemory: (input: { userId: string; memoryId: string }) => Promise<boolean>;
  clearUserMemory: (input: { userId: string; topic?: string | null }) => Promise<boolean>;
};

export type CompanionMemoryRetrievalResult = {
  used: boolean;
  memories: CompanionMemoryItem[];
  summary?: string;
  warnings: string[];
  source: "supabase" | "disabled" | "fallback";
};

export type CompanionMemoryExtractionResult = {
  drafts: CompanionMemoryDraft[];
  skipped: boolean;
  reason?: string;
  warnings: string[];
};
