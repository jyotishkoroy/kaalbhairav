/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import type { AstroEvidence } from "@/lib/astro/interpretation/evidence";
import {
  getMoonSign,
  matchesAny,
  type AstroInterpretationContext,
} from "@/lib/astro/interpretation/context";

export function interpretFamily(ctx: AstroInterpretationContext): AstroEvidence[] {
  if (ctx.concern.topic !== "family") return [];

  const evidence: AstroEvidence[] = [];
  const moonSign = getMoonSign(ctx);

  if (matchesAny(moonSign, ["gemini", "mithun"])) {
    evidence.push({
      id: "family-gemini-moon-communication",
      topic: "family",
      factor: "Moon sign communication pattern",
      humanMeaning:
        "Family matters may be strongly affected by communication, misunderstanding, or changing expectations.",
      likelyExperience:
        "The person may replay conversations or feel pulled between logic and emotion.",
      guidance:
        "Use direct but calm communication, and separate facts from assumptions.",
      caution: "Avoid reacting to every comment as a final emotional truth.",
      confidence: "low",
      visibleToUser: true,
    });
  }

  if (evidence.length === 0) {
    evidence.push({
      id: "family-general-harmony",
      topic: "family",
      factor: "Family concern",
      humanMeaning: "Family questions need patience, boundaries, and emotional steadiness.",
      likelyExperience:
        "The person may feel responsible for peace at home or affected by family pressure.",
      guidance:
        "Focus on clear communication, realistic expectations, and respectful boundaries.",
      caution: "Avoid taking every family tension as a permanent situation.",
      confidence: "low",
      visibleToUser: true,
    });
  }

  return evidence;
}
