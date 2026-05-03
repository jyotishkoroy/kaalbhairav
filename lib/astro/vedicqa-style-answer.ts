/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { NormalizedChartFacts } from "./normalized-chart-facts.ts";
import type { VedicTopic } from "./rag/vedic-topic-classifier.ts";

export function buildVedicStyleAnswer(input: {
  question: string;
  topic: VedicTopic;
  facts: NormalizedChartFacts;
  retrievedRules?: Array<{ title?: string; text: string; tags?: string[] }>;
  safetyMode?: "normal" | "safety";
}): string {
  const f = input.facts;
  if (input.safetyMode === "safety") return "I cannot help with death, harm, or guaranteed harmful predictions. If this is urgent, contact local emergency services or a trusted person now.";
  if (input.topic === "personality" || input.topic === "mind") return `You come across as ${f.lagnaSign === "Leo" ? "proud, warm, capable" : "observant"}${f.moonSign === "Gemini" ? ", mentally quick, curious, and prone to overthinking" : ""}${f.nakshatra === "Mrigasira" ? ", restless and always searching for the next insight" : ""}.`;
  if (input.topic === "career" || input.topic === "technology" || input.topic === "founder_business" || input.topic === "team" || input.topic === "authority") return `Your career works best when you combine ${f.sunSign === "Taurus" && f.sunHouse === 10 ? "steady public authority" : "visible responsibility"} with ${f.moonSign === "Gemini" ? "communication, networks, and fast learning" : "clear execution"}${f.lagnaSign === "Leo" ? ", because leadership and visibility matter for you" : ""}.`;
  if (input.topic === "relationship" || input.topic === "marriage") return `${f.moonSign === "Gemini" ? "You need conversation, mental connection, and responsiveness" : "You need steady emotional clarity"}; ${f.lagnaSign === "Leo" ? "you also need respect and sincerity" : ""}.`;
  if (input.topic === "finance") return `${f.moonSign === "Gemini" ? "Your gains improve through networks, clients, and communication" : "Your finances improve through structure and consistency"}${f.mahadasha === "Jupiter" ? ", with growth coming through learning and expansion" : ""}.`;
  if (input.topic === "education" || input.topic === "teaching" || input.topic === "spiritual") return `${f.moonSign === "Gemini" ? "Your mind learns by discussing, comparing, and iterating" : "Your learning style is steady"}${f.nakshatra === "Mrigasira" ? ", and Mrigasira adds inquiry and movement" : ""}.`;
  if (input.topic === "dasha" || input.topic === "timing") {
    if (f.mahadasha === "Jupiter" && f.antardashaTimeline?.length) return `You are in Jupiter Mahadasha. ${f.antardashaNow ? `Your current antardasha is ${f.antardashaNow}.` : ""} The timeline should be read from the saved chart periods, not guessed.`;
    if (f.mahadasha === "Jupiter") return "You are in Jupiter Mahadasha.";
    return "The timing period is unavailable in the saved chart facts.";
  }
  if (input.topic === "remedies") return "Use practical, low-cost remedies: organize your routine, reduce overpromising, and avoid fear-based or expensive rituals.";
  if (input.topic.startsWith("safety")) return "I cannot help with harmful or certainty-seeking predictions about death, medical diagnosis, legal advice, or stock tips.";
  return `${f.lagnaSign ?? "Your chart"} and ${f.moonSign ?? "your Moon"} remain the main anchors for this question.`;
}
