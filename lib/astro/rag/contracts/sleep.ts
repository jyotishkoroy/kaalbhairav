// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { BuildAnswerContractInput } from "../answer-contract-types";
import { COMMON_VALIDATOR_RULES, uniqueStrings } from "./common";

export function buildSleepContractParts(input: BuildAnswerContractInput) {
  const remedyAllowed = Boolean(input.plan.remedyAllowed && input.context.safeRemedies.length && input.sufficiency.answerMode !== "safety");
  return {
    mustInclude: uniqueStrings([
      "direct answer to sleep or remedy concern",
      "Moon/rest/mind anchor if available",
      "12th house rest/sleep anchor if available",
      "6th house routine/stress anchor if available",
      "safe low-cost routine",
      "non-medical limitation",
      "accuracy class",
      "suggested follow-up",
    ]),
    mustNotInclude: uniqueStrings([
      "diagnosis of insomnia or medical condition",
      "advice to stop medicine",
      "guaranteed cure",
      "expensive puja",
      "gemstone certainty",
      "fear-based claims",
    ]),
    requiredSections: uniqueStrings(["direct_answer", "chart_basis", "what_to_do", ...(remedyAllowed ? ["safe_remedies"] : []), "accuracy", "suggested_follow_up", ...(input.sufficiency.limitations.length ? ["limitations"] : [])]),
    optionalSections: uniqueStrings(["safe_remedies", "limitations"]),
    validatorRules: uniqueStrings([
      ...COMMON_VALIDATOR_RULES,
      "require_section:direct_answer",
      "require_section:chart_basis",
      "require_section:what_to_do",
      "require_section:accuracy",
      "require_section:suggested_follow_up",
      "forbid_claim:medical_diagnosis",
      "forbid_claim:invented_timing",
      `remedy_allowed:${remedyAllowed}`,
      "accuracy_class:grounded_interpretive",
    ]),
    writerInstructions: uniqueStrings([
      "Keep remedies optional, low-cost, and non-coercive.",
      "Do not diagnose.",
      "Do not suggest medication changes.",
      "Human-like tone, not robotic.",
    ]),
  };
}
