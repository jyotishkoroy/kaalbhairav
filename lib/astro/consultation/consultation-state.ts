/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type {
  ConsultationChartFactSet,
  ConsultationEmotionalPrimary,
  ConsultationIntentPrimary,
  ConsultationLifeArea,
  ConsultationReligiousComfort,
  ConsultationResponsePlan,
  ConsultationRiskTolerance,
  ConsultationToneNeeded,
  PatternRecognitionResult,
  RemedyPlan,
  TimingJudgement,
} from "./consultation-types";
import { extractCulturalFamilyContext } from "./cultural-context-extractor";
import { detectEmotionalState } from "./emotional-state-detector";
import { extractLifeContext } from "./life-context-extractor";

export type ConsultationInput = {
  readonly sessionId?: string;
  readonly userQuestion: string;
  readonly intent?: Partial<ConsultationState["intent"]>;
  readonly chartFacts?: ConsultationChartFactSet;
};

export type ConsultationState = {
  readonly sessionId: string;
  readonly userQuestion: string;

  readonly intent: {
    readonly primary: ConsultationIntentPrimary;
    readonly secondary: readonly string[];
    readonly needsChart: boolean;
    readonly needsFollowUp: boolean;
  };

  readonly chartFacts?: ConsultationChartFactSet;

  readonly lifeStory: {
    readonly currentIssue?: string;
    readonly lifeArea?: ConsultationLifeArea;
    readonly userAge?: number;
    readonly currentSituation?: string;
    readonly desiredOutcome?: string;
    readonly decisionType?: string;
  };

  readonly emotionalState: {
    readonly primary?: ConsultationEmotionalPrimary;
    readonly intensity?: "low" | "medium" | "high";
    readonly toneNeeded?: ConsultationToneNeeded;
  };

  readonly culturalFamilyContext: {
    readonly parentalPressure?: boolean;
    readonly familyInvolved?: boolean;
    readonly arrangedMarriageContext?: boolean;
    readonly financialDependents?: boolean;
    readonly religiousComfort?: ConsultationReligiousComfort;
  };

  readonly practicalConstraints: {
    readonly moneyConstraint?: boolean;
    readonly timeConstraint?: boolean;
    readonly privacyConstraint?: boolean;
    readonly careerInstability?: boolean;
    readonly familyRestriction?: boolean;
    readonly riskTolerance?: ConsultationRiskTolerance;
  };

  readonly patternRecognition?: PatternRecognitionResult;
  readonly timingJudgement?: TimingJudgement;
  readonly remedyPlan?: RemedyPlan;

  readonly followUp: {
    readonly allowed: boolean;
    readonly alreadyAsked: boolean;
    readonly question?: string;
    readonly reason?: string;
  };

  readonly responsePlan?: ConsultationResponsePlan;
};

const DEFAULT_SESSION_ID = "anonymous-consultation-session";

export function isExactFactIntent(primary: ConsultationIntentPrimary): boolean {
  return primary === "exact_fact";
}

export function createDefaultConsultationIntent(
  question: string,
  override?: Partial<ConsultationState["intent"]>,
): ConsultationState["intent"] {
  const inferredPrimary = inferBootstrapIntent(question);
  const primary = override?.primary ?? inferredPrimary;

  return {
    primary,
    secondary: override?.secondary ?? [],
    needsChart: override?.needsChart ?? primary !== "emotional_support",
    needsFollowUp: override?.needsFollowUp ?? false,
  };
}

export function createDefaultLifeStory(): ConsultationState["lifeStory"] {
  return {};
}

export function createDefaultEmotionalState(): ConsultationState["emotionalState"] {
  return {};
}

export function createDefaultCulturalFamilyContext(): ConsultationState["culturalFamilyContext"] {
  return {};
}

export function createDefaultPracticalConstraints(): ConsultationState["practicalConstraints"] {
  return {};
}

export function createDefaultFollowUpState(
  intent: ConsultationState["intent"],
): ConsultationState["followUp"] {
  return {
    allowed: !isExactFactIntent(intent.primary),
    alreadyAsked: false,
  };
}

export function createEmptyConsultationState(input: ConsultationInput): ConsultationState {
  const userQuestion = normalizeQuestion(input.userQuestion);
  const intent = createDefaultConsultationIntent(userQuestion, input.intent);

  const bootstrap = isExactFactIntent(intent.primary)
    ? {}
    : inferBootstrapConsultationContext(userQuestion);
  const lifeContext = isExactFactIntent(intent.primary)
    ? undefined
    : extractLifeContext({ question: userQuestion });
  const culturalContext = isExactFactIntent(intent.primary)
    ? undefined
    : extractCulturalFamilyContext({ question: userQuestion });
  const emotionalContext = isExactFactIntent(intent.primary)
    ? undefined
    : detectEmotionalState({ question: userQuestion });

  return {
    sessionId: normalizeSessionId(input.sessionId),
    userQuestion,
    intent,
    chartFacts: input.chartFacts,
    lifeStory: lifeContext
      ? {
          currentIssue: lifeContext.currentIssue ?? bootstrap.lifeStory?.currentIssue,
          lifeArea: lifeContext.lifeArea ?? bootstrap.lifeStory?.lifeArea,
          currentSituation: lifeContext.currentSituation ?? bootstrap.lifeStory?.currentSituation,
          desiredOutcome: lifeContext.desiredOutcome ?? bootstrap.lifeStory?.desiredOutcome,
          decisionType: lifeContext.decisionType ?? bootstrap.lifeStory?.decisionType,
        }
      : bootstrap.lifeStory ?? createDefaultLifeStory(),
    emotionalState: emotionalContext
      ? {
          primary: emotionalContext.primaryEmotion,
          intensity: emotionalContext.intensity,
          toneNeeded: emotionalContext.toneNeeded,
        }
      : bootstrap.emotionalState ?? createDefaultEmotionalState(),
    culturalFamilyContext: culturalContext
      ? {
          parentalPressure: culturalContext.parentalPressure,
          familyInvolved: culturalContext.familyInvolved,
          arrangedMarriageContext: culturalContext.arrangedMarriageContext,
          financialDependents: culturalContext.financialDependents,
          religiousComfort: culturalContext.religiousComfort,
        }
      : bootstrap.culturalFamilyContext ?? createDefaultCulturalFamilyContext(),
    practicalConstraints:
      bootstrap.practicalConstraints ?? createDefaultPracticalConstraints(),
    followUp: createDefaultFollowUpState(intent),
  };
}

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ");
}

function normalizeSessionId(sessionId: string | undefined): string {
  const normalized = sessionId?.trim();
  return normalized && normalized.length > 0 ? normalized : DEFAULT_SESSION_ID;
}

function inferBootstrapIntent(question: string): ConsultationIntentPrimary {
  const q = question.toLowerCase();

  if (
    /\b(lagna|ascendant|moon sign|sun sign|mahadasha|antardasha|sade sati|sadesati|nakshatra)\b/.test(q) &&
    !/\b(why|how|should|will|when will|what should|guidance|meaning|problem|stuck|worried|scared)\b/.test(q)
  ) {
    return "exact_fact";
  }

  if (/\b(remedy|remedies|mantra|puja|gemstone|stone|donate|fast)\b/.test(q)) {
    return "remedy";
  }

  if (/\b(should i|quit|leave|marry|divorce|move|relocate|start business|business)\b/.test(q)) {
    return "decision_support";
  }

  if (/\b(when|timing|period|window|phase)\b/.test(q)) {
    return "timing";
  }

  if (/\b(scared|afraid|anxious|tired|stuck|hopeless|confused|worried)\b/.test(q)) {
    return "emotional_support";
  }

  return "interpretation";
}

function inferBootstrapConsultationContext(question: string): Partial<
  Pick<
    ConsultationState,
    "lifeStory" | "emotionalState" | "culturalFamilyContext" | "practicalConstraints"
  >
> {
  const q = question.toLowerCase();

  let lifeStory: ConsultationState["lifeStory"] = createDefaultLifeStory();
  let emotionalState: ConsultationState["emotionalState"] = createDefaultEmotionalState();
  let culturalFamilyContext: ConsultationState["culturalFamilyContext"] =
    createDefaultCulturalFamilyContext();
  let practicalConstraints: ConsultationState["practicalConstraints"] =
    createDefaultPracticalConstraints();

  // Minimal Phase 1 bootstrap inference only.
  // Later extractor phases must replace this with richer deterministic modules.

  if (/\b(parent|parents|family|mother|father)\b/.test(q)) {
    culturalFamilyContext = {
      ...culturalFamilyContext,
      familyInvolved: true,
      parentalPressure: /\b(pressure|pressuring|forcing|force|forced|insist|insisting)\b/.test(q),
    };
  }

  if (/\b(marriage|marry|proposal|partner|relationship)\b/.test(q)) {
    lifeStory = {
      ...lifeStory,
      lifeArea: /\brelationship|partner\b/.test(q) ? "relationship" : "marriage",
    };
  }

  if (/\b(career|job|work|manager|promotion|business)\b/.test(q)) {
    lifeStory = {
      ...lifeStory,
      lifeArea: lifeStory.lifeArea ?? "career",
    };
  }

  if (/\b(unstable|instability|not stable)\b/.test(q) && /\b(career|job|work)\b/.test(q)) {
    practicalConstraints = {
      ...practicalConstraints,
      careerInstability: true,
    };
  }

  if (/\b(scared|afraid|fear|wrong decision)\b/.test(q)) {
    emotionalState = {
      ...emotionalState,
      primary: "fear",
      intensity: "high",
      toneNeeded: "gentle",
    };
  } else if (/\b(anxious|worried|worry)\b/.test(q)) {
    emotionalState = {
      ...emotionalState,
      primary: "anxiety",
      intensity: "medium",
      toneNeeded: "reassuring",
    };
  }

  if (
    /\b(parent|parents)\b/.test(q) &&
    /\b(pressure|pressuring|forcing|force|forced)\b/.test(q) &&
    /\b(marriage|marry|proposal)\b/.test(q) &&
    /\b(career|job|work)\b/.test(q) &&
    /\b(unstable|instability|not stable)\b/.test(q)
  ) {
    lifeStory = {
      ...lifeStory,
      lifeArea: "marriage",
      currentIssue: "marriage pressure while career feels unstable",
      decisionType: "marriage_readiness",
    };
  }

  if (
    Object.keys(lifeStory).length === 0 &&
    Object.keys(emotionalState).length === 0 &&
    Object.keys(culturalFamilyContext).length === 0 &&
    Object.keys(practicalConstraints).length === 0
  ) {
    return {};
  }

  return {
    lifeStory,
    emotionalState,
    culturalFamilyContext,
    practicalConstraints,
  };
}
