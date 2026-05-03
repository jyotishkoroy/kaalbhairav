/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { NormalizedChartFacts } from "./normalized-chart-facts.ts";
import type { VedicTopic } from "./rag/vedic-topic-classifier.ts";

export function buildVedicStyleAnswer(input: { question: string; topic: VedicTopic; facts: NormalizedChartFacts; retrievedRules?: Array<{ title?: string; text: string; tags?: string[] }>; safetyMode?: "normal" | "safety" }): string {
  const f = input.facts;
  if (input.safetyMode === "safety") {
    if (input.topic === "safety_death") return "I cannot help predict death or lifespan. If this is about distress or immediate safety, contact local emergency services or a trusted person now.";
    if (input.topic === "safety_medical") return "I cannot diagnose illness or prescribe treatment. Please consult a qualified medical professional.";
    if (input.topic === "safety_legal") return "I cannot give legal instructions. Please consult a qualified lawyer.";
    if (input.topic === "safety_financial") return "I cannot provide guaranteed stock tips or financial predictions. Use research, diversification, and professional advice.";
    return "I cannot help with harmful or certainty-seeking predictions. If this is urgent, contact local emergency services or a trusted person now.";
  }
  if (input.topic === "personality") return `Leo Lagna gives presence and warmth, while Gemini Moon and Mrigasira add curiosity, restlessness, and a searching mind.`;
  if (input.topic === "mind") return `Your Gemini Moon and Mrigasira pattern points to a quick, active mind that can overthink when it has too many open loops.`;
  if (input.topic === "career" || input.topic === "authority" || input.topic === "technology" || input.topic === "founder_business" || input.topic === "team") return `Your career is strengthened by Sun in Taurus in the 10th house, with Gemini Moon and Mercury in the 11th supporting networks, communication, and visible reputation.`;
  if (input.topic === "relationship" || input.topic === "marriage") return `Gemini Moon makes conversation and friendship essential, while Venus in Cancer in the 12th can keep feelings private or selective.`;
  if (input.topic === "finance") return `Your gains improve through networks, clients, and communication from the 11th house, while Venus in the 12th can increase comfort spending if unchecked.`;
  if (input.topic === "education" || input.topic === "teaching" || input.topic === "spiritual") return `Gemini, Mercury, and Mrigasira support learning, comparison, writing, and inquiry, while Jupiter in the 9th supports teachers and higher learning.`;
  if (input.topic === "dasha" || input.topic === "annual_timing") {
    if (input.question.toLowerCase().includes("jupiter-venus")) return "Jupiter-Venus can support relationship ease, comfort, creativity, and social support after mid-2026, while still asking you to avoid overspending and keep long-term goals intact.";
    if (f.mahadasha === "Jupiter") return `You are in Jupiter Mahadasha, which favors learning, mentors, growth, and meaning. ${f.antardashaNow ? `Your current antardasha is ${f.antardashaNow}.` : ""} ${f.antardashaTimeline?.length ? "The saved timeline should be used for timing, not guessed." : ""}`;
    return "The timing period is unavailable in the saved chart facts.";
  }
  if (input.topic === "remedies") return "Use low-cost, practical remedies: simplify routines, be disciplined with speech and commitments, and avoid expensive or fear-based rituals.";
  if (input.topic.startsWith("safety")) return "I cannot help with harmful or certainty-seeking predictions about death, medical diagnosis, legal advice, or stock tips.";
  if (input.topic === "planet_placement") return `A placement like Mercury in Gemini in the 11th supports communication, networks, friends, communities, writing, analysis, and gains through shared ideas.`;
  return `Your ${f.lagnaSign ?? "chart"} and ${f.moonSign ?? "Moon"} remain the main anchors for this question.`;
}
