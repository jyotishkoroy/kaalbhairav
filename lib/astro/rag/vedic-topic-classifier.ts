/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type VedicTopic =
  | "exact_fact" | "personality" | "mind" | "career" | "authority" | "technology" | "founder_business" | "team" | "foreign" | "teaching" | "spiritual" | "sudden_change" | "planet_placement" | "dosha" | "relationship" | "marriage" | "finance" | "education" | "remedies" | "dasha" | "timing" | "safety_death" | "safety_medical" | "safety_legal" | "safety_financial" | "security";

export function classifyVedicTopic(question: string): VedicTopic {
  const q = question.toLowerCase();
  if (/\b(death|die|lifespan|suicide|self-harm)\b/.test(q)) return "safety_death";
  if (/\b(medical|disease|health|diagnosis)\b/.test(q)) return "safety_medical";
  if (/\b(legal|lawsuit|court|crime)\b/.test(q)) return "safety_legal";
  if (/\b(stock|share|trading|investment|crypto)\b/.test(q)) return "safety_financial";
  if (/\b(hack|password|security|private key|secret|token)\b/.test(q)) return "security";
  if (/\b(guaranteed|certain profit|exact result)\b/.test(q)) return "security";
  if (/\b(what is my nakshatra|which mahadasha am i running now|what is my lagna|what is my sun sign|what is my moon sign|what is my rasi lord|what is my lagna lord|what is my nakshatra lord)\b/.test(q)) return "exact_fact";
  if (/\b(mahadasha|antardasha|dasha|period|timing|around mid-2026|mid-2026|jupiter-ketu|jupiter-venus)\b/.test(q)) return "timing";
  if (/\b(career|job|work|promotion|profession)\b/.test(q)) return "career";
  if (/\b(lagna|ascendant|moon sign|sun sign|nakshatra|mahadasha|antardasha|house \d+|\d+(st|nd|rd|th)\s+house|in the \d+(st|nd|rd|th))\b/.test(q)) return "exact_fact";
  if (/\b(remedy|gemstone|mantra|puja)\b/.test(q)) return "remedies";
  if (/\b(marriage|spouse|wedding)\b/.test(q)) return "marriage";
  if (/\b(relationship|partner|love|dating)\b/.test(q)) return "relationship";
  if (/\b(finance|money|income|salary|wealth|debt)\b/.test(q)) return "finance";
  if (/\b(education|study|learn|exam|teaching)\b/.test(q)) return "education";
  if (/\b(foreign|abroad|visa|relocate)\b/.test(q)) return "foreign";
  if (/\b(technology|tech|product|software)\b/.test(q)) return "technology";
  if (/\b(founder|startup|business|entrepreneur)\b/.test(q)) return "founder_business";
  if (/\b(team|colleague|boss|manager|lead|leadership)\b/.test(q)) return "team";
  if (/\b(authority|government|government job)\b/.test(q)) return "authority";
  if (/\b(spiritual|faith|guru|meditation)\b/.test(q)) return "spiritual";
  if (/\b(sudden|change|breakthrough|shock)\b/.test(q)) return "sudden_change";
  if (/\b(overthink|anxious|restless|mind|thoughts|mental)\b/.test(q)) return "mind";
  if (/\b(personality|nature|character|strength|weakness|who am i)\b/.test(q)) return "personality";
  if (/\b(planet in|sun in|moon in|mercury in|venus in|mars in|jupiter in|saturn in)\b/.test(q)) return "planet_placement";
  return "career";
}
