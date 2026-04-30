/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type ListeningAnalysis = {
  topic: "relationship" | "marriage" | "career" | "money" | "health" | "family" | "education" | "timing" | "remedy" | "general" | "unknown";
  emotionalTone: "anxious" | "sad" | "confused" | "hopeful" | "fearful" | "urgent" | "calm" | "detached";
  emotionalNeed: "reassurance" | "clarity" | "decision_support" | "grounding" | "hope" | "boundary_setting" | "practical_steps" | "spiritual_support";
  userSituationSummary: string;
  acknowledgementHint: string;
  missingContext: Array<"birth_date" | "birth_time" | "birth_place" | "current_situation" | "specific_question" | "relationship_status" | "career_context" | "time_window">;
  shouldAskFollowUp: boolean;
  followUpQuestion?: string;
  safetyRisks: Array<"medical" | "legal" | "financial_guarantee" | "death_lifespan" | "pregnancy" | "self_harm" | "curse_fear" | "expensive_remedy_pressure" | "deterministic_prediction">;
  humanizationHints: string[];
  source: "ollama" | "deterministic_fallback";
  confidence: "low" | "medium" | "high";
};

export type ListeningAnalyzerInput = {
  question: string;
  userContext?: string | null;
  topicHint?: string | null;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
};

export type ListeningAnalyzerClient = {
  analyze: (input: {
    question: string;
    prompt: { system: string; user: string };
    profile: import("../rag/local-model-router").LocalModelProfile;
  }) => Promise<unknown>;
};

export type ListeningPolicyResult = {
  allowed: boolean;
  fallbackReason?: string;
  warnings: string[];
};
