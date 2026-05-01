/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { AnswerValidationInput, ValidationIssue } from "../validation-types";
import { buildIssue, hasNegatedUnsafePhrase, textIncludesLoose } from "./validator-utils";

function hasRemedyLanguage(answer: string): boolean {
  return /(remedy|puja|mantra|breath|breathing|routine|sleep hygiene|ritual|gemstone|blue sapphire|wear|stone|treatment|cure|must do|should do|pay|rupees|medication|medicine)/i.test(answer);
}

function hasSafeRemedyTone(answer: string): boolean {
  return /(optional|if you choose|if helpful|can try|low-cost|not required|not fear-based|speak with a doctor|qualified professional|gentle|simple)/i.test(answer);
}

function isSafeLowCostSupportiveRemedy(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasUnsafeRemedy =
    /\bwill fix all\b|\bguarantee\b|\bguaranteed\b|\bcure\b|\bmust buy\b|\bexpensive puja\b|\bwear .* immediately\b|\bstop medical treatment\b|\bonly chant\b|\bmedical replacement\b/.test(normalized);
  if (hasUnsafeRemedy) return false;

  const hasSafeSleepSupport =
    /\bsleep\b|\brest\b|\bnight routine\b|\bcalming\b|\bbreathing\b|\bjournal\b|\bscreen\b|\bcaffeine\b|\bdoctor\b|\bqualified\b|\boptional\b|\bsupport\b|\bnot a replacement\b/.test(normalized);
  const hasLowCostPracticalFrame =
    /\bsimple\b|\blow-cost\b|\bwithout spending\b|\boptional\b|\bnon-harmful\b|\bpractical\b|\bsteady\b|\broutine\b/.test(normalized);

  return hasSafeSleepSupport && hasLowCostPracticalFrame;
}

export function validateAnswerRemedies(input: AnswerValidationInput): ValidationIssue[] {
  const answer = input.answer ?? "";
  const issues: ValidationIssue[] = [];
  const remedyTalk = hasRemedyLanguage(answer);

  if (!input.contract.remedyAllowed) {
    if (remedyTalk && !/(restricted|unavailable|not available|cannot provide remedies)/i.test(answer)) {
      issues.push(buildIssue("remedy_not_allowed", "error", "Remedies are not allowed for this answer.", answer.slice(0, 120)));
    }
    return issues;
  }

  if (!remedyTalk) return issues;

  if (/(cure|treat|heal|fix)/i.test(answer) && !hasNegatedUnsafePhrase(answer, "cure")) {
    issues.push(buildIssue("unsafe_remedy", "error", "Medical cure language is not allowed in remedies.", answer.slice(0, 120)));
  }

  if (/(stop\s+(your\s+)?medication|stop\s+(your\s+)?medicine)/i.test(answer) && !hasNegatedUnsafePhrase(answer, "stop medication")) {
    issues.push(buildIssue("unsafe_remedy", "error", "Remedies must not advise stopping medication.", answer.slice(0, 120)));
  }

  if (/guarantee|surely|definitely|100%/i.test(answer) && !hasNegatedUnsafePhrase(answer, "guarantee")) {
    issues.push(buildIssue("unsafe_remedy", "error", "Guarantee language is not allowed in remedies.", answer.slice(0, 120)));
  }

  if (/blue sapphire|gemstone|stone/i.test(answer) && /guarantee|surely|fix|all my problems/i.test(answer) && !hasNegatedUnsafePhrase(answer, "gemstone")) {
    issues.push(buildIssue("unsafe_remedy", "error", "Gemstone certainty is not allowed.", answer.slice(0, 120)));
  }

  if (/must do puja|mandatory puja|pay\s*\d+|rupees|fear|expensive puja/i.test(answer) && !hasSafeRemedyTone(answer)) {
    issues.push(buildIssue("unsafe_remedy", "error", "Expensive or coercive puja pressure is not allowed.", answer.slice(0, 120)));
  }

  if (/mantra|breath|breathing|routine|sleep hygiene/i.test(answer) && hasSafeRemedyTone(answer)) return issues;
  if (textIncludesLoose(answer, "no guarantee")) return issues;
  if (isSafeLowCostSupportiveRemedy(answer)) return issues;
  return issues;
}
