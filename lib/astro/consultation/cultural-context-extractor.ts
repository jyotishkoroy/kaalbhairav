/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ConsultationReligiousComfort } from "./consultation-types";
import type { ConsultationState } from "./consultation-state";

export type CulturalContextInput = {
  readonly question: string;
  readonly previousEphemeralContext?: ConsultationState;
};

export type DecisionAutonomy = "low" | "medium" | "high" | "unknown";

export type CulturalFamilyContextResult = {
  readonly familyInvolved: boolean;
  readonly parentalPressure: boolean;
  readonly arrangedMarriageContext: boolean;
  readonly familyReputationPressure: boolean;
  readonly financialDependents: boolean;
  readonly religiousComfort: ConsultationReligiousComfort;
  readonly decisionAutonomy: DecisionAutonomy;
};

const FAMILY_INVOLVED_PATTERNS = [
  /\bparent\b/,
  /\bparents\b/,
  /\bmother\b/,
  /\bfather\b/,
  /\bfamily\b/,
  /\bsibling\b/,
  /\bbrother\b/,
  /\bsister\b/,
  /\brelatives?\b/,
  /\bin-laws?\b/,
  /\bhusband'?s family\b/,
  /\bwife'?s family\b/,
  /\bhome\b/,
  /\bhousehold\b/,
  /\bfamily responsibility\b/,
  /\bfamily duty\b/,
];

const PARENTAL_PRESSURE_PATTERNS = [
  /\bparents? are pressuring\b/,
  /\bparents? pressuring\b/,
  /\bfamily pressuring\b/,
  /\bforcing me\b/,
  /\bforced me\b/,
  /\bforcing me to say yes\b/,
  /\binsisting\b/,
  /\bpressure from parents?\b/,
  /\bpressure from family\b/,
  /\bthey are not listening\b/,
  /\bthey want me to\b/,
  /\bmy parents want me to\b/,
  /\bmy family wants me to\b/,
  /\bfamily is pushing\b/,
  /\bparents? are pushing\b/,
  /\bemotional blackmail\b/,
  /\bthreatening\b/,
  /\bnot allowing me\b/,
  /\bhave no choice\b/,
  /\bcannot decide\b/,
  /\bparents? decide\b/,
  /\bfamily decide\b/,
  /\bmust say yes\b/,
  /\bhave to say yes\b/,
  /\bno freedom\b/,
  /\bpressure is too much\b/,
  /\bliving with parents and cannot say no\b/,
];

const ARRANGED_MARRIAGE_PATTERNS = [
  /\barranged marriage\b/,
  /\bproposal\b/,
  /\bmatch\b/,
  /\brishta\b/,
  /\balliance\b/,
  /\bbiodata\b/,
  /\bmatrimonial\b/,
  /\bfamily introduced\b/,
  /\bfamily selected\b/,
  /\bsay yes to this proposal\b/,
  /\bmeeting families\b/,
  /\bkundli matching\b/,
  /\bhoroscope matching\b/,
  /\bmarriage talks\b/,
];

const FAMILY_REPUTATION_PATTERNS = [
  /\bfamily reputation\b/,
  /\breputation\b/,
  /\bsociety\b/,
  /\brelatives will say\b/,
  /\bwhat people will say\b/,
  /\blog kya kahenge\b/,
  /\bshame\b/,
  /\bfamily name\b/,
  /\bcommunity\b/,
  /\bcaste\b/,
  /\bstatus\b/,
  /\bhonor\b/,
  /\bizzat\b/,
  /\beveryone will judge\b/,
  /\bsocial pressure\b/,
];

const FINANCIAL_DEPENDENT_PATTERNS = [
  /\bparents? depend on me\b/,
  /\bfamily depends on me\b/,
  /\bfinancially support my family\b/,
  /\bsupport my parents\b/,
  /\bdependent parents\b/,
  /\bfamily expenses\b/,
  /\bhousehold expenses\b/,
  /\bonly earning member\b/,
  /\bsole earner\b/,
  /\bpaying for family\b/,
  /\bresponsible for family financially\b/,
  /\bsiblings? depend on me\b/,
];

const RELIGIOUS_HIGH_PATTERNS = [
  /\bi do puja\b/,
  /\bi pray\b/,
  /\bi believe in remedies\b/,
  /\bi believe in mantra\b/,
  /\bi can do mantra\b/,
  /\bi can visit temple\b/,
  /\btemple\b/,
  /\bdeity\b/,
  /\bdevotional\b/,
  /\bspiritual practice\b/,
  /\bsadhana\b/,
  /\bhanuman chalisa\b/,
  /\bshiva\b/,
  /\bdurga\b/,
  /\blakshmi\b/,
  /\bsaturn mantra\b/,
  /\bvishnu\b/,
  /\bkrishna\b/,
];

const RELIGIOUS_MEDIUM_PATTERNS = [
  /\bopen to remedies\b/,
  /\bsimple remedy\b/,
  /\blight spiritual\b/,
  /\bif needed i can pray\b/,
  /\bi can try prayer\b/,
  /\bokay with mantra\b/,
  /\bcomfortable with spiritual guidance\b/,
];

const RELIGIOUS_LOW_PATTERNS = [
  /\bnot religious\b/,
  /\bnot spiritual\b/,
  /\bdo not believe in remedies\b/,
  /\bdon't believe in remedies\b/,
  /\bno puja\b/,
  /\bno ritual\b/,
  /\bnot comfortable with rituals\b/,
  /\bavoid rituals\b/,
  /\bpractical only\b/,
  /\blogic only\b/,
  /\bskeptical of remedies\b/,
];

const AUTONOMY_LOW_PATTERNS = [
  /\bforcing me\b/,
  /\bforced me\b/,
  /\bnot allowing me\b/,
  /\bi have no choice\b/,
  /\bcannot decide\b/,
  /\bthey decide\b/,
  /\bparents? decide\b/,
  /\bfamily decide\b/,
  /\bmust say yes\b/,
  /\bhave to say yes\b/,
  /\bno freedom\b/,
  /\bpressure is too much\b/,
  /\bdependent on parents\b/,
  /\bliving with parents and cannot say no\b/,
];

const AUTONOMY_MEDIUM_PATTERNS = [
  /\bparents? are pressuring\b/,
  /\bfamily wants\b/,
  /\bi want to respect family\b/,
  /\bi need to convince them\b/,
  /\bi am trying to balance\b/,
  /\bthey are involved\b/,
  /\bfamily discussion\b/,
];

const AUTONOMY_HIGH_PATTERNS = [
  /\bmy choice\b/,
  /\bi will decide\b/,
  /\bi can decide\b/,
  /\bfamily supports me\b/,
  /\bparents? support me\b/,
  /\bno pressure\b/,
  /\bindependent\b/,
  /\bliving independently\b/,
  /\bfinancially independent\b/,
  /\bi have freedom\b/,
];

const EXPLICIT_CULTURAL_PATTERNS = [
  ...FAMILY_INVOLVED_PATTERNS,
  ...PARENTAL_PRESSURE_PATTERNS,
  ...ARRANGED_MARRIAGE_PATTERNS,
  ...FAMILY_REPUTATION_PATTERNS,
  ...FINANCIAL_DEPENDENT_PATTERNS,
  ...RELIGIOUS_HIGH_PATTERNS,
  ...RELIGIOUS_MEDIUM_PATTERNS,
  ...RELIGIOUS_LOW_PATTERNS,
  ...AUTONOMY_LOW_PATTERNS,
  ...AUTONOMY_MEDIUM_PATTERNS,
  ...AUTONOMY_HIGH_PATTERNS,
];

export function extractCulturalFamilyContext(
  input: CulturalContextInput,
): CulturalFamilyContextResult {
  const normalizedQuestion = normalizeQuestion(input.question);
  const q = normalizedQuestion.toLowerCase();

  if (normalizedQuestion.length === 0) {
    return createUnknownCulturalFamilyContext();
  }

  const previous = input.previousEphemeralContext?.culturalFamilyContext;
  const shortAmbiguousFollowUp = isShortAmbiguousFollowUp(q);
  const familyInvolved = inferFamilyInvolved(q) || (shortAmbiguousFollowUp && previous?.familyInvolved === true);
  const parentalPressure = inferParentalPressure(q, previous?.parentalPressure === true, shortAmbiguousFollowUp);
  const arrangedMarriageContext = inferArrangedMarriageContext(q, previous?.arrangedMarriageContext === true, shortAmbiguousFollowUp);
  const familyReputationPressure = inferFamilyReputationPressure(q, arrangedMarriageContext, parentalPressure);
  const financialDependents = inferFinancialDependents(q, previous?.financialDependents === true, shortAmbiguousFollowUp);
  const religiousComfort = inferReligiousComfort(q, previous?.religiousComfort);
  const decisionAutonomy = inferDecisionAutonomy(q, {
    previous,
    familyInvolved,
    parentalPressure,
    familyReputationPressure,
  });

  if (
    !familyInvolved &&
    !parentalPressure &&
    !arrangedMarriageContext &&
    !familyReputationPressure &&
    !financialDependents &&
    religiousComfort === "unknown" &&
    decisionAutonomy === "unknown"
  ) {
    return createUnknownCulturalFamilyContext();
  }

  return {
    familyInvolved,
    parentalPressure,
    arrangedMarriageContext,
    familyReputationPressure,
    financialDependents,
    religiousComfort,
    decisionAutonomy,
  };
}

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ");
}

function createUnknownCulturalFamilyContext(): CulturalFamilyContextResult {
  return {
    familyInvolved: false,
    parentalPressure: false,
    arrangedMarriageContext: false,
    familyReputationPressure: false,
    financialDependents: false,
    religiousComfort: "unknown",
    decisionAutonomy: "unknown",
  };
}

function hasAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function inferFamilyInvolved(q: string): boolean {
  return hasAny(q, FAMILY_INVOLVED_PATTERNS);
}

function inferParentalPressure(q: string, previousPressure: boolean, shortAmbiguousFollowUp: boolean): boolean {
  if (/\b(do not pressure me|don't pressure me|not pressure me|no pressure)\b/.test(q)) {
    return false;
  }

  if (hasAny(q, PARENTAL_PRESSURE_PATTERNS)) {
    return true;
  }

  if (hasAny(q, [/\bparents?\b/, /\bfamily\b/]) && hasAny(q, [/\bpressure\b/, /\bpressuring\b/, /\bforcing\b/, /\binsist\b/])) {
    return true;
  }

  if (previousPressure && shortAmbiguousFollowUp) {
    return true;
  }

  if (/\bparents?\b/.test(q) && /\b(support|supportive|okay|fine|respect my choice)\b/.test(q)) {
    return false;
  }

  if (/\bfamily\b/.test(q) && /\b(support|supportive|okay|fine|respect my choice)\b/.test(q)) {
    return false;
  }

  return false;
}

function inferArrangedMarriageContext(
  q: string,
  previousArrangedMarriageContext: boolean,
  shortAmbiguousFollowUp: boolean,
): boolean {
  if (previousArrangedMarriageContext && shortAmbiguousFollowUp) {
    return true;
  }

  if (/\b(no specific proposal|no proposal|not a proposal)\b/.test(q)) {
    return false;
  }

  if (!hasAny(q, ARRANGED_MARRIAGE_PATTERNS)) {
    return false;
  }
  return /\b(proposal|match|rishta|biodata|matrimonial|arranged marriage|family selected|family introduced|kundli matching|horoscope matching|marriage talks|meeting families)\b/.test(q);
}

function inferFamilyReputationPressure(
  q: string,
  arrangedMarriageContext: boolean,
  parentalPressure: boolean,
): boolean {
  if (hasAny(q, FAMILY_REPUTATION_PATTERNS)) {
    return true;
  }

  if (arrangedMarriageContext && parentalPressure && /\b(say yes|proposal|marriage|match)\b/.test(q)) {
    return true;
  }

  return false;
}

function inferFinancialDependents(q: string, previousDependent: boolean, shortAmbiguousFollowUp: boolean): boolean {
  if (hasAny(q, FINANCIAL_DEPENDENT_PATTERNS)) {
    return true;
  }

  if (previousDependent && shortAmbiguousFollowUp) {
    return true;
  }

  return false;
}

function inferReligiousComfort(q: string, previousComfort?: ConsultationReligiousComfort): ConsultationReligiousComfort {
  if (hasAny(q, RELIGIOUS_LOW_PATTERNS)) {
    return "low";
  }
  if (hasAny(q, RELIGIOUS_HIGH_PATTERNS)) {
    return "high";
  }
  if (hasAny(q, RELIGIOUS_MEDIUM_PATTERNS)) {
    return "medium";
  }
  return previousComfort ?? "unknown";
}

function inferDecisionAutonomy(
  q: string,
  context: {
    readonly previous?: Partial<CulturalFamilyContextResult>;
    readonly familyInvolved: boolean;
    readonly parentalPressure: boolean;
    readonly familyReputationPressure: boolean;
  },
): DecisionAutonomy {
  if (hasAny(q, AUTONOMY_LOW_PATTERNS)) {
    return "low";
  }
  if (/\b(do not pressure me|don't pressure me|not pressure me|no pressure|support my choice|supportive|can decide|i will decide independently)\b/.test(q)) {
    return "high";
  }
  if (hasAny(q, AUTONOMY_HIGH_PATTERNS)) {
    return "high";
  }
  if (hasAny(q, AUTONOMY_MEDIUM_PATTERNS)) {
    return "medium";
  }

  if (context.parentalPressure) {
    return "medium";
  }

  if (context.previous && isShortAmbiguousFollowUp(q)) {
    return context.previous.decisionAutonomy ?? "unknown";
  }

  if (context.familyInvolved) {
    return "unknown";
  }

  return "unknown";
}

function isShortAmbiguousFollowUp(question: string): boolean {
  const wordCount = normalizeQuestion(question)
    .split(" ")
    .filter(Boolean).length;
  return wordCount <= 5 && !hasAny(question, EXPLICIT_CULTURAL_PATTERNS);
}
