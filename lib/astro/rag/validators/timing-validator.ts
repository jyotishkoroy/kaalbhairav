// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerValidationInput, ValidationIssue } from "../validation-types";
import { buildIssue, collectAllowedTimingDates, textIncludesLoose } from "./validator-utils";

const DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/;
const RELATIVE_RE = /\b(next month|this year|within \d+\s+months?|by [a-z]+|second half|first half|mid[- ]year|year end)\b/i;

function hasGroundedLimitation(answer: string): boolean {
  return /(timing unavailable|timing omitted|cannot provide timing|no grounded timing|timing is not available|no timing source)/i.test(answer);
}

function hasExactTiming(answer: string): boolean {
  return DATE_RE.test(answer) || RELATIVE_RE.test(answer);
}

function dateMentioned(answer: string, date: string): boolean {
  return textIncludesLoose(answer, date);
}

export function validateAnswerTiming(input: AnswerValidationInput): ValidationIssue[] {
  const answer = input.answer ?? "";
  const issues: ValidationIssue[] = [];
  const windows = input.timing.windows ?? [];
  const allowedDates = collectAllowedTimingDates(input.timing);
  const mentionsTiming = hasExactTiming(answer) || /timing|window|dasha|varshaphal/i.test(answer);

  if (!input.contract.timingAllowed) {
    if (hasExactTiming(answer) && !hasGroundedLimitation(answer)) {
      issues.push(buildIssue("timing_not_allowed", "error", "Timing is not allowed for this answer.", answer.slice(0, 120)));
    }
    if (/next month second half/i.test(answer) && !hasGroundedLimitation(answer)) {
      issues.push(buildIssue("invented_timing", "error", "Relative timing window is not grounded.", "next month second half"));
    }
    return issues;
  }

  if (!input.timing.available) {
    if (hasExactTiming(answer) && !hasGroundedLimitation(answer)) {
      issues.push(buildIssue("timing_not_allowed", "error", "Timing is unavailable and must not be invented.", answer.slice(0, 120)));
    }
    return issues;
  }

  if (hasExactTiming(answer) && !hasGroundedLimitation(answer)) {
    const grounded = allowedDates.some((date) => dateMentioned(answer, date)) || windows.some((window) => textIncludesLoose(answer, window.label) || textIncludesLoose(answer, window.interpretation));
    if (!grounded) {
      issues.push(buildIssue("invented_timing", "error", "Timing claim is outside grounded timing windows.", answer.slice(0, 120)));
    }
  }

  if (/next month second half/i.test(answer) && !windows.some((window) => /next month second half/i.test(window.label) || /next month second half/i.test(window.interpretation))) {
    issues.push(buildIssue("invented_timing", "error", "Specific relative window is not explicitly grounded.", "next month second half"));
  }

  if (/varshaphal/i.test(answer) && !windows.some((window) => window.source === "varshaphal")) {
    issues.push(buildIssue("invented_timing", "error", "Varshaphal year window is not grounded.", "varshaphal"));
  }

  if (mentionsTiming && !hasGroundedLimitation(answer) && !allowedDates.length && windows.length === 0) {
    issues.push(buildIssue("invented_timing", "error", "Timing appears without a grounded source.", answer.slice(0, 120)));
  }

  return issues;
}
