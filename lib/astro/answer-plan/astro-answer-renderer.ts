/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { AstroAnswerPlan } from "./astro-answer-plan.ts";

export function renderAstroAnswerPlan(plan: AstroAnswerPlan): string {
  const { topic, natalFactors, timingFactors, practicalGuidance, boundaries, tone, basisLine } = plan;

  // Safety topics — short boundary answer only
  if (topic === "safety_death" || topic === "safety_medical" || topic === "safety_legal" || topic === "safety_financial" || topic === "security") {
    const msg = boundaries[0] ?? "I cannot answer this type of question.";
    if (msg.toLowerCase().startsWith("aadesh:")) return msg;
    return `aadesh: ${msg}`;
  }

  const parts: string[] = [];

  // Opening: basis line + primary natal factor
  if (basisLine) {
    const primary = natalFactors[0];
    if (primary) {
      parts.push(`Based on ${basisLine}, ${primary.interpretation}`);
    } else {
      parts.push(`Based on ${basisLine}:`);
    }
  } else if (natalFactors[0]) {
    parts.push(natalFactors[0].interpretation);
  }

  // Secondary natal factors
  for (let i = 1; i < natalFactors.length && i < 3; i++) {
    const f = natalFactors[i];
    if (f.interpretation) parts.push(f.interpretation);
  }

  // Timing context — only if adds value
  if (timingFactors[0]?.interpretation && basisLine) {
    const timing = timingFactors[0].interpretation;
    // Don't repeat the same info
    if (!parts.some(p => p.includes(timing.slice(0, 30)))) {
      parts.push(timing);
    }
  }

  // Practical guidance
  if (practicalGuidance.length > 0) {
    const guidance = practicalGuidance.slice(0, tone === "direct" ? 3 : 3).join(" ");
    if (guidance && !parts.some(p => p === guidance)) {
      parts.push(guidance);
    }
  }

  // Safety boundary at end if present and relevant
  if (boundaries.length > 0 && !["safety_death","safety_medical","safety_legal","safety_financial","security"].includes(topic)) {
    const b = boundaries[0];
    if (b && !b.startsWith("Safety boundary")) {
      parts.push(b);
    }
  }

  const body = parts.filter(Boolean).join("\n\n").trim();
  if (!body) return `aadesh: Based on ${basisLine}, I need more chart context to answer this well. Please make sure your birth chart is fully calculated.`;

  const result = body.toLowerCase().startsWith("aadesh:") ? body : `aadesh: ${body}`;
  return result;
}
