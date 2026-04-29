import type { AstroEvidence } from "@/lib/astro/interpretation/evidence";
import { type AstroInterpretationContext } from "@/lib/astro/interpretation/context";

export function interpretHealth(ctx: AstroInterpretationContext): AstroEvidence[] {
  if (ctx.concern.topic !== "health" && ctx.concern.topic !== "death") return [];

  return [
    {
      id: "health-responsible-boundary",
      topic: "health",
      factor: "Health-sensitive concern",
      humanMeaning:
        "Astrology can be used for general wellbeing reflection, but it should not diagnose disease.",
      likelyExperience:
        "The person may be anxious and looking for certainty about symptoms or health outcomes.",
      guidance:
        "Use astrology only as a prompt for better routine, rest, stress management, and timely medical consultation.",
      caution:
        "Do not use a chart reading as a substitute for a qualified doctor, diagnosis, or treatment.",
      confidence: "high",
      visibleToUser: true,
    },
  ];
}
