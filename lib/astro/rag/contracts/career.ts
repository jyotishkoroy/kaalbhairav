// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { BuildAnswerContractInput } from "../answer-contract-types";
import { COMMON_VALIDATOR_RULES, uniqueStrings } from "./common";

export function buildCareerContractParts(input: BuildAnswerContractInput): Pick<
  import("../answer-contract-types").AnswerContract,
  "mustInclude" | "mustNotInclude" | "requiredSections" | "optionalSections" | "validatorRules" | "writerInstructions"
> {
  const timingShown = Boolean(input.timing.available && input.sufficiency.metadata.timingAllowed);
  const remedyShown = Boolean(input.plan.remedyAllowed && input.context.safeRemedies.length && input.sufficiency.answerMode !== "safety");
  return {
    mustInclude: uniqueStrings([
      "direct reason for delay or recognition issue",
      "chart basis from supplied anchors",
      "10th house/status anchor",
      "10th lord/career routing anchor",
      "11th house/gains/network anchor",
      "dasha/timing backdrop only if available",
      "practical workplace steps",
      "accuracy class",
      "suggested follow-up",
    ]),
    mustNotInclude: uniqueStrings([
      "guaranteed promotion",
      "exact date unless TimingContext supplies it",
      "unrelated medical/legal disclaimer",
      "expensive puja",
      "gemstone certainty",
      "generic monthly dump",
      "invented boss or salary facts",
    ]),
    requiredSections: uniqueStrings([
      "direct_answer",
      "chart_basis",
      "reasoning",
      "what_to_do",
      "accuracy",
      "suggested_follow_up",
      ...(timingShown ? ["timing"] : []),
      ...(remedyShown ? ["safe_remedies"] : []),
      ...(input.sufficiency.limitations.length ? ["limitations"] : []),
    ]) as never,
    optionalSections: uniqueStrings(["timing", "safe_remedies", "limitations"]) as never,
    validatorRules: uniqueStrings([
      ...COMMON_VALIDATOR_RULES,
      "require_section:direct_answer",
      "require_section:chart_basis",
      "require_section:reasoning",
      "require_section:what_to_do",
      "require_section:accuracy",
      "require_section:suggested_follow_up",
      "forbid_claim:guaranteed_promotion",
      "forbid_claim:invented_timing",
      "timing_allowed:true",
      `remedy_allowed:${Boolean(input.plan.remedyAllowed)}`,
      "exact_facts_only:false",
      `groq_allowed:${input.sufficiency.canUseGroq}`,
      "accuracy_class:grounded_interpretive",
    ]),
    writerInstructions: uniqueStrings([
      "Write in human, direct, companion-like language.",
      "Use supplied anchors only.",
      "Explain why recognition may feel delayed without promising promotion.",
      "Keep practical steps grounded.",
      "Do not overuse jargon.",
      "Do not mention internal module names.",
    ]),
  };
}
