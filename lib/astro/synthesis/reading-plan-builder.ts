/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ReadingPlan, ReadingPlanBuilderInput, InternalReadingPlan } from "./reading-plan-types";
import { applyReadingPlanSafetyPolicy, buildReadingPlanLimitations, determineReadingPlanMode, normalizeReadingPlanTopic, sanitizeReadingPlanText, shouldIncludeRemedies } from "./reading-plan-policy";

function topicLabel(topic: string): string {
  if (topic === "general") return "general";
  if (topic === "safety") return "safety";
  return topic;
}

function sanitizeChartAnchor(value: string, maxLength = 80): string {
  const cleaned = String(value ?? "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[`*#>]/g, " ")
    .replace(/\b(?:sk-|rk-|pk-|token|secret|api[_-]?key)[a-z0-9._-]*\b/gi, "[REDACTED]")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength).trim() : cleaned;
}

function dedupeArray(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of values) {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function buildLivedExperience(topic: string, question: string): string[] {
  if (topic === "career") return ["Effort is often not visible immediately.", "Recognition can arrive later than the work itself.", "Pressure from authority can make progress feel slower than it is."];
  if (topic === "marriage" || topic === "relationship") return ["Delay or confusion does not automatically mean rejection.", "Clarity often improves when pressure is reduced.", "Small misunderstandings can feel larger when emotions are high."];
  if (topic === "money") return ["Money anxiety often comes from wanting stability.", "Practical planning matters more than fear.", "Short-term stress can hide longer-term improvement."];
  if (topic === "sleep" || topic === "health") return ["Restlessness usually needs grounding and routine.", "Health questions should stay within non-medical support.", "Simple consistency is often more useful than dramatic action."];
  if (topic === "education") return ["Consistency matters more than intense bursts.", "Uncertainty can settle through repetition.", "Progress may be slower than expected but still real."];
  if (topic === "family") return ["Family pressure often mixes care with boundaries.", "Emotional load can make every issue feel bigger.", "Boundary-setting can be both kind and firm."];
  if (/what will happen|too broad|unclear/i.test(question)) return ["A general question needs clarification before a deep reading.", "More context will produce a safer and more useful answer."];
  return ["The reading should stay grounded in what is actually known.", "A cautious interpretation is better than a forced conclusion."];
}

function buildLessonPattern(topic: string): { pattern: string; nonFatalisticMeaning: string } {
  if (topic === "career") return { pattern: "delay and pressure often test patience", nonFatalisticMeaning: "the chart can point to timing friction without denying eventual movement" };
  if (topic === "marriage" || topic === "relationship") return { pattern: "emotional delay does not equal permanent refusal", nonFatalisticMeaning: "slow periods can still lead to clearer choices and steadier connection" };
  if (topic === "money") return { pattern: "stability grows through discipline", nonFatalisticMeaning: "money pressure can be managed without assuming a fixed fate" };
  if (topic === "sleep" || topic === "health") return { pattern: "rest needs repetition and care", nonFatalisticMeaning: "uneasy periods can improve through grounding routines" };
  return { pattern: "uncertainty asks for restraint", nonFatalisticMeaning: "the chart can guide reflection without forcing a fixed outcome" };
}

function buildPracticalGuidance(topic: string, mode: ReadingPlan["mode"]): string[] {
  if (mode === "follow_up") return ["Ask one specific clarifying question before going deeper."];
  if (topic === "career") return ["Keep a written list of visible work and outcomes.", "Focus on one concrete next step this week."];
  if (topic === "marriage" || topic === "relationship") return ["Reduce pressure and ask for clarity directly.", "Notice whether the issue is timing, readiness, or communication."];
  if (topic === "money") return ["Separate short-term stress from long-term planning.", "Make one practical budget or savings action."];
  if (topic === "sleep" || topic === "health") return ["Keep a consistent sleep and wake routine.", "Use grounding habits and seek medical help for symptoms."];
  if (topic === "education") return ["Use a fixed study block and repeat it daily.", "Track progress in small, visible units."];
  if (topic === "family") return ["State one boundary clearly and calmly.", "Do not carry the whole conflict alone."];
  return ["Stay with the facts you already have.", "Choose one grounded action rather than many speculative ones."];
}

function buildRemedies(input: ReadingPlanBuilderInput, topic: string): ReadingPlan["remedies"] {
  const decision = shouldIncludeRemedies(input);
  if (!decision.include) return { include: false, reason: decision.reason, spiritual: [], behavioral: [], practical: [], inner: [] };
  const safeRemedies = input.remedyContext?.safeRemediesAvailable !== false;
  return {
    include: safeRemedies,
    reason: decision.reason,
    spiritual: topic === "sleep" || topic === "health" ? ["Optional short prayer or mantra for calm."] : ["Optional prayer or mantra for steadiness."],
    behavioral: ["Keep the remedy optional and low-pressure.", "Use a simple routine rather than escalating cost."],
    practical: ["Choose one small action that is sustainable.", "Avoid expensive or forced ritual commitments."],
    inner: ["Stay calm and avoid fear-based interpretation.", "Use the remedy only as support, not certainty."],
  };
}

function buildSafetyBoundaries(input: ReadingPlanBuilderInput, topic: string): string[] {
  const boundaries = new Set<string>(input.safetyRestrictions ?? []);
  for (const risk of input.concern?.safetyRisks ?? []) {
    if (risk === "medical") boundaries.add("Do not diagnose medical conditions or replace a clinician.");
    if (risk === "legal") boundaries.add("Do not give legal advice or guaranteed legal outcomes.");
    if (risk === "financial_guarantee") boundaries.add("Do not provide financial guarantees.");
    if (risk === "death_lifespan") boundaries.add("Do not predict death dates or lifespan.");
    if (risk === "pregnancy") boundaries.add("Do not predict pregnancy or baby health outcomes.");
    if (risk === "self_harm") boundaries.add("Provide crisis support and avoid astrology-based self-harm guidance.");
    if (risk === "curse_fear") boundaries.add("Do not reinforce curse or doom language.");
    if (risk === "expensive_remedy_pressure") boundaries.add("Do not pressure expensive puja or remedy spending.");
    if (risk === "deterministic_prediction") boundaries.add("Do not make deterministic guarantees.");
  }
  if (topic === "health" || topic === "sleep") boundaries.add("Do not substitute astrology for medical care.");
  return [...boundaries];
}

function buildReassurance(topic: string, mode: ReadingPlan["mode"]): ReadingPlan["reassurance"] {
  if (mode === "follow_up") return { closingLine: "Once you clarify the question, I can keep the reading more accurate and useful.", avoidFalseCertainty: true };
  if (mode === "safety") return { closingLine: "I’ll keep this bounded and focused on safe support rather than prediction.", avoidFalseCertainty: true };
  if (topic === "career") return { closingLine: "The pattern can improve without forcing certainty.", avoidFalseCertainty: true };
  if (topic === "marriage" || topic === "relationship") return { closingLine: "Delay or uncertainty does not rule out a better outcome.", avoidFalseCertainty: true };
  if (topic === "sleep" || topic === "health") return { closingLine: "Keep the reading supportive and practical, not medical.", avoidFalseCertainty: true };
  return { closingLine: "I’ll keep the reading grounded and avoid pretending certainty where it does not exist.", avoidFalseCertainty: true };
}

function pruneRepeatedSentenceFragments(lines: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const line of lines) {
    const normalized = sanitizeReadingPlanText(line, 260).replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function buildInternalReadingPlan(): InternalReadingPlan {
  return {
    internalGuidance: [],
    validatorHints: [],
    safetyPolicy: [],
    evidencePolicy: [],
    memoryPolicy: [],
  };
}

export function buildReadingPlan(input: ReadingPlanBuilderInput): ReadingPlan {
  const question = sanitizeReadingPlanText(input.question, 240);
  const topic = normalizeReadingPlanTopic(input.listening?.topic ?? input.concern?.topic ?? question);
  const mode = determineReadingPlanMode(input);
  const listening = input.listening;
  const evidence = (input.evidence ?? []).map((item) => ({
    id: sanitizeReadingPlanText(item.id, 80),
    label: sanitizeReadingPlanText(item.label, 120),
    explanation: sanitizeReadingPlanText(item.explanation, 220),
    confidence: item.confidence ?? "medium",
    source: item.source ?? "chart",
  }));
  const chartAnchors = dedupeArray((input.chartAnchors ?? []).map((anchor) => sanitizeChartAnchor(anchor, 80))).slice(0, 12);
  const plan: ReadingPlan = {
    question,
    topic,
    mode,
    acknowledgement: {
      emotionalContext: sanitizeReadingPlanText(listening?.userSituationSummary ?? `User is asking about ${topicLabel(topic)}.`, 220),
      userNeed: sanitizeReadingPlanText(listening?.emotionalNeed ?? input.concern?.mode ?? "clarity", 120),
      openingLine: sanitizeReadingPlanText(listening?.acknowledgementHint ?? "I’m listening carefully and will stay grounded.", 220),
    },
    chartTruth: {
      evidence,
      chartAnchors,
      limitations: buildReadingPlanLimitations(input),
    },
    livedExperience: buildLivedExperience(topic, question),
    lessonPattern: buildLessonPattern(topic),
    practicalGuidance: buildPracticalGuidance(topic, mode),
    remedies: buildRemedies(input, topic),
    safetyBoundaries: buildSafetyBoundaries(input, topic),
    reassurance: buildReassurance(topic, mode),
    followUp: listening?.shouldAskFollowUp || mode === "follow_up" ? {
      question: sanitizeReadingPlanText(listening?.followUpQuestion ?? "What specific part of the situation should I focus on?", 180),
      reason: "The question is too broad or missing context for a deeper reading.",
    } : undefined,
    memoryUse: input.memorySummary ? { used: true, summary: sanitizeReadingPlanText(input.memorySummary, 260), warnings: [] } : { used: false },
    internalPlan: buildInternalReadingPlan(),
  };
  if (!plan.chartTruth.evidence.length && topic !== "safety") {
    plan.chartTruth.limitations = [...new Set([...plan.chartTruth.limitations, "No direct chart evidence was provided, so the plan must stay cautious and non-committal."])];
  }
  if (!input.timingContext?.timingSourceAvailable) {
    plan.chartTruth.limitations = [...new Set([...plan.chartTruth.limitations, "No grounded timing source is available, so date or window claims are prohibited."])];
  } else if (input.timingContext.allowedTimingDescription) {
    plan.chartTruth.limitations = [...new Set([...plan.chartTruth.limitations, sanitizeReadingPlanText(input.timingContext.allowedTimingDescription, 200)])];
  }
  if (input.birthContext?.hasBirthTime === false) plan.chartTruth.limitations = [...new Set([...plan.chartTruth.limitations, "Birth time is missing, so timing precision is limited."])];
  if (input.birthContext?.hasBirthDate === false) plan.chartTruth.limitations = [...new Set([...plan.chartTruth.limitations, "Birth date is missing, so chart precision is limited."])];
  if (input.birthContext?.hasBirthPlace === false) plan.chartTruth.limitations = [...new Set([...plan.chartTruth.limitations, "Birth place is missing, so chart precision is limited."])];
  if (mode === "timing" && !input.timingContext?.timingSourceAvailable) {
    plan.safetyBoundaries = [...new Set([...plan.safetyBoundaries, "Do not provide exact timing without a grounded timing source."])];
  }
  if (mode === "exact_fact") {
    plan.livedExperience = [];
    plan.practicalGuidance = plan.practicalGuidance.slice(0, 1);
  }
  if (mode === "follow_up" && !plan.followUp) plan.followUp = { question: "What specific part should I focus on?", reason: "The question needs clarification." };
  if (topic === "safety") {
    plan.practicalGuidance = ["Focus on safety and immediate support rather than prediction."];
    plan.remedies.include = false;
  }
  plan.livedExperience = pruneRepeatedSentenceFragments(plan.livedExperience);
  plan.practicalGuidance = pruneRepeatedSentenceFragments(plan.practicalGuidance);
  plan.safetyBoundaries = pruneRepeatedSentenceFragments(plan.safetyBoundaries);
  return applyReadingPlanSafetyPolicy(plan, input);
}
