// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { BuildAnswerContractInput } from "../answer-contract-types";
import { COMMON_VALIDATOR_RULES, uniqueStrings } from "./common";

export function buildGeneralContractParts(input: BuildAnswerContractInput) {
  const timingAllowed = Boolean(input.timing.available && input.sufficiency.metadata.timingAllowed);
  const timingLimited = input.sufficiency.answerMode === "timing_limited";
  return {
    mustInclude: uniqueStrings([
      "direct answer only if sufficient",
      "chart basis from supplied anchors",
      "limitations where applicable",
      "safe next step",
      "accuracy class",
      "suggested follow-up",
    ]),
    mustNotInclude: uniqueStrings([
      "invented timing",
      "unsupported medical claim",
      "unsupported legal claim",
      "unsupported financial claim",
    ]),
    requiredSections: uniqueStrings([
      ...(timingLimited ? ["direct_answer", "limitations", "accuracy", "suggested_follow_up"] : ["direct_answer", "chart_basis", "limitations", "accuracy", "suggested_follow_up"]),
    ]),
    optionalSections: uniqueStrings(["chart_basis", "reasoning", "timing", "what_to_do", "safe_remedies"]),
    validatorRules: uniqueStrings([
      ...COMMON_VALIDATOR_RULES,
      "require_section:direct_answer",
      "require_section:limitations",
      "require_section:accuracy",
      "require_section:suggested_follow_up",
      `timing_allowed:${timingAllowed}`,
      `remedy_allowed:${Boolean(input.plan.remedyAllowed)}`,
      `groq_allowed:${input.sufficiency.canUseGroq}`,
      "accuracy_class:grounded_interpretive",
    ]),
    writerInstructions: uniqueStrings([
      "Answer plainly and stay within supplied evidence.",
      "Avoid over-specific timing unless grounded.",
      "Use a safe, practical next step.",
    ]),
  };
}
