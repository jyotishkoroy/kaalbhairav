import type { AstroEvidence } from "@/lib/astro/interpretation/evidence";
import { type AstroInterpretationContext } from "@/lib/astro/interpretation/context";

export function interpretTiming(ctx: AstroInterpretationContext): AstroEvidence[] {
  if (ctx.concern.questionType !== "timing") return [];

  return [
    {
      id: "timing-probability-boundary",
      topic: ctx.concern.topic,
      factor: "Timing question",
      humanMeaning:
        "Timing should be read as a supportive period or caution period, not as an absolute guarantee.",
      likelyExperience:
        "The person may want a clear date because uncertainty feels emotionally heavy.",
      guidance:
        "Use timing as planning guidance while still making practical preparation.",
      caution: "Avoid treating one predicted month or date as a guaranteed outcome.",
      timingHint:
        "A responsible timing reading should use dasha, transit, and the specific life area together.",
      confidence: "high",
      visibleToUser: true,
    },
  ];
}
