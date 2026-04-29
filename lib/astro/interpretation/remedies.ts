import type { AstroEvidence } from "@/lib/astro/interpretation/evidence";
import {
  getMahadasha,
  matchesAny,
  type AstroInterpretationContext,
} from "@/lib/astro/interpretation/context";

export type Remedy = {
  planet?: string;
  type: "discipline" | "charity" | "mantra" | "reflection" | "service" | "routine";
  instruction: string;
  safetyNote?: string;
};

export const saturnSafeRemedies: Remedy[] = [
  {
    planet: "Saturn",
    type: "discipline",
    instruction:
      "Keep one fixed routine for 40 days, especially around waking time, work discipline, and unfinished responsibilities.",
  },
  {
    planet: "Saturn",
    type: "service",
    instruction:
      "On Saturdays, help an elderly person, worker, or someone in need without expecting recognition.",
  },
];

export function interpretRemedies(ctx: AstroInterpretationContext): AstroEvidence[] {
  if (ctx.concern.topic !== "remedy" && ctx.concern.questionType !== "remedy") {
    return [];
  }

  const evidence: AstroEvidence[] = [];
  const mahadasha = getMahadasha(ctx);

  if (matchesAny(mahadasha, ["saturn", "shani"])) {
    evidence.push({
      id: "remedy-saturn-safe-discipline",
      topic: "remedy",
      factor: "Saturn-safe remedy",
      humanMeaning:
        "The safest Saturn remedy is discipline, service, patience, and consistency rather than fear-based spending.",
      likelyExperience:
        "The person may want a direct remedy because the phase feels slow or heavy.",
      guidance:
        "Use routine, service, and responsibility-based remedies before considering strong gemstones or costly rituals.",
      caution:
        "Do not wear strong gemstones or pay for fear-based rituals without careful chart review by a trusted expert.",
      confidence: "high",
      visibleToUser: true,
    });
  }

  if (evidence.length === 0) {
    evidence.push({
      id: "remedy-general-safe",
      topic: "remedy",
      factor: "Safe remedy boundary",
      humanMeaning:
        "A safe remedy should support calmness, discipline, service, and better choices.",
      likelyExperience:
        "The person may be seeking relief and wants something practical to do.",
      guidance:
        "Prefer simple, non-harmful practices like prayer, charity, journaling, routine, and respectful service.",
      caution:
        "Avoid any remedy that promises guaranteed results, creates fear, or requires unaffordable spending.",
      confidence: "high",
      visibleToUser: true,
    });
  }

  return evidence;
}
