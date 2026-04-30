// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AnswerValidationInput, ValidationIssue } from "../validation-types";
import { buildIssue, hasNegatedUnsafePhrase, textIncludesLoose } from "./validator-utils";

function hasRemedyLanguage(answer: string): boolean {
  return /(remedy|puja|mantra|breath|breathing|routine|sleep hygiene|ritual|gemstone|blue sapphire|wear|stone|treatment|cure|must do|should do|pay|rupees|medication|medicine)/i.test(answer);
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

  if (/must do puja|mandatory puja|pay\s*\d+|rupees|fear|expensive puja/i.test(answer) && !/optional|if you choose|if helpful|not required/i.test(answer)) {
    issues.push(buildIssue("unsafe_remedy", "error", "Expensive or coercive puja pressure is not allowed.", answer.slice(0, 120)));
  }

  if (/mantra|breath|breathing|routine|sleep hygiene/i.test(answer) && /optional|if you choose|if helpful|can try/i.test(answer)) {
    return issues;
  }

  if (textIncludesLoose(answer, "no guarantee")) return issues;
  return issues;
}
