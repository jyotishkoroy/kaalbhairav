/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type FinalAnswerQualityFailure =
  | "internal_instruction_leak"
  | "memory_contamination"
  | "duplicate_topic_phrase"
  | "wrong_domain_answer"
  | "safety_overreplacement"
  | "generic_boilerplate"
  | "unsupported_chart_fact"
  | "unsafe_claim"
  | "unsafe_remedy"
  | "empty_answer"
  | "metadata_leak"

export type FinalAnswerQualityResult = {
  allowed: boolean
  failures: FinalAnswerQualityFailure[]
  rewriteHint?: string
}

export type FinalAnswerQualityInput = {
  answerText: string
  rawQuestion?: string
  coreQuestion?: string
  mode?: string
  primaryIntent?: string
  secondaryIntents?: string[]
  exactFactExpected?: boolean
  expectedDomain?: string
  metadata?: Record<string, unknown>
}
