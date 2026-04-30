/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ReadingPlan } from "./reading-plan-types";

export function renderReadingPlanFallback(plan: ReadingPlan): string {
  const lines: string[] = [];
  lines.push(plan.acknowledgement.openingLine || "I’m listening carefully.");
  if (plan.mode === "follow_up" && plan.followUp?.question) {
    lines.push(plan.followUp.question);
    return lines.join(" ");
  }
  if (plan.mode === "exact_fact") {
    const exactLines = [plan.acknowledgement.openingLine || "I’m listening carefully."];
    if (plan.chartTruth.evidence.length) {
      exactLines.push(plan.chartTruth.evidence.map((item) => `${item.label}: ${item.explanation}`).join("; "));
    }
    if (plan.chartTruth.limitations.length) exactLines.push(plan.chartTruth.limitations[0] ?? "");
    exactLines.push(plan.reassurance.closingLine);
    return exactLines.join(" ");
  }
  const evidenceSummary = plan.chartTruth.evidence.map((item) => `${item.label}: ${item.explanation}`).filter(Boolean);
  if (evidenceSummary.length) lines.push(`What stands out is ${evidenceSummary.join("; ")}.`);
  if (plan.livedExperience.length) lines.push(plan.livedExperience.slice(0, 2).join(" "));
  if (plan.chartTruth.limitations.length) lines.push(`Limitations: ${plan.chartTruth.limitations.join(" ")}`);
  if (plan.practicalGuidance.length) lines.push(`Practical guidance: ${plan.practicalGuidance.join(" ")}`);
  if (plan.remedies.include && (plan.remedies.spiritual.length || plan.remedies.behavioral.length || plan.remedies.practical.length || plan.remedies.inner.length)) {
    const remedyBits = [...plan.remedies.spiritual, ...plan.remedies.behavioral, ...plan.remedies.practical, ...plan.remedies.inner];
    lines.push(`Optional remedy support: ${remedyBits.join(" ")}`);
  }
  if (plan.safetyBoundaries.length) lines.push(`Safety boundary: ${plan.safetyBoundaries.join(" ")}`);
  if (plan.followUp?.question) lines.push(`Follow-up: ${plan.followUp.question}`);
  lines.push(plan.reassurance.closingLine);
  return lines.join(" ");
}
