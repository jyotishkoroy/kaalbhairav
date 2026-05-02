/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ConsultationConfidence, ConsultationLifeArea } from "./consultation-types";
import type { ConsultationState } from "./consultation-state";

export type LifeContextInput = {
  readonly question: string;
  readonly previousEphemeralContext?: ConsultationState;
};

export type LifeContextFact = {
  readonly fact: string;
  readonly domain: string;
  readonly confidence: ConsultationConfidence;
};

export type LifeContextExtraction = {
  readonly lifeArea?: ConsultationLifeArea;
  readonly currentIssue?: string;
  readonly currentSituation?: string;
  readonly decisionType?: string;
  readonly desiredOutcome?: string;
  readonly extractedFacts: readonly LifeContextFact[];
  readonly missingCriticalContext: readonly string[];
};

type MutableExtraction = {
  lifeArea?: ConsultationLifeArea;
  currentIssue?: string;
  currentSituation?: string;
  decisionType?: string;
  desiredOutcome?: string;
  extractedFacts: LifeContextFact[];
  missingCriticalContext: Set<string>;
};

const EMPTY_RESULT: LifeContextExtraction = {
  extractedFacts: [],
  missingCriticalContext: [],
};

export function extractLifeContext(input: LifeContextInput): LifeContextExtraction {
  const normalizedQuestion = normalizeQuestion(input.question);
  const q = normalizedQuestion.toLowerCase();

  if (normalizedQuestion.length === 0) {
    return withMissing(["user question"]);
  }

  const result: MutableExtraction = {
    extractedFacts: [],
    missingCriticalContext: new Set<string>(),
  };

  const previousArea = input.previousEphemeralContext?.lifeStory.lifeArea;
  const previousIssue = input.previousEphemeralContext?.lifeStory.currentIssue;
  const familyPressureMarriage =
    /\b(parents?|family|mother|father)\b/.test(q) &&
    /\b(pressure|pressuring|forcing|forced|insist)\b/.test(q) &&
    /\b(marriage|marry|married|proposal)\b/.test(q);

  if (familyPressureMarriage || isMarriageContext(q, previousArea)) {
    inferMarriageContext(result, q, normalizedQuestion);
  } else if (isCareerContext(q)) {
    inferCareerContext(result, q, normalizedQuestion);
  } else if (isRelationshipContext(q)) {
    inferRelationshipContext(result, q, normalizedQuestion);
  } else if (isMoneyContext(q)) {
    inferMoneyContext(result);
  } else if (isFamilyContext(q)) {
    inferFamilyContext(result, q);
  } else if (isHealthContext(q)) {
    inferHealthContext(result);
  } else if (isSpiritualContext(q)) {
    inferSpiritualContext(result);
  } else if (previousArea && looksLikeShortFollowUp(q)) {
    result.lifeArea = previousArea;
    if (previousIssue) result.currentIssue = previousIssue;
    if (previousArea === "career" && /\b(should i|leave|stay|quit|resign|switch)\b/.test(q)) {
      result.decisionType = "job_switch_or_stay";
    }
    addMissing(result, "more context about the current situation");
  } else {
    result.lifeArea = "general";
    if (/\b(stuck|confused|torn|unsure|worried|pressure)\b/.test(q)) {
      result.currentIssue = "general life concern";
      addFact(result, "User reports a general life concern", "general", "medium");
    }
  }

  return {
    lifeArea: result.lifeArea,
    currentIssue: result.currentIssue,
    currentSituation: result.currentSituation,
    decisionType: result.decisionType,
    desiredOutcome: result.desiredOutcome,
    extractedFacts: result.extractedFacts,
    missingCriticalContext: Array.from(result.missingCriticalContext),
  };
}

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ");
}

function addFact(result: MutableExtraction, fact: string, domain: string, confidence: ConsultationConfidence): void {
  if (!result.extractedFacts.some((entry) => entry.fact === fact)) {
    result.extractedFacts.push({ fact, domain, confidence });
  }
}

function addMissing(result: MutableExtraction, ...items: string[]): void {
  for (const item of items) result.missingCriticalContext.add(item);
}

function withMissing(items: string[]): LifeContextExtraction {
  return { ...EMPTY_RESULT, missingCriticalContext: items };
}

function looksLikeShortFollowUp(q: string): boolean {
  return q.length <= 40 || /\b(should i|leave|stay|what about it|and now|what now)\b/.test(q);
}

function isCareerContext(q: string): boolean {
  return /\b(job|career|work|workplace|manager|boss|promotion|salary|appraisal|switch|resign|quit|business|startup|client|interview)\b/.test(q);
}

function isMarriageContext(q: string, previousArea?: ConsultationLifeArea): boolean {
  return (
    /\b(marriage|marry|married|wedding|proposal|arranged|match|spouse|husband|wife|settle down|get married)\b/.test(q) ||
    (previousArea === "marriage" && /\b(should i|say yes|this proposal|specific person)\b/.test(q))
  );
}

function isRelationshipContext(q: string): boolean {
  return /\b(relationship|partner|boyfriend|girlfriend|ex|dating|love|commitment|breakup|unavailable people|emotionally unavailable)\b/.test(q);
}

function isMoneyContext(q: string): boolean {
  return /\b(money|finance|financial|savings|debt|loan|income|investment|expenses|wealth)\b/.test(q);
}

function isFamilyContext(q: string): boolean {
  return /\b(parents|family|mother|father|in-laws|siblings|home|family duty|responsibility at home)\b/.test(q);
}

function isHealthContext(q: string): boolean {
  return /\b(health|illness|disease|sleep|doctor|medical|hospital|health anxiety|worried about my health)\b/.test(q);
}

function isSpiritualContext(q: string): boolean {
  return /\b(spiritual|spirituality|god|prayer|sadhana|mantra|puja|devotion|temple|meditation)\b/.test(q);
}

function inferCareerContext(result: MutableExtraction, q: string, rawQuestion: string): void {
  result.lifeArea = "career";

  const hasManagerBlock = /\b(manager|boss)\b/.test(q) && /\b(block|blocking|stuck|stopping|hinder)\b/.test(q);
  const hasPromotion = /\b(promotion|promoted|appraisal)\b/.test(q) || /\b(stuck in my job|career stuck)\b/.test(q);
  const hasSwitch = /\b(leave|quit|resign|switch jobs|switch job|job switch)\b/.test(q);
  const hasBusiness = /\b(quit my job and start my own business|start my own business|start business|startup|business transition)\b/.test(q);

  if (hasManagerBlock) {
    result.currentIssue = "career blockage by manager";
    result.currentSituation = "user feels blocked at work";
    result.decisionType = hasSwitch ? "job_switch_or_stay" : "career_blockage";
    result.desiredOutcome = "growth and recognition";
    addFact(result, "User feels blocked by manager", "career", "high");
    addMissing(result, "whether user has another offer", "financial runway", "whether the issue is promotion, job switch, or business");
  } else if (hasBusiness) {
    result.currentIssue = "job versus business transition decision";
    result.currentSituation = "user is weighing employment against entrepreneurship";
    result.decisionType = "business_transition";
    result.desiredOutcome = "independent work and stable growth";
    addFact(result, "User is considering starting a business", "career", "high");
    addMissing(result, "whether the business has been tested with real customers", "financial runway", "family or dependent obligations");
  } else if (hasSwitch) {
    result.currentIssue = "career decision about staying or leaving";
    result.currentSituation = rawQuestion;
    result.decisionType = "job_switch_or_stay";
    result.desiredOutcome = "growth and recognition";
    addFact(result, "User is considering leaving or switching jobs", "career", "high");
    addMissing(result, "whether user has another offer", "financial runway", "whether the issue is promotion, job switch, or business");
  } else if (hasPromotion) {
    result.currentIssue = "career stagnation or promotion anxiety";
    result.currentSituation = "user is waiting for recognition at work";
    result.desiredOutcome = "growth and recognition";
    addFact(result, "User reports promotion anxiety or career stagnation", "career", "high");
    if (/\b(should i|leave|quit|resign|switch)\b/.test(q)) {
      result.decisionType = "job_switch_or_stay";
      addMissing(result, "whether user has another offer", "financial runway", "whether the issue is promotion, job switch, or business");
    }
  } else {
    result.currentIssue = "career concern";
    addFact(result, "User reports a career concern", "career", "medium");
  }
}

function inferMarriageContext(result: MutableExtraction, q: string, rawQuestion: string): void {
  result.lifeArea = "marriage";

  const unreadiness = /\b(not ready|unready|unsure|scared|afraid|wrong decision)\b/.test(q);
  const parentalPressure =
    /\b(parents?|family)\b/.test(q) &&
    /\b(pressure|pressuring|forcing|forced|insist)\b/.test(q) &&
    /\b(marriage|marry|proposal)\b/.test(q);

  if (parentalPressure || (/\b(parents?|family)\b/.test(q) && /\b(marriage|marry|proposal)\b/.test(q))) {
    result.currentIssue = "family pressure for marriage despite inner unreadiness";
    result.decisionType = "marriage_readiness";
    result.desiredOutcome = "clarity and reduced pressure";
    if (parentalPressure) {
      addFact(result, "Parents are pressuring user for marriage", "family", "high");
    }
    if (unreadiness) {
      addFact(result, "User does not feel ready for marriage", "marriage", "high");
    }
  } else {
    result.currentIssue = "marriage concern";
    addFact(result, "User reports a marriage concern", "marriage", "medium");
  }

  if (unreadiness && !result.extractedFacts.some((fact) => fact.fact === "User does not feel ready for marriage")) {
    addFact(result, "User does not feel ready for marriage", "marriage", "high");
  }
  if (rawQuestion.toLowerCase().includes("pressure") && !result.extractedFacts.some((fact) => fact.fact === "Parents are pressuring user for marriage")) {
    addFact(result, "Parents are pressuring user for marriage", "family", "high");
  }
}

function inferRelationshipContext(result: MutableExtraction, q: string, rawQuestion: string): void {
  result.lifeArea = "relationship";
  result.currentIssue = "relationship uncertainty";
  result.decisionType = "relationship_continue_or_end";
  addFact(result, "User reports relationship uncertainty", "relationship", "medium");
  addMissing(result, "whether the issue is commitment, compatibility, trust, distance, or family approval");
  if (/\b(break up|breakup|should i continue|should i stay)\b/.test(q)) {
    result.currentSituation = rawQuestion;
  }
}

function inferMoneyContext(result: MutableExtraction): void {
  result.lifeArea = "money";
  result.currentIssue = "financial stress or money pressure";
  result.decisionType = "financial_stability_guidance";
  result.desiredOutcome = "financial stability and clarity";
  addFact(result, "User reports money stress", "money", "high");
  addMissing(result, "whether the pressure is from income, debt, expenses, family duty, or investment risk");
}

function inferFamilyContext(result: MutableExtraction, q: string): void {
  result.lifeArea = "family";
  result.currentIssue = "family duty versus personal desire";
  result.decisionType = "family_responsibility_decision";
  addFact(result, "User reports family duty conflict", "family", "high");
  addMissing(result, "whether the conflict is about career, marriage, money, relocation, or caregiving");
  if (/\b(parents?|mother|father|family)\b/.test(q) && /\b(pressure|responsibility|duty|obligation)\b/.test(q)) {
    result.currentSituation = "family responsibility is affecting personal choices";
  }
}

function inferHealthContext(result: MutableExtraction): void {
  result.lifeArea = "health";
  result.currentIssue = "health anxiety or health-related concern";
  result.decisionType = "health_reflection";
  addFact(result, "User is worried about health", "health", "high");
  addMissing(result, "whether user has already consulted a qualified medical professional");
}

function inferSpiritualContext(result: MutableExtraction): void {
  result.lifeArea = "spirituality";
  result.currentIssue = "spiritual confusion or loss of direction";
  result.decisionType = "spiritual_clarity";
  result.desiredOutcome = "inner clarity and steadiness";
  addFact(result, "User reports spiritual confusion", "spirituality", "high");
  addMissing(result, "whether user wants practical guidance, devotional guidance, or chart-based spiritual context");
}
