// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { RequiredDataPlan } from "./required-data-planner";
import type { RetrievalContext } from "./retrieval-types";
import type { ReasoningPath } from "./reasoning-path-builder";
import type { SufficiencyDecision } from "./sufficiency-checker";
import type { TimingContext } from "./timing-engine";

export type AnswerContractDomain =
  | "safety"
  | "exact_fact"
  | "career"
  | "sleep"
  | "marriage"
  | "money"
  | "foreign"
  | "education"
  | "spirituality"
  | "health"
  | "legal"
  | "timing"
  | "general";

export type AnswerSection =
  | "direct_answer"
  | "chart_basis"
  | "reasoning"
  | "timing"
  | "what_to_do"
  | "safe_remedies"
  | "accuracy"
  | "suggested_follow_up"
  | "limitations"
  | "safety_response";

export type AnswerAccuracyClass = "totally_accurate" | "grounded_interpretive" | "partial" | "unavailable" | "safety_only";

export type ContractAnchor = {
  key: string;
  label: string;
  required: boolean;
  source: "chart_fact" | "reasoning_path" | "timing" | "safety" | "retrieval" | "sufficiency";
  factKeys: string[];
  ruleKeys: string[];
  description: string;
};

export type ForbiddenClaim = {
  key: string;
  description: string;
  severity: "block" | "warn";
};

export type AnswerContract = {
  id?: string;
  domain: AnswerContractDomain;
  answerMode: SufficiencyDecision["answerMode"];
  question: string;
  mustInclude: string[];
  mustNotInclude: string[];
  requiredSections: AnswerSection[];
  optionalSections: AnswerSection[];
  anchors: ContractAnchor[];
  forbiddenClaims: ForbiddenClaim[];
  timingAllowed: boolean;
  timingRequired: boolean;
  remedyAllowed: boolean;
  exactFactsOnly: boolean;
  canUseGroq: boolean;
  canUseOllamaCritic: boolean;
  accuracyClass: AnswerAccuracyClass;
  limitations: string[];
  safetyRestrictions: string[];
  validatorRules: string[];
  writerInstructions: string[];
  metadata: {
    requiredFactKeys: string[];
    missingFacts: string[];
    selectedRuleKeys: string[];
    timingWindowCount: number;
    retrievalPartial: boolean;
    reasoningPartial: boolean;
    blockedBySafety: boolean;
  };
};

export type BuildAnswerContractInput = {
  question: string;
  plan: RequiredDataPlan;
  context: RetrievalContext;
  reasoningPath: ReasoningPath;
  timing: TimingContext;
  sufficiency: SufficiencyDecision;
};

export type StoreAnswerContractInput = {
  supabase: {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => {
        select?: (columns?: string) => PromiseLike<{ data: unknown; error: unknown }>;
      } | PromiseLike<{ data: unknown; error: unknown }>;
    };
  };
  userId: string;
  profileId?: string | null;
  question: string;
  contract: AnswerContract;
};
