// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerContract } from "./answer-contract-types";
import type { RetrievalContext } from "./retrieval-types";
import type { ReasoningPath } from "./reasoning-path-builder";
import type { TimingContext } from "./timing-engine";
import type { GroqAnswerJson } from "./groq-answer-writer";
import type { QuestionFrame } from "./question-frame-types";
import type { StructuredIntent } from "./structured-intent-types";

export type ValidationSeverity = "error" | "warning";

export type ValidationIssueCode =
  | "missing_answer"
  | "missing_required_section"
  | "missing_required_anchor"
  | "unknown_anchor"
  | "invented_chart_fact"
  | "wrong_chart_fact"
  | "invented_timing"
  | "timing_not_allowed"
  | "unsafe_claim"
  | "medical_claim"
  | "legal_claim"
  | "financial_claim"
  | "death_lifespan_claim"
  | "gemstone_guarantee"
  | "expensive_puja_pressure"
  | "remedy_not_allowed"
  | "unsafe_remedy"
  | "generic_answer"
  | "too_short"
  | "too_repetitive"
  | "does_not_answer_question"
  | "forbidden_claim"
  | "accuracy_missing"
  | "followup_missing"
  | "contract_violation";

export type ValidationIssue = {
  code: ValidationIssueCode;
  severity: ValidationSeverity;
  message: string;
  evidence?: string;
};

export type AnswerValidationInput = {
  question: string;
  answer: string;
  json?: GroqAnswerJson | null;
  contract: AnswerContract;
  context: RetrievalContext;
  reasoningPath: ReasoningPath;
  timing: TimingContext;
  questionFrame?: QuestionFrame;
  structuredIntent?: StructuredIntent;
};

export type AnswerValidationResult = {
  ok: boolean;
  score: number;
  issues: ValidationIssue[];
  missingAnchors: string[];
  missingSections: string[];
  wrongFacts: string[];
  unsafeClaims: string[];
  genericnessScore: number;
  retryRecommended: boolean;
  fallbackRecommended: boolean;
  correctionInstruction: string;
  metadata: {
    checkedAnchors: number;
    checkedSections: number;
    checkedTimingWindows: number;
    contractDomain: string;
    contractAnswerMode: string;
    strictFailureCount: number;
    warningCount: number;
  };
};

export type StoreValidationResultInput = {
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
  answer: string;
  validation: AnswerValidationResult;
  contractId?: string | null;
};
