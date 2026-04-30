// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { BuildAnswerContractInput } from "../answer-contract-types";
import { COMMON_VALIDATOR_RULES, uniqueStrings } from "./common";

export function buildSafetyContractParts(input: BuildAnswerContractInput) {
  void input;
  return {
    mustInclude: uniqueStrings([
      "safe refusal or restriction",
      "why the topic cannot be answered with certainty",
      "safer alternative question or support direction",
      "limitations",
      "suggested follow-up where appropriate",
    ]),
    mustNotInclude: uniqueStrings([
      "death-date prediction",
      "diagnosis or treatment instruction",
      "legal advice",
      "investment advice",
      "self-harm methods",
      "guarantees",
    ]),
    requiredSections: uniqueStrings(["safety_response", "limitations", "suggested_follow_up"]),
    optionalSections: uniqueStrings([]),
    validatorRules: uniqueStrings([
      ...COMMON_VALIDATOR_RULES,
      "require_section:safety_response",
      "require_section:limitations",
      "require_section:suggested_follow_up",
      "timing_allowed:false",
      "remedy_allowed:false",
      "exact_facts_only:false",
      "groq_allowed:false",
      "accuracy_class:safety_only",
    ]),
    writerInstructions: uniqueStrings([
      "Be brief, safe, and non-judgmental.",
      "Offer a safer next question or support direction.",
      "Do not expand into interpretation beyond the refusal.",
    ]),
  };
}
