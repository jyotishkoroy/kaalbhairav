import type { AstroEvidence } from "@/lib/astro/interpretation/evidence";
import {
  getMahadasha,
  matchesAny,
  type AstroInterpretationContext,
} from "@/lib/astro/interpretation/context";

export function interpretMoney(ctx: AstroInterpretationContext): AstroEvidence[] {
  if (ctx.concern.topic !== "money") return [];

  const evidence: AstroEvidence[] = [];
  const mahadasha = getMahadasha(ctx);

  if (matchesAny(mahadasha, ["saturn", "shani"])) {
    evidence.push({
      id: "money-saturn-discipline",
      topic: "money",
      factor: "Saturn financial discipline",
      humanMeaning:
        "Money improves through structure, delayed gratification, debt control, and consistent effort.",
      likelyExperience:
        "The person may feel pressure from responsibilities, slow inflow, or heavy expenses.",
      guidance:
        "Create a strict budget, avoid unnecessary risk, and build stability step by step.",
      caution: "Avoid shortcuts, speculative decisions, and borrowing from panic.",
      timingHint:
        "Financial relief may come gradually as habits and commitments become more disciplined.",
      confidence: "medium",
      visibleToUser: true,
    });
  }

  if (matchesAny(mahadasha, ["jupiter", "guru"])) {
    evidence.push({
      id: "money-jupiter-growth",
      topic: "money",
      factor: "Jupiter financial growth",
      humanMeaning:
        "Financial growth may come through knowledge, advisory support, teaching, planning, or ethical expansion.",
      likelyExperience:
        "The person may see opportunities, but also needs wisdom in how money is used.",
      guidance:
        "Use guidance, education, and long-term planning rather than impulsive expansion.",
      caution: "Avoid generosity or optimism that exceeds actual cash flow.",
      confidence: "medium",
      visibleToUser: true,
    });
  }

  if (evidence.length === 0) {
    evidence.push({
      id: "money-general-stability",
      topic: "money",
      factor: "Financial concern",
      humanMeaning:
        "This money question needs stability, planning, and careful timing more than fear.",
      likelyExperience:
        "The person may be worried about pressure, expenses, savings, or inconsistent income.",
      guidance:
        "Start with cash-flow clarity, reduce avoidable expenses, and avoid risky decisions.",
      caution: "Avoid assuming one lucky event will solve a pattern of financial pressure.",
      confidence: "low",
      visibleToUser: true,
    });
  }

  return evidence;
}
