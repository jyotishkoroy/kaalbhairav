/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ConsultationEmotionalPrimary, ConsultationToneNeeded } from "./consultation-types";

export type EmotionalStateInput = {
  readonly question: string;
};

export type EmotionalSafetyFlag =
  | "avoid_fear_language"
  | "avoid_absolute_prediction"
  | "avoid_harsh_karma_language"
  | "suggest_professional_support";

export type EmotionalStateResult = {
  readonly primaryEmotion: ConsultationEmotionalPrimary;
  readonly secondaryEmotions: readonly string[];
  readonly intensity: "low" | "medium" | "high";
  readonly toneNeeded: ConsultationToneNeeded;
  readonly safetyFlags: readonly EmotionalSafetyFlag[];
};

type EmotionKey = Exclude<ConsultationEmotionalPrimary, "neutral">;
type ScoreMap = Record<EmotionKey, number>;

const EMOTION_ORDER: readonly EmotionKey[] = [
  "grief",
  "fear",
  "exhaustion",
  "anxiety",
  "anger",
  "comparison",
  "confusion",
  "hope",
];

export function detectEmotionalState(input: EmotionalStateInput): EmotionalStateResult {
  const normalizedQuestion = normalizeQuestion(input.question);
  const q = normalizedQuestion.toLowerCase();

  if (normalizedQuestion.length === 0) {
    return createNeutralState();
  }

  const scores: ScoreMap = {
    fear: 0,
    anxiety: 0,
    confusion: 0,
    grief: 0,
    anger: 0,
    hope: 0,
    comparison: 0,
    exhaustion: 0,
  };

  const secondarySignals = new Set<string>();
  const skeptical = hasAny(q, SKEPTICAL_PATTERNS);
  const severeDistress = hasAny(q, SEVERE_DISTRESS_PATTERNS);

  scoreEmotion(scores, "fear", q, FEAR_STRONG, FEAR_MILD);
  scoreEmotion(scores, "anxiety", q, ANXIETY_STRONG, ANXIETY_MILD);
  scoreEmotion(scores, "confusion", q, CONFUSION_STRONG, CONFUSION_MILD);
  scoreEmotion(scores, "grief", q, GRIEF_STRONG, GRIEF_MILD);
  scoreEmotion(scores, "anger", q, ANGER_STRONG, ANGER_MILD);
  scoreEmotion(scores, "hope", q, HOPE_STRONG, HOPE_MILD);
  scoreEmotion(scores, "comparison", q, COMPARISON_STRONG, COMPARISON_MILD);
  scoreEmotion(scores, "exhaustion", q, EXHAUSTION_STRONG, EXHAUSTION_MILD);

  if (/\bstuck\b/.test(q)) {
    secondarySignals.add("stagnation");
    secondarySignals.add("anxiety");
  }
  if (/\b(am i lovable|why not me|everyone around me|behind in life)\b/.test(q)) {
    secondarySignals.add("self-worth pressure");
    secondarySignals.add("anxiety");
  }
  if (/\b(running out of time|now|immediately|urgent)\b/.test(q)) {
    secondarySignals.add("urgency");
    secondarySignals.add("fear");
  }
  if (/\b(tired of waiting|will i ever get married)\b/.test(q)) {
    secondarySignals.add("anxiety");
  }
  if (skeptical) {
    secondarySignals.add("skepticism");
  }

  if (severeDistress) {
    scores.fear = Math.max(scores.fear, 1);
    scores.grief = Math.max(scores.grief, 1);
    scores.anxiety = Math.max(scores.anxiety, 1);
    scores.exhaustion = Math.max(scores.exhaustion, 1);
  }

  const primaryEmotion = selectPrimaryEmotion(scores, severeDistress);
  const intensity = calculateIntensity(scores, severeDistress);
  const toneNeeded = selectTone(primaryEmotion, intensity, skeptical, severeDistress);
  const safetyFlags = buildSafetyFlags(primaryEmotion, intensity, severeDistress);

  const secondaryEmotions = uniqueStrings([
    ...emotionSecondaries(scores, primaryEmotion),
    ...Array.from(secondarySignals),
  ]);

  return {
    primaryEmotion,
    secondaryEmotions,
    intensity,
    toneNeeded,
    safetyFlags,
  };
}

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ");
}

function createNeutralState(): EmotionalStateResult {
  return {
    primaryEmotion: "neutral",
    secondaryEmotions: [],
    intensity: "low",
    toneNeeded: "direct",
    safetyFlags: [],
  };
}

function hasAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function scoreEmotion(
  scores: ScoreMap,
  emotion: EmotionKey,
  q: string,
  strongPatterns: readonly RegExp[],
  mildPatterns: readonly RegExp[],
): void {
  for (const pattern of strongPatterns) {
    if (pattern.test(q)) scores[emotion] += 2;
  }
  for (const pattern of mildPatterns) {
    if (pattern.test(q)) scores[emotion] += 1;
  }
}

function selectPrimaryEmotion(scores: ScoreMap, severeDistress: boolean): ConsultationEmotionalPrimary {
  if (severeDistress) {
    return scores.grief >= scores.fear && scores.grief >= scores.exhaustion ? "grief" : scores.exhaustion >= scores.fear ? "exhaustion" : "fear";
  }

  let bestEmotion: ConsultationEmotionalPrimary = "neutral";
  let bestScore = 0;
  for (const emotion of EMOTION_ORDER) {
    const score = scores[emotion];
    if (score > bestScore) {
      bestEmotion = emotion;
      bestScore = score;
    }
  }
  return bestEmotion;
}

function calculateIntensity(scores: ScoreMap, severeDistress: boolean): "low" | "medium" | "high" {
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  if (severeDistress) return "high";
  if (hasStrongDistress(scores)) return "high";
  if (totalScore >= 4) return "high";
  if (totalScore >= 2) return "medium";
  if (totalScore >= 1) return "low";
  return "low";
}

function hasStrongDistress(scores: ScoreMap): boolean {
  return scores.fear >= 2 || scores.anxiety >= 2 || scores.grief >= 2 || scores.exhaustion >= 2;
}

function selectTone(
  primaryEmotion: ConsultationEmotionalPrimary,
  intensity: "low" | "medium" | "high",
  skeptical: boolean,
  severeDistress: boolean,
): ConsultationToneNeeded {
  if (severeDistress) return "grounding";
  if (skeptical) return "analytical";
  if (primaryEmotion === "comparison") return "reassuring";
  if (primaryEmotion === "confusion") return "analytical";
  if (primaryEmotion === "anger") return "direct";
  if (primaryEmotion === "hope") return "reassuring";
  if (intensity === "high" && (primaryEmotion === "fear" || primaryEmotion === "anxiety" || primaryEmotion === "grief" || primaryEmotion === "exhaustion")) {
    return "gentle";
  }
  if (intensity === "medium" && (primaryEmotion === "fear" || primaryEmotion === "anxiety" || primaryEmotion === "grief" || primaryEmotion === "exhaustion")) {
    return "gentle";
  }
  return "direct";
}

function buildSafetyFlags(
  primaryEmotion: ConsultationEmotionalPrimary,
  intensity: "low" | "medium" | "high",
  severeDistress: boolean,
): EmotionalSafetyFlag[] {
  const flags: EmotionalSafetyFlag[] = [];
  if (primaryEmotion !== "neutral") {
    flags.push("avoid_absolute_prediction");
  }
  if (
    primaryEmotion === "fear" ||
    primaryEmotion === "anxiety" ||
    primaryEmotion === "grief" ||
    primaryEmotion === "exhaustion" ||
    primaryEmotion === "comparison" ||
    intensity === "high" ||
    severeDistress
  ) {
    flags.push("avoid_fear_language");
  }
  if (
    primaryEmotion === "fear" ||
    primaryEmotion === "anxiety" ||
    primaryEmotion === "grief" ||
    primaryEmotion === "exhaustion" ||
    intensity === "high" ||
    severeDistress
  ) {
    flags.push("avoid_harsh_karma_language");
  }
  if (severeDistress) {
    flags.push("suggest_professional_support");
  }
  return Array.from(new Set(flags));
}

function emotionSecondaries(scores: ScoreMap, primaryEmotion: ConsultationEmotionalPrimary): string[] {
  const entries = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);
  return entries
    .map(([emotion]) => emotion)
    .filter((emotion) => emotion !== primaryEmotion);
}

const FEAR_STRONG = [
  /\b(terrified|scared|afraid)\b/,
  /\b(worried i will make the wrong decision|what if|will something bad happen|destroy my life|ruin my life)\b/,
];
const FEAR_MILD = [/\b(fear|worried|will i ever get married|running out of time)\b/];

const ANXIETY_STRONG = [/\b(anxious|anxiety|panic|restless)\b/, /\b(cannot stop thinking|nervous|tension)\b/];
const ANXIETY_MILD = [/\b(worried|overthinking|stuck)\b/];

const CONFUSION_STRONG = [/\b(confused|unclear|unsure|uncertain)\b/, /\b(cannot decide|decision paralysis|lost about what to do)\b/];
const CONFUSION_MILD = [/\b(don't know|do not know|stuck between)\b/];

const GRIEF_STRONG = [/\b(grief|grieving|loss|lost someone|heartbreak|broken|devastated|mourning)\b/];
const GRIEF_MILD = [/\b(cannot move on)\b/];

const ANGER_STRONG = [/\b(angry|frustrated|furious|irritated|unfair|betrayed|fed up)\b/];
const ANGER_MILD = [/\b(blocked by)\b/];

const HOPE_STRONG = [/\b(hopeful|hope|positive|looking forward)\b/];
const HOPE_MILD = [/\b(can things improve|will things get better|possibility)\b/];

const COMPARISON_STRONG = [/\b(everyone around me|others are|all my friends|people my age|running out of time|behind in life|settled|comparison|why not me)\b/];
const COMPARISON_MILD: readonly RegExp[] = [];

const EXHAUSTION_STRONG = [/\b(tired|exhausted|drained|burnt out|burned out|no energy)\b/];
const EXHAUSTION_MILD = [/\b(cannot take it anymore|tired of waiting)\b/];

const SKEPTICAL_PATTERNS = [/\b(prove|evidence|don't believe|do not believe|skeptical|logic|rational|not mystical|explain clearly|why should i trust)\b/];

const SEVERE_DISTRESS_PATTERNS = [
  /\b(self harm|harm myself|kill myself|suicide|suicidal|end my life|no reason to live)\b/,
  /\b(unsafe|in danger|abuse|violence)\b/,
];
