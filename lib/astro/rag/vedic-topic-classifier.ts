/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type VedicTopic =
  | "exact_fact"
  | "personality"
  | "mind"
  | "career"
  | "authority"
  | "technology"
  | "founder_business"
  | "team"
  | "foreign"
  | "teaching"
  | "spiritual"
  | "planet_placement"
  | "dosha"
  | "relationship"
  | "marriage"
  | "finance"
  | "education"
  | "remedies"
  | "dasha"
  | "annual_timing"
  | "sade_sati"
  | "panoti"
  | "safety_death"
  | "safety_medical"
  | "safety_legal"
  | "safety_financial"
  | "security";

export function classifyVedicTopic(question: string): VedicTopic {
  const q = question.toLowerCase();
  if (/\b(death|die|lifespan|suicide|self-harm)\b/.test(q)) return "safety_death";
  if (/\b(medical|disease|health|diagnosis)\b/.test(q)) return "safety_medical";
  if (/\b(legal|lawsuit|court|crime)\b/.test(q)) return "safety_legal";
  if (/\b(stock|share|trading|investment|crypto)\b/.test(q)) return "safety_financial";
  if (/\b(model|server|system prompt|database rows|logs|credentials|token|secret|api key)\b/.test(q)) return "security";
  if (/\b(manglik|mangal dosha|kalsarpa|kala sarpa)\b/.test(q)) return "dosha";
  if (/\b(what is my lagna|is my lagna virgo|what is my moon sign|what is my nakshatra|what is my sun sign in the vedic chart|what is my western sun sign|what is my lagna lord|what is my rasi lord|what is my birth nakshatra lord|which mahadasha am i running now|what antardasha am i in)\b/.test(q)) return "exact_fact";
  if (/\b(jupiter-ketu|jupiter-venus|mahadasha|antardasha|dasha|timing|mid-2026|around mid-2026)\b/.test(q)) return "dasha";
  if (/\b(career|job|work|promotion|profession|authority|government job)\b/.test(q)) return /\b(authority|government job)\b/.test(q) ? "authority" : "career";
  if (/\b(technology|tech|software|app|product)\b/.test(q)) return "technology";
  if (/\b(founder|startup|business|entrepreneur)\b/.test(q)) return "founder_business";
  if (/\b(team|colleague|boss|manager|lead|leadership)\b/.test(q)) return "team";
  if (/\b(foreign|abroad|visa|relocate)\b/.test(q)) return "foreign";
  if (/\b(teaching|teacher|mentor|study|learn|education|exam)\b/.test(q)) return /\b(teaching|teacher)\b/.test(q) ? "teaching" : "education";
  if (/\b(spiritual|faith|guru|meditation)\b/.test(q)) return "spiritual";
  if (/\b(remedy|gemstone|mantra|puja)\b/.test(q)) return "remedies";
  if (/\b(marriage|spouse|wedding|relationship|partner|love|dating)\b/.test(q)) return /\b(marriage|spouse|wedding)\b/.test(q) ? "marriage" : "relationship";
  if (/\b(finance|money|income|salary|wealth|debt)\b/.test(q)) return "finance";
  if (/\b(personality|nature|character|strength|weakness|who am i)\b/.test(q)) return "personality";
  if (/\b(overthink|anxious|restless|mind|thoughts|mental)\b/.test(q)) return "mind";
  if (/\b(mercury in gemini in the 11th|moon in gemini in the 11th|sun in taurus in the 10th)\b/.test(q)) return "planet_placement";
  if (/\b(planet in|sun in|moon in|mercury in|venus in|mars in|jupiter in|saturn in)\b/.test(q)) return "planet_placement";
  return "career";
}
