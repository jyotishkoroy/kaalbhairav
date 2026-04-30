// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { BuildAnswerContractInput } from "../answer-contract-types";
import { COMMON_VALIDATOR_RULES, uniqueStrings } from "./common";

export function buildMarriageContractParts(input: BuildAnswerContractInput) {
  const timingAllowed = Boolean(input.timing.available && input.sufficiency.metadata.timingAllowed);
  const remedyAllowed = Boolean(input.plan.remedyAllowed && input.context.safeRemedies.length && input.sufficiency.answerMode !== "safety");
  return {
    mustInclude: uniqueStrings([
      "direct answer to relationship or marriage concern",
      "7th house anchor when available",
      "7th lord anchor when available",
      "Venus relationship anchor when available",
      "dasha/timing only if available and allowed",
      "relationship pattern/practical steps",
      "accuracy class",
      "suggested follow-up",
    ]),
    mustNotInclude: uniqueStrings([
      "guaranteed marriage",
      "exact date unless TimingContext supplies it",
      "fear-based breakup or divorce certainty",
      "gemstone certainty",
      "expensive puja",
      "invented spouse details",
    ]),
    requiredSections: uniqueStrings(["direct_answer", "chart_basis", "reasoning", "what_to_do", "accuracy", "suggested_follow_up", ...(timingAllowed ? ["timing"] : []), ...(remedyAllowed ? ["safe_remedies"] : []), ...(input.sufficiency.limitations.length ? ["limitations"] : [])]),
    optionalSections: uniqueStrings(["timing", "safe_remedies", "limitations"]),
    validatorRules: uniqueStrings([
      ...COMMON_VALIDATOR_RULES,
      "require_section:direct_answer",
      "require_section:chart_basis",
      "require_section:reasoning",
      "require_section:what_to_do",
      "require_section:accuracy",
      "require_section:suggested_follow_up",
      "forbid_claim:guaranteed_outcome",
      `timing_allowed:${timingAllowed}`,
      `remedy_allowed:${remedyAllowed}`,
      "accuracy_class:grounded_interpretive",
    ]),
    writerInstructions: uniqueStrings([
      "Use supplied anchors only.",
      "Keep the tone calm and practical.",
      "Do not promise marriage or exact dates.",
      "Mention timing only when grounded and allowed.",
    ]),
  };
}
