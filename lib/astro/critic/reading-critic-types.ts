/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type ReadingCriticResult = {
  safe: boolean;
  grounded: boolean;
  specific: boolean;
  compassionate: boolean;

  feelsHeardScore: number;
  genericnessScore: number;
  fearBasedScore: number;

  missingRequiredElements: Array<
    | "emotional_acknowledgement"
    | "chart_anchor"
    | "lived_experience"
    | "practical_guidance"
    | "reassurance"
    | "follow_up"
    | "safety_boundary"
  >;

  unsafeClaims: string[];
  inventedFacts: string[];
  unsupportedTimingClaims: string[];
  unsupportedRemedies: string[];

  shouldRewrite: boolean;
  rewriteInstructions: string[];

  source: "ollama" | "skipped" | "fallback";
};

export type ReadingCriticInput = {
  question: string;
  listening: import("../listening").ListeningAnalysis;
  plan: import("../synthesis").ReadingPlan;
  answer: string;
  safetyBoundaries?: string[];
  env?: Record<string, string | undefined>;
};

export type ReadingCriticClient = {
  critique: (input: {
    prompt: { system: string; user: string };
    profile: import("../rag/local-model-router").LocalModelProfile;
    timeoutMs: number;
  }) => Promise<unknown>;
};

export type ReadingCriticPolicyResult = {
  allowed: boolean;
  fallbackReason?: string;
  warnings: string[];
};

export type ReadingRewritePolicyResult = {
  allowed: boolean;
  reason: string;
  instructions: string[];
};
