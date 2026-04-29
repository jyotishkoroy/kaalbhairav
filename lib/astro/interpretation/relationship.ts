import type { AstroEvidence } from "@/lib/astro/interpretation/evidence";
import {
  getAntardasha,
  getMoonSign,
  matchesAny,
  type AstroInterpretationContext,
} from "@/lib/astro/interpretation/context";

export function interpretRelationship(
  ctx: AstroInterpretationContext,
): AstroEvidence[] {
  if (ctx.concern.topic !== "relationship") return [];

  const evidence: AstroEvidence[] = [];
  const antardasha = getAntardasha(ctx);
  const moonSign = getMoonSign(ctx);

  if (matchesAny(antardasha, ["venus", "shukra"])) {
    evidence.push({
      id: "relationship-venus-sensitivity",
      topic: "relationship",
      factor: "Venus period",
      humanMeaning:
        "Relationship emotions, attachment, attraction, and the need for affection become more prominent.",
      likelyExperience:
        "The person may feel more affected by distance, mixed signals, or uncertainty in love.",
      guidance:
        "Look for consistency, respect, and emotional safety rather than only intensity.",
      caution: "Avoid making final decisions in a moment of emotional insecurity.",
      confidence: "medium",
      visibleToUser: true,
    });
  }

  if (matchesAny(moonSign, ["gemini", "mithun"])) {
    evidence.push({
      id: "relationship-gemini-moon-overthinking",
      topic: "relationship",
      factor: "Moon sign communication pattern",
      humanMeaning:
        "The emotional pattern may process love through thoughts, questions, and communication.",
      likelyExperience:
        "The person may overthink messages, intentions, silence, or changing behavior.",
      guidance:
        "Ask direct questions and observe consistent action instead of filling gaps with assumptions.",
      caution: "Avoid letting mental restlessness become the only basis for a relationship decision.",
      confidence: "low",
      visibleToUser: true,
    });
  }

  if (evidence.length === 0) {
    evidence.push({
      id: "relationship-general-clarity",
      topic: "relationship",
      factor: "Relationship concern",
      humanMeaning: "This relationship question needs emotional clarity, not only prediction.",
      likelyExperience:
        "The person may be trying to decide whether the connection is stable or only emotionally consuming.",
      guidance:
        "Notice whether the bond gives peace, respect, consistency, and shared direction.",
      caution: "Avoid deciding only from fear of losing the person.",
      confidence: "low",
      visibleToUser: true,
    });
  }

  return evidence;
}
