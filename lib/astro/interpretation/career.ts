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

export function interpretCareer(ctx: AstroInterpretationContext): AstroEvidence[] {
  if (ctx.concern.topic !== "career" && ctx.concern.topic !== "remedy") {
    return [];
  }

  const evidence: AstroEvidence[] = [];
  const mahadasha = getMahadasha(ctx);
  const antardasha = getAntardasha(ctx);

  if (matchesAny(mahadasha, ["saturn", "shani"])) {
    evidence.push({
      id: "career-saturn-mahadasha",
      topic: "career",
      factor: "Saturn Mahadasha",
      humanMeaning:
        "Career growth may feel slower, but this phase supports long-term stability through discipline.",
      likelyExperience:
        "The person may feel under-recognized or delayed despite consistent effort.",
      guidance:
        "Focus on skill-building, process, discipline, and stable choices rather than sudden jumps.",
      caution: "Avoid changing direction only because of frustration or comparison.",
      timingHint:
        "Improvement is more likely through gradual consolidation than one sudden breakthrough.",
      confidence: "medium",
      visibleToUser: true,
    });
  }

  if (matchesAny(mahadasha, ["jupiter", "guru"])) {
    evidence.push({
      id: "career-jupiter-mahadasha",
      topic: "career",
      factor: "Jupiter Mahadasha",
      humanMeaning:
        "Career growth is supported through learning, guidance, ethics, teaching, advisory work, or expansion.",
      likelyExperience:
        "The person may feel pulled toward bigger responsibility, study, mentorship, or a more meaningful professional path.",
      guidance:
        "Use this phase to build authority, improve knowledge, and connect with mentors or senior people.",
      caution: "Avoid overconfidence or assuming growth will happen without consistent effort.",
      timingHint: "Opportunities may improve when preparation and wise guidance come together.",
      confidence: "medium",
      visibleToUser: true,
    });
  }

  if (matchesAny(antardasha, ["mercury", "budh"])) {
    evidence.push({
      id: "career-mercury-antardasha",
      topic: "career",
      factor: "Mercury Antardasha",
      humanMeaning:
        "Communication, analysis, business, writing, data, negotiation, or technical work becomes more important.",
      likelyExperience:
        "The person may need to make decisions through information, networking, interviews, or skill upgrades.",
      guidance:
        "Improve communication, documentation, portfolio, and practical problem-solving.",
      caution: "Avoid scattered thinking and too many simultaneous plans.",
      confidence: "medium",
      visibleToUser: true,
    });
  }

  if (evidence.length === 0) {
    evidence.push({
      id: "career-general-steady-effort",
      topic: "career",
      factor: "Career concern",
      humanMeaning:
        "The career question needs to be read through effort, timing, stability, and practical decision-making.",
      likelyExperience:
        "The person may be seeking clarity about progress, recognition, or the next professional step.",
      guidance:
        "Treat this as a practical planning question: improve skills, reduce impulsive decisions, and compare options calmly.",
      caution: "Avoid making a major career choice only from pressure or fear.",
      confidence: "low",
      visibleToUser: true,
    });
  }

  return evidence;
}
