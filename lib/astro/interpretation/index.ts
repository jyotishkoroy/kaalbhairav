/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

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
import { getChartProfileForTopic, JYOTISHKO_CHART_ANCHORS } from "@/lib/astro/reading/chart-anchors";

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
  const profile = getChartProfileForTopic(ctx.concern.topic) ?? getChartProfileForTopic(ctx.concern.subtopic ?? '')
  const anchorEvidence: AstroEvidence[] = profile
    ? [
        {
          id: `chart-anchor-${profile.id}`,
          topic: ctx.concern.topic,
          factor: `${JYOTISHKO_CHART_ANCHORS.identity.lagna} Lagna, ${JYOTISHKO_CHART_ANCHORS.identity.rasi} Rasi, ${JYOTISHKO_CHART_ANCHORS.identity.currentMahadasha}`,
          humanMeaning: profile.coreLogic,
          likelyExperience: `This question should be read through ${profile.domain.toLowerCase()} rather than generic astrology.`,
          guidance: `Keep the answer tied to ${profile.mustUseAnchors.slice(0, 2).join(' and ')}.`,
          caution: profile.risks[0],
          timingHint: ctx.concern.questionType === 'timing' ? 'Use broad timing tendency language, not a fixed event promise.' : undefined,
          confidence: 'high',
          visibleToUser: true,
        },
      ]
    : []

  const evidence = [
    ...anchorEvidence,
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
