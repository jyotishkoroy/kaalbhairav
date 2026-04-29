import {
  getAntardasha,
  getMahadasha,
  getMoonSign,
  matchesAny,
} from "@/lib/astro/interpretation/context";
import { getMonthlyActionSet } from "@/lib/astro/monthly/monthly-actions";
import type {
  MonthlyGuidance,
  MonthlyGuidanceInput,
  MonthlyGuidanceTheme,
} from "@/lib/astro/monthly/monthly-types";

function getCurrentMonthLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function deriveTheme(input: MonthlyGuidanceInput): MonthlyGuidanceTheme {
  const ctx = {
    concern: {
      topic: input.topic ?? "general",
      emotionalTone: "calm",
      questionType: "general_prediction",
      needsReassurance: false,
      wantsTechnicalAstrology: false,
      wantsPracticalSteps: false,
      highRiskFlags: [] as string[],
    },
    chart: input.chart,
    dasha: input.dasha,
    transits: input.transits,
  } as const;

  const mahadasha = getMahadasha(ctx);
  const antardasha = getAntardasha(ctx);
  const moonSign = getMoonSign(ctx);

  if (input.topic === "health" || input.topic === "death") return "wellbeing";
  if (input.topic === "money") return "financial_stability";
  if (input.topic === "relationship" || input.topic === "marriage") {
    return "relationship_balance";
  }
  if (input.topic === "career") {
    if (matchesAny(mahadasha, ["saturn", "shani"])) return "discipline";
    if (matchesAny(mahadasha, ["jupiter", "guru"])) return "growth";
    if (matchesAny(antardasha, ["mercury", "budh"])) return "communication";

    return "general";
  }

  if (matchesAny(mahadasha, ["saturn", "shani"])) return "discipline";
  if (matchesAny(mahadasha, ["jupiter", "guru"])) return "growth";
  if (matchesAny(antardasha, ["mercury", "budh"])) return "communication";
  if (matchesAny(antardasha, ["venus", "shukra"])) return "relationship_balance";
  if (matchesAny(moonSign, ["gemini", "mithun"])) return "communication";
  if (matchesAny(moonSign, ["cancer", "karka"])) return "emotional_clarity";

  return "general";
}

function assertSafeGuidance(guidance: MonthlyGuidance): MonthlyGuidance {
  const serialized = JSON.stringify(guidance).toLowerCase();
  const forbidden = [
    "you will definitely",
    "guaranteed",
    "death date",
    "you will die",
    "never marry",
    "cursed",
    "do not see a doctor",
    "stop medical",
    "miracle",
  ];

  for (const phrase of forbidden) {
    if (serialized.includes(phrase)) {
      throw new Error(`Unsafe monthly guidance phrase detected: ${phrase}`);
    }
  }

  return guidance;
}

export function generateMonthlyGuidance(
  input: MonthlyGuidanceInput = {},
): MonthlyGuidance {
  const theme = deriveTheme(input);
  const actions = getMonthlyActionSet(theme);

  return assertSafeGuidance({
    month: input.month ?? getCurrentMonthLabel(),
    mainTheme: actions.mainTheme,
    emotionalTheme: actions.emotionalTheme,
    careerFocus: actions.careerFocus,
    relationshipFocus: actions.relationshipFocus,
    avoid: actions.avoid,
    doMoreOf: actions.doMoreOf,
    remedy: actions.remedy,
  });
}

export function renderMonthlyGuidance(guidance: MonthlyGuidance): string {
  return [
    `Monthly guidance for ${guidance.month}: ${guidance.mainTheme}`,
    guidance.emotionalTheme,
    `Career focus: ${guidance.careerFocus}`,
    `Relationship focus: ${guidance.relationshipFocus}`,
    `Avoid: ${guidance.avoid.join(" ")}`,
    `Do more of: ${guidance.doMoreOf.join(" ")}`,
    `Practical note: ${guidance.remedy}`,
  ].join("\n\n");
}
