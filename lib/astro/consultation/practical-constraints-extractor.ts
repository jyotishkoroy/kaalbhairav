/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ConsultationRiskTolerance } from "./consultation-types";
import type { ConsultationState } from "./consultation-state";

export type RemedyStyle =
  | "behavioral"
  | "light_spiritual"
  | "traditional"
  | "avoid_ritual"
  | "unknown";

export type PracticalConstraintsInput = {
  readonly question: string;
  readonly previousEphemeralContext?: ConsultationState;
};

export type PracticalConstraintResult = {
  readonly moneyConstraint: boolean;
  readonly timeConstraint: boolean;
  readonly privacyConstraint: boolean;
  readonly careerInstability: boolean;
  readonly healthConstraint: boolean;
  readonly familyConstraint: boolean;
  readonly riskTolerance: ConsultationRiskTolerance;
  readonly remedyStyle: RemedyStyle;
};

const MONEY_PATTERNS = [
  /\bno money\b/,
  /\blow budget\b/,
  /\bcannot afford\b/,
  /\bcan't afford\b/,
  /\bmoney is tight\b/,
  /\bfinancial pressure\b/,
  /\bfinancial problem\b/,
  /\bmoney problem\b/,
  /\bdebt\b/,
  /\bloan\b/,
  /\bemi\b/,
  /\bexpenses\b/,
  /\bsavings are low\b/,
  /\bno savings\b/,
  /\bincome is unstable\b/,
  /\bsalary delayed\b/,
  /\bunemployed\b/,
  /\bjobless\b/,
  /\bcannot pay\b/,
  /\bcostly\b/,
  /\bexpensive\b/,
  /\bavoid paid\b/,
  /\bfree only\b/,
  /\bwithin my means\b/,
];

const TIME_PATTERNS = [
  /\bno time\b/,
  /\blittle time\b/,
  /\bbusy\b/,
  /\bvery busy\b/,
  /\bwork 12 hours\b/,
  /\bwork twelve hours\b/,
  /\blong work hours\b/,
  /\bhectic schedule\b/,
  /\bno free time\b/,
  /\bdaily schedule is packed\b/,
  /\bcannot do daily\b/,
  /\bcannot travel\b/,
  /\bonly weekends\b/,
  /\bshort practice\b/,
  /\bquick remedy\b/,
  /\bshort\b/,
  /\b5 minutes\b/,
  /\bfive minutes\b/,
];

const PRIVACY_PATTERNS = [
  /\blive with parents\b/,
  /\blive with my parents\b/,
  /\bliving with parents\b/,
  /\bparents will notice\b/,
  /\bfamily will notice\b/,
  /\bcannot do openly\b/,
  /\bneed discreet\b/,
  /\bsecretly\b/,
  /\bprivate\b/,
  /\bprivacy\b/,
  /\bno privacy\b/,
  /\bshared room\b/,
  /\broommate\b/,
  /\boffice environment\b/,
  /\bcannot chant aloud\b/,
  /\bcannot light lamp\b/,
  /\bcannot visit temple openly\b/,
];

const CAREER_INSTABILITY_PATTERNS = [
  /\bcareer is unstable\b/,
  /\bjob is unstable\b/,
  /\bcareer unstable\b/,
  /\bjob unstable\b/,
  /\bwork unstable\b/,
  /\bunstable income\b/,
  /\bmight lose job\b/,
  /\bcontract job\b/,
  /\btemporary job\b/,
  /\bprobation\b/,
  /\bmanager blocking\b/,
  /\bnot getting promotion\b/,
  /\bwant to quit\b/,
  /\bshould i resign\b/,
  /\bjob switch\b/,
  /\bno offer\b/,
  /\bunemployed\b/,
  /\bbetween jobs\b/,
  /\bbusiness not stable\b/,
  /\bstartup unstable\b/,
];

const HEALTH_PATTERNS = [
  /\bhealth issue\b/,
  /\billness\b/,
  /\bsick\b/,
  /\bdisease\b/,
  /\bhospital\b/,
  /\bmedical\b/,
  /\bdoctor\b/,
  /\bmedication\b/,
  /\bsurgery\b/,
  /\banxiety affecting sleep\b/,
  /\bdepression\b/,
  /\bpanic\b/,
  /\bburnout\b/,
  /\bburned out\b/,
  /\bexhausted\b/,
  /\bcannot fast\b/,
  /\bfasting not possible\b/,
  /\bpregnant\b/,
  /\bdiabetes\b/,
  /\bblood pressure\b/,
  /\bchronic pain\b/,
  /\bsleep problem\b/,
];

const FAMILY_PATTERNS = [
  /\bfamily restriction\b/,
  /\bfamily pressure\b/,
  /\bparents pressure\b/,
  /\bparents are pressuring\b/,
  /\bparents won't allow\b/,
  /\bfamily won't allow\b/,
  /\bnot allowed\b/,
  /\bfamily responsibilities\b/,
  /\bfamily duty\b/,
  /\bhousehold responsibility\b/,
  /\bcaring for parents\b/,
  /\bin-laws\b/,
  /\bspouse restriction\b/,
  /\bchild care\b/,
  /\bchildren\b/,
  /\bdependents\b/,
  /\blive with parents\b/,
  /\blive with my parents\b/,
  /\bliving with parents\b/,
  /\bfamily depends on me\b/,
  /\bfamily will notice\b/,
];

const RISK_LOW_PATTERNS = [
  /\bafraid of risk\b/,
  /\bcannot take risk\b/,
  /\blow risk\b/,
  /\bsafe option\b/,
  /\bneed stability\b/,
  /\bdebt\b/,
  /\bno savings\b/,
  /\bfamily depends on me\b/,
  /\bcannot fail\b/,
  /\bcannot afford failure\b/,
  /\bsecure job\b/,
  /\bstable income\b/,
  /\bdon't want risk\b/,
  /\bdo not want risk\b/,
];

const RISK_MEDIUM_PATTERNS = [
  /\bsome risk\b/,
  /\bcalculated risk\b/,
  /\bcan try slowly\b/,
  /\bside by side\b/,
  /\bgradually\b/,
  /\btest first\b/,
  /\bbackup plan\b/,
  /\bif safe\b/,
  /\bafter preparation\b/,
];

const RISK_HIGH_PATTERNS = [
  /\bready to take risk\b/,
  /\bhigh risk\b/,
  /\bcan take risk\b/,
  /\bwilling to risk\b/,
  /\bprepared to quit\b/,
  /\bno dependents\b/,
  /\benough savings\b/,
  /\bfinancial runway\b/,
  /\bindependent\b/,
  /\bcan relocate\b/,
  /\bcan invest\b/,
];

const AVOID_RITUAL_PATTERNS = [
  /\bavoid ritual\b/,
  /\bno ritual\b/,
  /\bno rituals\b/,
  /\bno puja\b/,
  /\bno gemstone\b/,
  /\bno fasting\b/,
  /\bcannot fast\b/,
  /\bnot religious\b/,
  /\bnot spiritual\b/,
  /\bskeptical\b/,
  /\bpractical only\b/,
  /\bnot rituals\b/,
  /\bexpensive remedies\b/,
  /\bdon't believe in remedies\b/,
  /\bdo not believe in remedies\b/,
];

const BEHAVIORAL_PATTERNS = [
  /\bpractical only\b/,
  /\bno ritual\b/,
  /\bsimple habit\b/,
  /\bjournaling\b/,
  /\bdiscipline\b/,
  /\broutine\b/,
  /\baction steps\b/,
  /\bbehavioral\b/,
  /\bdiscreet\b/,
];

const LIGHT_SPIRITUAL_PATTERNS = [
  /\bsimple prayer\b/,
  /\bsmall prayer\b/,
  /\blight spiritual\b/,
  /\bsimple mantra\b/,
  /\b5 minute mantra\b/,
  /\bshort mantra\b/,
  /\bcan pray\b/,
  /\bokay with prayer\b/,
  /\bsimple remedy\b/,
  /\blow effort remedy\b/,
  /\bsmall donation\b/,
  /\bwithin my means\b/,
];

const TRADITIONAL_PATTERNS = [
  /\bpuja\b/,
  /\britual\b/,
  /\btemple\b/,
  /\bfasting\b/,
  /\bmantra\b/,
  /\bdonation\b/,
  /\bcharity\b/,
  /\bhanuman chalisa\b/,
  /\bshiva\b/,
  /\bdurga\b/,
  /\blakshmi\b/,
  /\bsaturn remedy\b/,
  /\btraditional remedy\b/,
  /\bpriest\b/,
  /\bhoma\b/,
  /\bhavan\b/,
];

const EXPLICIT_PRACTICAL_PATTERNS = [
  ...MONEY_PATTERNS,
  ...TIME_PATTERNS,
  ...PRIVACY_PATTERNS,
  ...CAREER_INSTABILITY_PATTERNS,
  ...HEALTH_PATTERNS,
  ...FAMILY_PATTERNS,
  ...RISK_LOW_PATTERNS,
  ...RISK_MEDIUM_PATTERNS,
  ...RISK_HIGH_PATTERNS,
  ...AVOID_RITUAL_PATTERNS,
  ...BEHAVIORAL_PATTERNS,
  ...LIGHT_SPIRITUAL_PATTERNS,
  ...TRADITIONAL_PATTERNS,
];

export function extractPracticalConstraints(
  input: PracticalConstraintsInput,
): PracticalConstraintResult {
  const normalizedQuestion = normalizeQuestion(input.question);
  const q = normalizedQuestion.toLowerCase();

  if (normalizedQuestion.length === 0) {
    return createUnknownPracticalConstraints();
  }

  const previous = input.previousEphemeralContext?.practicalConstraints;
  const shortAmbiguousFollowUp = isShortAmbiguousFollowUp(normalizedQuestion);

  const moneyConstraint = inferMoneyConstraint(q, previous?.moneyConstraint === true, shortAmbiguousFollowUp);
  const timeConstraint = inferTimeConstraint(q, previous?.timeConstraint === true, shortAmbiguousFollowUp);
  const privacyConstraint = inferPrivacyConstraint(
    q,
    previous?.privacyConstraint === true,
    shortAmbiguousFollowUp,
  );
  const careerInstability = inferCareerInstability(
    q,
    previous?.careerInstability === true,
    shortAmbiguousFollowUp,
  );
  const healthConstraint = inferHealthConstraint(
    q,
    false,
    shortAmbiguousFollowUp,
  );
  const familyConstraint = inferFamilyConstraint(q, previous?.familyRestriction === true, shortAmbiguousFollowUp);
  const riskTolerance = inferRiskTolerance(q, careerInstability, previous?.riskTolerance);
  const remedyStyle = inferRemedyStyle(q, {
    moneyConstraint,
    timeConstraint,
    privacyConstraint,
    careerInstability,
    healthConstraint,
    familyConstraint,
  });

  return {
    moneyConstraint,
    timeConstraint,
    privacyConstraint,
    careerInstability,
    healthConstraint,
    familyConstraint,
    riskTolerance,
    remedyStyle,
  };
}

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ");
}

function createUnknownPracticalConstraints(): PracticalConstraintResult {
  return {
    moneyConstraint: false,
    timeConstraint: false,
    privacyConstraint: false,
    careerInstability: false,
    healthConstraint: false,
    familyConstraint: false,
    riskTolerance: "unknown",
    remedyStyle: "unknown",
  };
}

function hasAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function inferMoneyConstraint(q: string, previousMoneyConstraint: boolean, shortAmbiguousFollowUp: boolean): boolean {
  if (hasAny(q, [/\b(i now have enough savings|enough savings|can afford|within my means|money is not tight|no longer tight)\b/])) {
    return false;
  }
  if (hasAny(q, MONEY_PATTERNS)) {
    return true;
  }
  return previousMoneyConstraint && shortAmbiguousFollowUp;
}

function inferTimeConstraint(q: string, previousTimeConstraint: boolean, shortAmbiguousFollowUp: boolean): boolean {
  if (hasAny(q, [/\b(i now have time|more time|free time)\b/])) {
    return false;
  }
  if (hasAny(q, TIME_PATTERNS)) {
    return true;
  }
  return previousTimeConstraint && shortAmbiguousFollowUp;
}

function inferPrivacyConstraint(q: string, previousPrivacyConstraint: boolean, shortAmbiguousFollowUp: boolean): boolean {
  if (hasAny(q, [/\b(i have privacy|private space|can do openly|supportive and i have privacy)\b/])) {
    return false;
  }
  if (/\blive with parents\b/.test(q) || /\blive with my parents\b/.test(q) || /\bliving with parents\b/.test(q)) {
    return true;
  }
  if (hasAny(q, PRIVACY_PATTERNS)) {
    return true;
  }
  return previousPrivacyConstraint && shortAmbiguousFollowUp;
}

function inferCareerInstability(q: string, previousCareerInstability: boolean, shortAmbiguousFollowUp: boolean): boolean {
  if (hasAny(q, CAREER_INSTABILITY_PATTERNS)) {
    return true;
  }
  return previousCareerInstability && shortAmbiguousFollowUp;
}

function inferHealthConstraint(q: string, previousHealthConstraint: boolean, shortAmbiguousFollowUp: boolean): boolean {
  if (hasAny(q, HEALTH_PATTERNS)) {
    return true;
  }
  return previousHealthConstraint && shortAmbiguousFollowUp;
}

function inferFamilyConstraint(q: string, previousFamilyConstraint: boolean, shortAmbiguousFollowUp: boolean): boolean {
  if (/\blive with parents\b/.test(q) || /\blive with my parents\b/.test(q) || /\bliving with parents\b/.test(q)) {
    return true;
  }
  if (hasAny(q, FAMILY_PATTERNS)) {
    return true;
  }
  return previousFamilyConstraint && shortAmbiguousFollowUp;
}

function inferRiskTolerance(
  q: string,
  careerInstability: boolean,
  previousRiskTolerance?: ConsultationRiskTolerance,
): ConsultationRiskTolerance {
  const low = hasAny(q, RISK_LOW_PATTERNS);
  const medium = hasAny(q, RISK_MEDIUM_PATTERNS);
  const high = hasAny(q, RISK_HIGH_PATTERNS);

  if (low || careerInstability) {
    return "low";
  }
  if (medium) {
    return "medium";
  }
  if (high) {
    return "high";
  }
  return previousRiskTolerance ?? "unknown";
}

function inferRemedyStyle(
  q: string,
  constraints: {
    readonly moneyConstraint: boolean;
    readonly timeConstraint: boolean;
    readonly privacyConstraint: boolean;
    readonly careerInstability: boolean;
    readonly healthConstraint: boolean;
    readonly familyConstraint: boolean;
  },
): RemedyStyle {
  if (hasAny(q, AVOID_RITUAL_PATTERNS)) {
    return "avoid_ritual";
  }
  if (hasAny(q, LIGHT_SPIRITUAL_PATTERNS)) {
    return "light_spiritual";
  }
  if (hasAny(q, BEHAVIORAL_PATTERNS)) {
    return "behavioral";
  }
  if (hasAny(q, TRADITIONAL_PATTERNS)) {
    return "traditional";
  }
  if (
    constraints.moneyConstraint ||
    constraints.timeConstraint ||
    constraints.privacyConstraint ||
    constraints.healthConstraint
  ) {
    return "behavioral";
  }
  return "unknown";
}

function isShortAmbiguousFollowUp(question: string): boolean {
  const normalized = normalizeQuestion(question);
  const wordCount = normalized.split(" ").filter(Boolean).length;
  return wordCount <= 5 && !hasAny(normalized.toLowerCase(), EXPLICIT_PRACTICAL_PATTERNS);
}
