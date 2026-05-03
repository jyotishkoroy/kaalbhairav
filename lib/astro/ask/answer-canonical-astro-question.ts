/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { buildAstroChartContext } from "../chart-context.ts";
import { answerExactChartFactQuestion } from "../exact-chart-facts.ts";
import { ensureChartGroundedAnswer } from "../answer-grounding.ts";
import { classifyVedicTopic } from "../rag/vedic-topic-classifier.ts";
import { buildVedicRetrievalQuery } from "../rag/vedic-retrieval-query.ts";
import { buildVedicStyleAnswer } from "../vedicqa-style-answer.ts";

export async function answerCanonicalAstroQuestion(input: { question: string; userId: string; profileId: string; chartVersionId: string; chartJson: unknown; predictionSummary?: unknown; aboutSelf?: string; requestId?: string }): Promise<{ answer: string }> {
  if (/(death|lifespan|suicide|self-harm)/i.test(input.question)) return { answer: "aadesh: I cannot help predict an exact death date or lifespan. If this is about safety or distress, please contact local emergency services or a trusted person right now." };
  const chartContext = buildAstroChartContext({ profileId: input.profileId, chartVersionId: input.chartVersionId, chartJson: input.chartJson, predictionSummary: input.predictionSummary });
  if (!chartContext.ready) return { answer: "aadesh: Your birth chart context is not ready yet. Please update your birth details once so Tarayai can calculate your chart before answering." };
  const exact = answerExactChartFactQuestion({ question: input.question, chartContext });
  if (exact.matched) return { answer: exact.answer };
  const topic = classifyVedicTopic(input.question);
  const retrievalQuery = buildVedicRetrievalQuery({ question: input.question, topic, chartFacts: chartContext.publicFacts });
  const answer = buildVedicStyleAnswer({ question: input.question, topic, facts: chartContext.normalizedFacts, safetyMode: topic.startsWith("safety") || topic === "security" ? "safety" : "normal" });
  return { answer: ensureChartGroundedAnswer({ answer: `aadesh: ${chartContext.basisLine} ${answer} Retrieval cue: ${retrievalQuery}.`, chartContext }) };
}
