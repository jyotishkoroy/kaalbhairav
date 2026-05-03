/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { VedicTopic } from "./vedic-topic-classifier";

export function buildVedicRetrievalQuery(input: { question: string; topic: VedicTopic; chartFacts: Record<string, unknown> }): string {
  const parts = [input.question.trim()];
  const facts = input.chartFacts;
  const lagna = typeof facts.lagnaSign === "string" ? facts.lagnaSign : undefined;
  const moon = typeof facts.moonSign === "string" ? facts.moonSign : undefined;
  const moonHouse = typeof facts.moonHouse === "number" ? `house ${facts.moonHouse}` : undefined;
  const sun = typeof facts.sunSign === "string" ? facts.sunSign : undefined;
  const sunHouse = typeof facts.sunHouse === "number" ? `house ${facts.sunHouse}` : undefined;
  if (lagna) parts.push(`Lagna ${lagna}`);
  if (moon) parts.push(`Moon ${moon}`);
  if (moonHouse) parts.push(moonHouse);
  if (sun) parts.push(`Sun ${sun}`);
  if (sunHouse) parts.push(sunHouse);
  if (input.topic === "career" || input.topic === "technology" || input.topic === "founder_business" || input.topic === "team" || input.topic === "authority") parts.push("10th house 6th house 2nd house 11th house Saturn Mercury Sun");
  if (input.topic === "relationship" || input.topic === "marriage") parts.push("7th house Venus Jupiter Moon");
  if (input.topic === "finance") parts.push("2nd house 11th house Jupiter Venus Mercury");
  if (input.topic === "mind" || input.topic === "personality") parts.push("Moon Mercury Lagna Nakshatra");
  if (input.topic === "foreign") parts.push("9th house 12th house Rahu");
  if (input.topic === "teaching" || input.topic === "spiritual") parts.push("9th house Jupiter Mercury");
  if (input.topic === "remedies") parts.push("remedies safe practical");
  if (input.topic === "dasha" || input.topic === "annual_timing") parts.push("dasha antardasha mahadasha");
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 400);
}
