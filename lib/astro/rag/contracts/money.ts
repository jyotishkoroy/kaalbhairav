// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { BuildAnswerContractInput } from "../answer-contract-types";
import { COMMON_VALIDATOR_RULES, uniqueStrings } from "./common";

export function buildMoneyContractParts(input: BuildAnswerContractInput) {
  const timingAllowed = Boolean(input.timing.available && input.sufficiency.metadata.timingAllowed);
  return {
    mustInclude: uniqueStrings([
      "direct answer to income, savings, debt, or business concern",
      "2nd house/income-base anchor when available",
      "11th house/gains anchor when available",
      "lord routing anchor when available",
      "dasha/timing only if available and allowed",
      "practical money discipline/risk-awareness steps",
      "accuracy class",
      "suggested follow-up",
    ]),
    mustNotInclude: uniqueStrings([
      "financial guarantee",
      "investment instruction",
      "lottery prediction",
      "stock certainty",
      "crypto certainty",
      "exact profit date without grounded timing",
      "gemstone certainty",
      "expensive puja",
    ]),
    requiredSections: uniqueStrings(["direct_answer", "chart_basis", "reasoning", "what_to_do", "accuracy", "suggested_follow_up", ...(timingAllowed ? ["timing"] : []), ...(input.sufficiency.limitations.length ? ["limitations"] : [])]),
    optionalSections: uniqueStrings(["timing", "limitations"]),
    validatorRules: uniqueStrings([
      ...COMMON_VALIDATOR_RULES,
      "require_section:direct_answer",
      "require_section:chart_basis",
      "require_section:reasoning",
      "require_section:what_to_do",
      "require_section:accuracy",
      "require_section:suggested_follow_up",
      "forbid_claim:financial_advice",
      `timing_allowed:${timingAllowed}`,
      "remedy_allowed:false",
      "accuracy_class:grounded_interpretive",
    ]),
    writerInstructions: uniqueStrings([
      "Stay practical and avoid financial advice.",
      "Do not promise gains or exact returns.",
      "Mention risk-awareness and discipline instead of certainty.",
    ]),
  };
}
