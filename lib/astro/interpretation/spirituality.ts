import type { AstroEvidence } from "@/lib/astro/interpretation/evidence";
import {
  getMahadasha,
  matchesAny,
  type AstroInterpretationContext,
} from "@/lib/astro/interpretation/context";

export function interpretSpirituality(
  ctx: AstroInterpretationContext,
): AstroEvidence[] {
  if (ctx.concern.topic !== "spirituality") return [];

  const evidence: AstroEvidence[] = [];
  const mahadasha = getMahadasha(ctx);

  if (matchesAny(mahadasha, ["ketu"])) {
    evidence.push({
      id: "spirituality-ketu-detachment",
      topic: "spirituality",
      factor: "Ketu influence",
      humanMeaning:
        "Spiritual growth may come through detachment, simplification, and inner questioning.",
      likelyExperience:
        "The person may feel less satisfied by external success and more drawn toward meaning.",
      guidance:
        "Use meditation, service, study, and silence without withdrawing from necessary duties.",
      caution: "Avoid using spirituality to escape practical responsibilities.",
      confidence: "medium",
      visibleToUser: true,
    });
  }

  if (matchesAny(mahadasha, ["jupiter", "guru"])) {
    evidence.push({
      id: "spirituality-jupiter-wisdom",
      topic: "spirituality",
      factor: "Jupiter influence",
      humanMeaning:
        "Wisdom, teachers, scriptures, ethics, and faith can become important sources of direction.",
      likelyExperience:
        "The person may seek guidance, meaning, and a broader understanding of life.",
      guidance:
        "Learn from trustworthy teachers and keep spiritual practice grounded in humility.",
      caution: "Avoid blind belief or confusing optimism with truth.",
      confidence: "medium",
      visibleToUser: true,
    });
  }

  if (evidence.length === 0) {
    evidence.push({
      id: "spirituality-general-practice",
      topic: "spirituality",
      factor: "Spiritual concern",
      humanMeaning:
        "Spiritual clarity usually grows through steady practice rather than dramatic signs.",
      likelyExperience:
        "The person may be seeking meaning, protection, direction, or inner peace.",
      guidance: "Build a small daily practice that is consistent, simple, and grounded.",
      caution: "Avoid fear-based spirituality or dependency on rituals alone.",
      confidence: "low",
      visibleToUser: true,
    });
  }

  return evidence;
}
