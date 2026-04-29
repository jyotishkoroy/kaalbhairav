import type { AstroEvidence } from "@/lib/astro/interpretation/evidence";
import type { AstroInterpretationContext } from "@/lib/astro/interpretation/context";
import { interpretCareer } from "@/lib/astro/interpretation/career";
import { interpretFamily } from "@/lib/astro/interpretation/family";
import { interpretHealth } from "@/lib/astro/interpretation/health";
import { interpretMarriage } from "@/lib/astro/interpretation/marriage";
import { interpretMoney } from "@/lib/astro/interpretation/money";
import { interpretRelationship } from "@/lib/astro/interpretation/relationship";
import { interpretRemedies } from "@/lib/astro/interpretation/remedies";
import { interpretSpirituality } from "@/lib/astro/interpretation/spirituality";
import { interpretTiming } from "@/lib/astro/interpretation/timing";

export type * from "@/lib/astro/interpretation/evidence";
export type * from "@/lib/astro/interpretation/context";
export * from "@/lib/astro/interpretation/career";
export * from "@/lib/astro/interpretation/family";
export * from "@/lib/astro/interpretation/health";
export * from "@/lib/astro/interpretation/marriage";
export * from "@/lib/astro/interpretation/money";
export * from "@/lib/astro/interpretation/relationship";
export * from "@/lib/astro/interpretation/remedies";
export * from "@/lib/astro/interpretation/spirituality";
export * from "@/lib/astro/interpretation/timing";

function dedupeEvidence(evidence: AstroEvidence[]): AstroEvidence[] {
  const seen = new Set<string>();

  return evidence.filter((item) => {
    if (seen.has(item.id)) return false;

    seen.add(item.id);
    return true;
  });
}

export function buildAstroEvidence(ctx: AstroInterpretationContext): AstroEvidence[] {
  const evidence = [
    ...interpretCareer(ctx),
    ...interpretMarriage(ctx),
    ...interpretRelationship(ctx),
    ...interpretMoney(ctx),
    ...interpretHealth(ctx),
    ...interpretFamily(ctx),
    ...interpretSpirituality(ctx),
    ...interpretRemedies(ctx),
    ...interpretTiming(ctx),
  ];

  return dedupeEvidence(evidence).filter((item) => {
    return (
      item.topic === ctx.concern.topic ||
      item.topic === "general" ||
      (item.topic === "health" && ctx.concern.topic === "death") ||
      (item.topic === "career" && ctx.concern.topic === "remedy")
    );
  });
}
