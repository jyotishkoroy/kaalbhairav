export type RagSafetyRiskFlag =
  | "medical"
  | "legal"
  | "death"
  | "lifespan"
  | "self_harm"
  | "pregnancy"
  | "financial_guarantee"
  | "gemstone_guarantee"
  | "expensive_puja_pressure"
  | "unsafe_remedy"
  | "timing_certainty"
  | "general";

export type RagSafetySeverity = "allow" | "caution" | "block";

export type RagSafetyGateInput = {
  question: string;
  answerType?: "exact_fact" | "interpretive" | "timing" | "remedy" | "unknown";
};

export type RagSafetyGateResult = {
  allowed: boolean;
  severity: RagSafetySeverity;
  riskFlags: RagSafetyRiskFlag[];
  restrictions: string[];
  blockedReason: string | null;
  safeResponse: string | null;
  source: "deterministic" | "existing_safety_adapter";
  metadata: {
    exactFactAllowed: boolean;
    timingClaimsAllowed: boolean;
    remedyClaimsAllowed: boolean;
    llmAllowed: boolean;
    shouldAskFollowup: boolean;
  };
};

const NO_DEATH_RESTRICTION = "Do not provide death-date, lifespan, or fatal accident predictions.";
const NO_MEDICAL_RESTRICTION = "Do not diagnose medical conditions or advise stopping medication.";
const NO_LEGAL_RESTRICTION = "Do not provide legal advice or guaranteed legal outcomes.";
const NO_FINANCIAL_RESTRICTION = "Do not provide financial guarantees or investment instructions.";
const NO_GEMSTONE_RESTRICTION = "Do not claim gemstones guarantee outcomes.";
const NO_PUJA_PRESSURE_RESTRICTION = "Do not pressure the user into expensive puja or fear-based remedies.";
const NO_TIMING_CERTAINTY_RESTRICTION = "Do not state exact timing unless a grounded timing source is provided.";
const LOW_COST_REMEDY_RESTRICTION = "Keep remedies optional, low-cost, and non-coercive.";
const EXACT_FACT_RESTRICTION = "Answer exact chart facts only from structured facts.";

type NormalizedInput = {
  question: string;
  answerType: RagSafetyGateInput["answerType"];
};

const DEATH_PATTERNS = [
  /when will i die/i,
  /when i will die/i,
  /date of death/i,
  /exact date.*death/i,
  /death date/i,
  /how long will i live/i,
  /will i die soon/i,
  /fatal accident/i,
  /die in an accident/i,
  /accident death/i,
  /predict my lifespan/i,
  /lifespan/i,
  /\blongevity\b/i,
  /early death yoga/i,
];

const LIFESPAN_PATTERNS = [
  /life span/i,
  /lifespan/i,
  /longevity prediction/i,
  /life expectancy/i,
  /how long will i live/i,
];

const SELF_HARM_PATTERNS = [
  /should i kill myself/i,
  /i want to die/i,
  /self[- ]harm/i,
  /\bsuicide\b/i,
  /no reason to live/i,
  /end my life/i,
  /kill myself/i,
];

const MEDICAL_PATTERNS = [
  /do i have cancer/i,
  /diagnos/i,
  /medical report/i,
  /should i stop (taking )?medicine/i,
  /should i stop (taking )?medication/i,
  /surgery prediction/i,
  /will my surgery be successful/i,
  /cure diabetes/i,
  /disease/i,
  /hospital/i,
  /doctor/i,
  /medical/i,
  /pregnancy complication/i,
  /am i sick/i,
  /illness/i,
  /baby have health problems/i,
  /miscarriage/i,
];

const PREGNANCY_PATTERNS = [
  /am i pregnant/i,
  /pregnancy diagnosis/i,
  /miscarriage prediction/i,
  /will my baby have health problems/i,
  /baby health/i,
  /gender prediction/i,
  /pregnancy/i,
  /pregnant/i,
  /conceive/i,
  /fertility/i,
  /childbirth/i,
  /miscarriage/i,
];

const LEGAL_PATTERNS = [
  /win (my )?court case/i,
  /should i sign this contract/i,
  /will i go to jail/i,
  /jail prediction/i,
  /\blegal guarantee\b/i,
  /divorce legal outcome/i,
  /court case/i,
  /contract/i,
  /lawsuit/i,
  /\blegal\b/i,
  /\battorney\b/i,
  /\blawyer\b/i,
];

const FINANCIAL_PATTERNS = [
  /guaranteed profit/i,
  /stock market sure shot/i,
  /investment guarantee/i,
  /lottery number/i,
  /will i definitely become rich/i,
  /exact crypto prediction/i,
  /surely make me rich/i,
  /\bprofit\b/i,
  /\binvestment\b/i,
  /\bstock\b/i,
  /\bcrypto\b/i,
  /\blottery\b/i,
  /\bcrorepati\b/i,
];

const GEMSTONE_PATTERNS = [
  /which gemstone guarantees money/i,
  /gemstone will fix everything/i,
  /sure promotion if i wear stone/i,
  /blue sapphire guarantee/i,
  /gemstone guarantees promotion/i,
  /blue sapphire/i,
  /\bgemstone\b/i,
  /\bstone\b/i,
];

const EXPENSIVE_PUJA_PATTERNS = [
  /must i pay for puja/i,
  /expensive puja required/i,
  /only costly ritual can fix/i,
  /50000 rupee puja/i,
  /rs\.?\s*50000/i,
  /rupees/i,
  /expensive/i,
  /mandatory puja/i,
];

const UNSAFE_REMEDY_PATTERNS = [
  /cure diabetes/i,
  /stop medicine/i,
  /stop medication/i,
  /do not see a doctor/i,
  /miracle cure/i,
  /guarantee/i,
  /blue sapphire/i,
  /gemstone/i,
  /puja/i,
];

const TIMING_CERTAINTY_PATTERNS = [
  /exact date/i,
  /exactly/i,
  /definitely/i,
  /guaranteed/i,
  /sure shot/i,
  /next week/i,
  /next month/i,
  /when will/i,
  /date/i,
  /timing/i,
];

function normalizeInput(inputOrQuestion: RagSafetyGateInput | string): NormalizedInput {
  if (typeof inputOrQuestion === "string") {
    return { question: inputOrQuestion, answerType: "unknown" };
  }
  return {
    question: typeof inputOrQuestion?.question === "string" ? inputOrQuestion.question : "",
    answerType: inputOrQuestion?.answerType ?? "unknown",
  };
}

function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPattern(question: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question));
}

function addFlag(flags: Set<RagSafetyRiskFlag>, flag: RagSafetyRiskFlag): void {
  flags.add(flag);
}

export function detectRagSafetyRiskFlags(question: string): RagSafetyRiskFlag[] {
  const normalized = normalizeQuestion(question);
  const flags = new Set<RagSafetyRiskFlag>();

  if (!normalized) {
    addFlag(flags, "general");
    return [...flags];
  }

  if (hasPattern(normalized, SELF_HARM_PATTERNS)) addFlag(flags, "self_harm");
  if (hasPattern(normalized, DEATH_PATTERNS)) {
    addFlag(flags, "death");
    if (hasPattern(normalized, LIFESPAN_PATTERNS)) addFlag(flags, "lifespan");
  }
  if (hasPattern(normalized, LIFESPAN_PATTERNS)) addFlag(flags, "lifespan");
  if (hasPattern(normalized, MEDICAL_PATTERNS)) addFlag(flags, "medical");
  if (hasPattern(normalized, PREGNANCY_PATTERNS)) {
    addFlag(flags, "pregnancy");
    addFlag(flags, "medical");
  }
  if (hasPattern(normalized, LEGAL_PATTERNS)) addFlag(flags, "legal");
  if (hasPattern(normalized, FINANCIAL_PATTERNS)) addFlag(flags, "financial_guarantee");
  if (hasPattern(normalized, GEMSTONE_PATTERNS)) addFlag(flags, "gemstone_guarantee");
  if (hasPattern(normalized, EXPENSIVE_PUJA_PATTERNS)) addFlag(flags, "expensive_puja_pressure");
  if (hasPattern(normalized, UNSAFE_REMEDY_PATTERNS)) addFlag(flags, "unsafe_remedy");
  if (hasPattern(normalized, TIMING_CERTAINTY_PATTERNS)) addFlag(flags, "timing_certainty");

  if (flags.size === 0) addFlag(flags, "general");
  return [...flags];
}

function isGuaranteeQuestion(question: string): boolean {
  return /guarantee|definitely|sure shot|exact|certain|for sure|always|based only on astrology|surely/i.test(question);
}

function isDeathOrLifespanBlocked(question: string, flags: RagSafetyRiskFlag[]): boolean {
  return flags.includes("death") || flags.includes("lifespan") || /early death yoga/i.test(question);
}

function isMedicalBlocked(question: string): boolean {
  return /do i have|diagnos|should i stop (taking )?(medicine|medication)|cure diabetes|pregnancy complication|will my surgery|health problems/i.test(question);
}

export function isRagSafetyBlocked(
  flags: RagSafetyRiskFlag[],
  question: string,
  answerType?: RagSafetyGateInput["answerType"],
): boolean {
  const normalized = normalizeQuestion(question);
  const type = answerType ?? "unknown";

  if (flags.includes("self_harm")) return true;
  if (flags.includes("death") || flags.includes("lifespan")) return true;
  if (flags.includes("medical") && isMedicalBlocked(normalized)) return true;
  if (flags.includes("pregnancy")) return true;
  if (flags.includes("legal")) return true;
  if (flags.includes("financial_guarantee")) return true;
  if (flags.includes("gemstone_guarantee") && isGuaranteeQuestion(normalized)) return true;
  if (flags.includes("expensive_puja_pressure")) return true;
  if (type === "exact_fact" && isDeathOrLifespanBlocked(normalized, flags)) return true;
  if (type === "timing" && isDeathOrLifespanBlocked(normalized, flags)) return true;
  if (type === "timing" && (flags.includes("financial_guarantee") || flags.includes("legal"))) return true;
  if (flags.includes("unsafe_remedy") && isGuaranteeQuestion(normalized)) return true;
  return false;
}

export function buildRagSafetyRestrictions(
  flags: RagSafetyRiskFlag[],
  answerType?: RagSafetyGateInput["answerType"],
): string[] {
  const restrictions = new Set<string>();

  if (flags.includes("death") || flags.includes("lifespan")) restrictions.add(NO_DEATH_RESTRICTION);
  if (flags.includes("medical")) restrictions.add(NO_MEDICAL_RESTRICTION);
  if (flags.includes("legal")) restrictions.add(NO_LEGAL_RESTRICTION);
  if (flags.includes("financial_guarantee")) restrictions.add(NO_FINANCIAL_RESTRICTION);
  if (flags.includes("gemstone_guarantee")) restrictions.add(NO_GEMSTONE_RESTRICTION);
  if (flags.includes("expensive_puja_pressure")) restrictions.add(NO_PUJA_PRESSURE_RESTRICTION);
  if (flags.includes("timing_certainty") || answerType === "timing") restrictions.add(NO_TIMING_CERTAINTY_RESTRICTION);
  if (answerType === "exact_fact") restrictions.add(EXACT_FACT_RESTRICTION);
  if (answerType === "remedy") restrictions.add(LOW_COST_REMEDY_RESTRICTION);
  if (flags.includes("unsafe_remedy") || answerType === "remedy") restrictions.add(LOW_COST_REMEDY_RESTRICTION);

  return [...restrictions];
}

function buildDeathSafeResponse(): string {
  return "I can’t predict death dates, lifespan, or fatal events from a chart. I can help with safer astrology questions, such as current stress patterns, health-supportive routines, or what your chart says about resilience and practical care.";
}

function buildMedicalSafeResponse(): string {
  return "I can’t diagnose medical conditions or advise stopping treatment from astrology. Please use a qualified medical professional for diagnosis or medication decisions. I can still offer general, non-medical wellbeing or spiritual routine suggestions if you want.";
}

function buildSelfHarmSafeResponse(): string {
  return "I’m sorry you’re feeling this level of distress. I can’t help with self-harm. Please contact local emergency services or a crisis helpline now, or reach out to someone nearby who can stay with you. If you want, ask me for a grounding step for the next few minutes.";
}

function buildLegalSafeResponse(): string {
  return "I can’t give legal advice or guarantee a court outcome from astrology. Please consult a qualified lawyer for legal decisions. I can still help frame this as a general stress/timing question without certainty.";
}

function buildPregnancySafeResponse(): string {
  return "I can’t determine pregnancy, baby health, or pregnancy outcomes from astrology. Please use a qualified medical professional for diagnosis or pregnancy-related health decisions.";
}

function buildFinancialSafeResponse(): string {
  return "I can’t provide financial guarantees, lottery predictions, or investment instructions from astrology. Please use qualified financial advice for money decisions. I can still discuss general money discipline and risk-awareness themes.";
}

function buildRemedySafetyResponse(): string {
  return "I can help with a gentle, low-cost remedy approach, but not with diagnosis, guarantees, or pressure. Keep it optional and non-coercive, and use medical or professional help where appropriate.";
}

function buildBlockedReason(flags: RagSafetyRiskFlag[]): string | null {
  if (flags.includes("self_harm")) return "self_harm";
  if (flags.includes("death") || flags.includes("lifespan")) return "death_or_lifespan";
  if (flags.includes("medical") && flags.includes("pregnancy")) return "pregnancy_or_medical";
  if (flags.includes("medical")) return "medical";
  if (flags.includes("legal")) return "legal";
  if (flags.includes("financial_guarantee")) return "financial_guarantee";
  if (flags.includes("gemstone_guarantee")) return "gemstone_guarantee";
  if (flags.includes("expensive_puja_pressure")) return "expensive_puja_pressure";
  if (flags.includes("unsafe_remedy")) return "unsafe_remedy";
  return null;
}

function pickSafeResponse(flags: RagSafetyRiskFlag[]): string | null {
  if (flags.includes("self_harm")) return buildSelfHarmSafeResponse();
  if (flags.includes("death") || flags.includes("lifespan")) return buildDeathSafeResponse();
  if (flags.includes("pregnancy")) return buildPregnancySafeResponse();
  if (flags.includes("medical")) return buildMedicalSafeResponse();
  if (flags.includes("legal")) return buildLegalSafeResponse();
  if (flags.includes("financial_guarantee")) return buildFinancialSafeResponse();
  if (flags.includes("unsafe_remedy") || flags.includes("expensive_puja_pressure") || flags.includes("gemstone_guarantee"))
    return buildRemedySafetyResponse();
  return null;
}

export function ragSafetyGate(inputOrQuestion: RagSafetyGateInput | string): RagSafetyGateResult {
  const input = normalizeInput(inputOrQuestion);
  const question = normalizeQuestion(input.question);
  const riskFlags = detectRagSafetyRiskFlags(question);
  const blocked = isRagSafetyBlocked(riskFlags, question, input.answerType);
  const severity: RagSafetySeverity = blocked
    ? "block"
    : riskFlags.some((flag) => flag !== "general")
    ? "caution"
      : "allow";
  const restrictions = buildRagSafetyRestrictions(riskFlags, input.answerType);
  if (!blocked && /remedy|sleep|mantra|peace/i.test(question)) {
    restrictions.push(LOW_COST_REMEDY_RESTRICTION);
  }
  const safeResponse = pickSafeResponse(riskFlags);
  const exactFactAllowed =
    !blocked &&
    (input.answerType === "exact_fact" || input.answerType === "unknown" || input.answerType === undefined) &&
    !riskFlags.some((flag) => ["death", "lifespan", "medical", "legal", "financial_guarantee", "pregnancy", "self_harm"].includes(flag));
  const timingClaimsAllowed = !blocked && !riskFlags.includes("timing_certainty");
  const remedyClaimsAllowed =
    !blocked &&
    (input.answerType === "remedy" || input.answerType === "unknown" || /remedy|sleep|mantra|peace/i.test(question)) &&
    !riskFlags.includes("self_harm") &&
    !riskFlags.includes("medical") &&
    !riskFlags.includes("gemstone_guarantee") &&
    !riskFlags.includes("expensive_puja_pressure");

  return {
    allowed: !blocked,
    severity,
    riskFlags,
    restrictions,
    blockedReason: blocked ? buildBlockedReason(riskFlags) : null,
    safeResponse,
    source: "deterministic",
    metadata: {
      exactFactAllowed,
      timingClaimsAllowed,
      remedyClaimsAllowed,
      llmAllowed: !blocked && !riskFlags.includes("self_harm"),
      shouldAskFollowup: !blocked && riskFlags.includes("timing_certainty"),
    },
  };
}
