/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type { AstroEvidence } from "@/lib/astro/interpretation/evidence";
import {
  getAntardasha,
  getMahadasha,
  matchesAny,
  type AstroInterpretationContext,
} from "@/lib/astro/interpretation/context";

export function interpretMarriage(ctx: AstroInterpretationContext): AstroEvidence[] {
  if (ctx.concern.topic !== "marriage") return [];

  const evidence: AstroEvidence[] = [];
  const mahadasha = getMahadasha(ctx);
  const antardasha = getAntardasha(ctx);

  if (matchesAny(mahadasha, ["saturn", "shani"])) {
    evidence.push({
      id: "marriage-saturn-delay",
      topic: "marriage",
      factor: "Saturn influence",
      humanMeaning:
        "Marriage themes may mature slowly, with delay pushing the person toward a more serious and stable bond.",
      likelyExperience:
        "The person may feel tired of waiting or pressured by comparison with others.",
      guidance:
        "Prioritize emotional maturity, realistic expectations, and long-term compatibility over urgency.",
      caution: "Do not treat delay as denial, and do not choose only because of family or social pressure.",
      timingHint:
        "Marriage prospects often improve when emotional readiness and practical stability align.",
      confidence: "medium",
      visibleToUser: true,
    });
  }

  if (matchesAny(antardasha, ["venus", "shukra"])) {
    evidence.push({
      id: "marriage-venus-antardasha",
      topic: "marriage",
      factor: "Venus Antardasha",
      humanMeaning:
        "Relationship and marriage themes become more emotionally active and visible.",
      likelyExperience:
        "The person may feel stronger longing for companionship or more sensitivity around rejection and delay.",
      guidance:
        "Stay open to serious proposals while filtering for values, respect, and emotional steadiness.",
      caution: "Avoid confusing attraction with long-term compatibility.",
      confidence: "medium",
      visibleToUser: true,
    });
  }

  if (evidence.length === 0) {
    evidence.push({
      id: "marriage-general-readiness",
      topic: "marriage",
      factor: "Marriage concern",
      humanMeaning:
        "The marriage question needs to be read through readiness, family context, emotional clarity, and timing.",
      likelyExperience:
        "The person may be seeking reassurance that delay does not mean permanent denial.",
      guidance:
        "Focus on clarity, family communication, and choosing a stable match rather than rushing from fear.",
      caution: "Avoid absolute conclusions from one chart factor alone.",
      confidence: "low",
      visibleToUser: true,
    });
  }

  return evidence;
}
