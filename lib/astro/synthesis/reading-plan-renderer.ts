/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { isAstroUserFacingPlanEnabled } from "../config/feature-flags";
import type { InternalReadingPlan, ReadingPlan, UserFacingAnswerPlan, UserFacingAnswerSection, UserFacingAnswerSectionKind } from "./reading-plan-types";

const FORBIDDEN_LABEL_PATTERNS = [
  /This question should be read through/i,
  /The person may be seeking/i,
  /The answer should stay tied/i,
  /Keep the answer tied/i,
  /Chart basis:/i,
  /Key anchors:/i,
  /Safety note:/i,
  /Accuracy:/i,
  /Suggested follow-up:/i,
  /Previous concern:/i,
  /\bvalidator\b/i,
  /\bpolicy\b/i,
  /\bmetadata\b/i,
  /\binternal\b/i,
  /\bpride reactions\b/i,
];

function clean(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^(Chart basis:|Key anchors:|Safety note:|Accuracy:|Suggested follow-up:|Previous concern:)\s*/i, "")
    .trim();
}

function containsForbiddenLabel(text: string): boolean {
  return FORBIDDEN_LABEL_PATTERNS.some((pattern) => pattern.test(text));
}

function stripForbidden(text: string): string {
  let output = text;
  for (const pattern of FORBIDDEN_LABEL_PATTERNS) {
    output = output.replace(pattern, "");
  }
  return clean(output);
}

function pushSection(sections: UserFacingAnswerSection[], kind: UserFacingAnswerSectionKind, text: string): void {
  const cleaned = stripForbidden(text);
  if (!cleaned) return;
  const previous = sections[sections.length - 1];
  if (previous?.text === cleaned) return;
  sections.push({ kind, text: cleaned });
}

type ReadingPlanLike = Partial<ReadingPlan> & {
  questionFrame?: { coreQuestion?: string };
  intent?: { primaryIntent?: string };
  internalPlan?: InternalReadingPlan;
};

export function toUserFacingAnswerPlan(internalPlan: ReadingPlanLike): UserFacingAnswerPlan {
  const source = internalPlan.internalPlan ?? {
    internalGuidance: [],
    validatorHints: [],
    safetyPolicy: [],
    evidencePolicy: [],
    memoryPolicy: [],
  };
  const answerSections: UserFacingAnswerSection[] = [];
  const acknowledgement = stripForbidden(internalPlan.questionFrame?.coreQuestion ?? internalPlan.intent?.primaryIntent ?? "");
  const forbiddenRenderLabels = FORBIDDEN_LABEL_PATTERNS.map((pattern) => String(pattern));
  if (acknowledgement) {
    pushSection(answerSections, "direct_answer", acknowledgement);
  }
  for (const line of source.internalGuidance ?? []) pushSection(answerSections, "interpretation", line);
  for (const line of source.validatorHints ?? []) pushSection(answerSections, "boundary", line);
  for (const line of source.evidencePolicy ?? []) pushSection(answerSections, "chart_anchor", line);
  for (const line of source.memoryPolicy ?? []) pushSection(answerSections, "practical_guidance", line);
  for (const decision of source.safetyPolicy ?? []) {
    pushSection(answerSections, "boundary", `${decision.action}: ${decision.reason}`);
  }
  if (!answerSections.length) {
    pushSection(answerSections, "direct_answer", "I’m keeping this grounded and focused on the chart.");
  }
  return { acknowledgement: acknowledgement || undefined, answerSections, forbiddenRenderLabels };
}

export function renderUserFacingAnswerPlan(plan: UserFacingAnswerPlan): string {
  const sections = Array.isArray(plan.answerSections) ? plan.answerSections : [];
  const rendered: string[] = [];
  const seen = new Set<string>();
  for (const section of sections) {
    if (!section || containsForbiddenLabel(section.text)) continue;
    const cleaned = stripForbidden(section.text);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rendered.push(cleaned);
  }
  const acknowledgement = stripForbidden(plan.acknowledgement ?? "");
  if (acknowledgement && !seen.has(acknowledgement.toLowerCase())) {
    rendered.unshift(acknowledgement);
  }
  if (!rendered.length) return "I’m keeping this grounded and focused on the chart.";
  return rendered.join(" ");
}

export function renderReadingPlanFallback(plan: ReadingPlan): string {
  if (isAstroUserFacingPlanEnabled()) {
    return renderUserFacingAnswerPlan(toUserFacingAnswerPlan(plan));
  }
  const normalizeSentence = (value: string) => value.replace(/\s+/g, " ").trim();
  const pushUnique = (target: string[], line: string) => {
    const cleaned = normalizeSentence(line);
    if (!cleaned) return;
    if (target.includes(cleaned)) return;
    target.push(cleaned);
  };
  const lines: string[] = [];
  pushUnique(lines, plan.acknowledgement.openingLine || "I’m listening carefully.");
  if (plan.mode === "follow_up" && plan.followUp?.question) {
    pushUnique(lines, plan.followUp.question);
    return lines.join(" ");
  }
  if (plan.mode === "exact_fact") {
    const exactLines = [plan.acknowledgement.openingLine || "I’m listening carefully."];
    if (plan.chartTruth.evidence.length) {
      pushUnique(exactLines, plan.chartTruth.evidence.map((item) => `${item.label}: ${item.explanation}`).join("; "));
    }
    if (plan.chartTruth.limitations.length) pushUnique(exactLines, plan.chartTruth.limitations[0] ?? "");
    pushUnique(exactLines, plan.reassurance.closingLine);
    return exactLines.join(" ");
  }
  const evidenceSummary = plan.chartTruth.evidence.map((item) => `${item.label}: ${item.explanation}`).filter(Boolean);
  if (evidenceSummary.length) pushUnique(lines, `What stands out is ${evidenceSummary.join("; ")}.`);
  if (plan.livedExperience.length) pushUnique(lines, plan.livedExperience.slice(0, 2).join(" "));
  if (plan.chartTruth.limitations.length) pushUnique(lines, `Limitations: ${plan.chartTruth.limitations.join(" ")}`);
  if (plan.practicalGuidance.length) pushUnique(lines, `Practical guidance: ${plan.practicalGuidance.join(" ")}`);
  if (plan.remedies.include && (plan.remedies.spiritual.length || plan.remedies.behavioral.length || plan.remedies.practical.length || plan.remedies.inner.length)) {
    const remedyBits = [...plan.remedies.spiritual, ...plan.remedies.behavioral, ...plan.remedies.practical, ...plan.remedies.inner];
    pushUnique(lines, `Optional remedy support: ${remedyBits.join(" ")}`);
  }
  if (plan.safetyBoundaries.length) pushUnique(lines, `Safety boundary: ${plan.safetyBoundaries.join(" ")}`);
  if (plan.followUp?.question) pushUnique(lines, `Follow-up: ${plan.followUp.question}`);
  pushUnique(lines, plan.reassurance.closingLine);
  return lines.join(" ");
}
