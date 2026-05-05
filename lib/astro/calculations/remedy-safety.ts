/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export type RemedySafetySeverity = 'allow' | 'warn' | 'block';

export type RemedySafetyIssue = {
  code:
    | 'gemstone_certainty'
    | 'expensive_puja_pressure'
    | 'medical_claim'
    | 'legal_financial_claim'
    | 'fear_based_guarantee'
    | 'harmful_instruction'
    | 'dependency_or_fatalism';
  severity: RemedySafetySeverity;
  message: string;
};

export type RemedySafetyResult = {
  status: 'safe' | 'warning' | 'blocked';
  issues: RemedySafetyIssue[];
  sanitizedText: string | null;
};

const BLOCKED_PATTERNS: Array<{
  code: RemedySafetyIssue['code'];
  pattern: RegExp;
  message: string;
}> = [
  {
    code: 'gemstone_certainty',
    pattern: /\b(must|guaranteed|definitely|certainly)\b.{0,80}\b(gemstone|ruby|blue sapphire|yellow sapphire|emerald|diamond|coral|pearl|hessonite|cat'?s eye)\b/i,
    message: 'Gemstone certainty claims are not allowed.',
  },
  {
    code: 'expensive_puja_pressure',
    pattern: /\b(must|urgent|only way|otherwise|guaranteed)\b.{0,120}\b(puja|yagya|homa|ritual|donation|dakshina|payment)\b/i,
    message: 'Financially coercive ritual pressure is not allowed.',
  },
  {
    code: 'medical_claim',
    pattern: /\b(cure|treat|diagnose|stop medication|replace doctor|medical guarantee)\b/i,
    message: 'Medical claims or advice are not allowed.',
  },
  {
    code: 'legal_financial_claim',
    pattern: /\b(guaranteed profit|guaranteed job|guaranteed marriage|court victory|legal guarantee|investment certainty)\b/i,
    message: 'Legal, financial, or life-outcome guarantees are not allowed.',
  },
  {
    code: 'fear_based_guarantee',
    pattern: /\b(death|disaster|ruin|curse|doomed|fatal|will definitely happen|inescapable)\b/i,
    message: 'Fear-based deterministic predictions are not allowed.',
  },
  {
    code: 'harmful_instruction',
    pattern: /\b(self-harm|harm yourself|harm others|poison|weapon|starve|fast without water for days)\b/i,
    message: 'Harmful instructions are not allowed.',
  },
  {
    code: 'dependency_or_fatalism',
    pattern: /\b(only astrology can save you|do nothing except|you have no free will|nothing can change this)\b/i,
    message: 'Dependency and fatalism claims are not allowed.',
  },
];

export function validateRemedyText(text: string): RemedySafetyResult {
  if (typeof text !== 'string') {
    return {
      status: 'blocked',
      issues: [
        {
          code: 'harmful_instruction',
          severity: 'block',
          message: 'Remedy text must be a string.',
        },
      ],
      sanitizedText: null,
    };
  }

  const issues: RemedySafetyIssue[] = [];

  for (const rule of BLOCKED_PATTERNS) {
    if (rule.pattern.test(text)) {
      issues.push({
        code: rule.code,
        severity: 'block',
        message: rule.message,
      });
    }
  }

  if (issues.some((issue) => issue.severity === 'block')) {
    return {
      status: 'blocked',
      issues,
      sanitizedText: null,
    };
  }

  return {
    status: 'safe',
    issues,
    sanitizedText: text.trim(),
  };
}

export function buildSafeGenericRemedies(): string[] {
  return [
    'Use astrology as a reflective tool, not as a substitute for medical, legal, financial, or mental-health advice.',
    'Prefer low-cost reflective practices such as journaling, mindful breathing, disciplined routine, and respectful prayer if aligned with your beliefs.',
    'Do not buy gemstones, rituals, or services based on certainty claims or fear pressure.',
  ];
}
