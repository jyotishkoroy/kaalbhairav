/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { buildPublicChartFacts, validatePublicChartFacts, type PublicChartFacts } from "../public-chart-facts.ts";
import { answerExactChartFactQuestion, answerExactFactFromPublicFacts } from "../exact-chart-facts.ts";
import { classifyVedicTopic } from "../rag/vedic-topic-classifier.ts";
import { buildAstroAnswerPlan } from "../answer-plan/astro-answer-plan.ts";
import { renderAstroAnswerPlan } from "../answer-plan/astro-answer-renderer.ts";
import { classifySafety } from "../answer-plan/astro-answer-policy.ts";
import { finalizeAstroAnswer } from "../finalize-astro-answer.ts";
import { buildAstroChartContext } from "../chart-context.ts";

export async function answerCanonicalAstroQuestion(input: {
  question: string;
  userId: string;
  profileId: string;
  chartVersionId: string;
  chartJson: unknown;
  predictionSummary?: unknown;
  publicChartFacts?: PublicChartFacts;
  aboutSelf?: string;
  requestId?: string;
}): Promise<{ answer: string }> {
  // Safety precheck
  const safety = classifySafety(input.question);
  if (safety.blocked) return { answer: safety.answer! };

  // Use provided facts or build them
  const facts: PublicChartFacts = input.publicChartFacts ?? buildPublicChartFacts({
    profileId: input.profileId,
    chartVersionId: input.chartVersionId,
    chartJson: input.chartJson,
    predictionSummary: input.predictionSummary,
  });

  // Validate facts
  const valid = validatePublicChartFacts(facts);
  if (!valid.ok) {
    return { answer: "aadesh: Your birth chart context needs recalculation before I can answer this reliably. Please update your birth details once and try again." };
  }

  const exactPublic = answerExactFactFromPublicFacts(input.question, facts);
  if (exactPublic.matched) {
    return { answer: exactPublic.answer };
  }

  // Exact fact detection via legacy chart context path
  const chartContext = buildAstroChartContext({ profileId: input.profileId, chartVersionId: input.chartVersionId, chartJson: input.chartJson, predictionSummary: input.predictionSummary });
  if (chartContext.ready) {
    const exact = answerExactChartFactQuestion({ question: input.question, chartContext });
    if (exact.matched) {
      const finalized = finalizeAstroAnswer({ answer: exact.answer, facts });
      return { answer: finalized.answer };
    }
  }

  // Topic classification and dynamic answer plan
  const topic = classifyVedicTopic(input.question);
  const plan = buildAstroAnswerPlan({ question: input.question, topic, facts });
  const drafted = renderAstroAnswerPlan(plan);

  // Finalize: sanitize, check consistency, ensure no leaks
  const finalized = finalizeAstroAnswer({ answer: drafted, facts });
  return { answer: finalized.answer };
}
