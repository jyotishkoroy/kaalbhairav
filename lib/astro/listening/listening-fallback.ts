/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { ListeningAnalysis } from "./listening-types";

const topics: Array<[ListeningAnalysis["topic"], RegExp[]]> = [
  ["career", [/job/i, /work/i, /promotion/i, /boss/i, /salary/i, /business/i, /profession/i, /recognition/i]],
  ["marriage", [/marriage/i, /married/i, /spouse/i, /wedding/i, /shaadi/i, /delay/i]],
  ["relationship", [/relationship/i, /breakup/i, /love/i, /partner/i, /girlfriend/i, /boyfriend/i]],
  ["money", [/money/i, /debt/i, /income/i, /savings/i, /loan/i, /finance/i]],
  ["health", [/health/i, /disease/i, /sleep/i, /insomnia/i, /anxiety/i, /body symptoms/i]],
  ["education", [/exam/i, /study/i, /school/i, /college/i, /education/i]],
  ["family", [/parents?/i, /mother/i, /father/i, /family/i, /home/i]],
  ["timing", [/\bwhen\b/i, /date/i, /will it happen/i, /how long/i, /time period/i]],
  ["remedy", [/remedy/i, /mantra/i, /puja/i, /gemstone/i, /sleep remedy/i]],
];

function normalizeQuestion(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pickTopic(question: string, topicHint?: string | null): ListeningAnalysis["topic"] {
  const lower = question.toLowerCase();
  if (topicHint) {
    const hint = topicHint.toLowerCase();
    for (const [topic, patterns] of topics) {
      if (hint.includes(topic)) return topic;
      if (patterns.some((pattern) => pattern.test(hint))) return topic;
    }
  }
  if (/remedy|mantra|puja|gemstone|sleep remedy/i.test(lower)) return "remedy";
  if (/stock|crypto|lottery|profit|guarantee|income|finance|debt|loan|savings/i.test(lower)) return "money";
  if (/court|legal|lawyer|jail|contract|lawsuit/i.test(lower)) return "general";
  if (/cancer|diagnos|medicine|medication|surgery|pregnan|pregnancy|doctor/i.test(lower)) return "health";
  if (/curse|black magic|evil eye/i.test(lower)) return "general";
  for (const [topic, patterns] of topics) {
    if (patterns.some((pattern) => pattern.test(lower))) return topic;
  }
  return /what will happen|tell me|my chart|general/i.test(lower) ? "general" : "unknown";
}

function pickTone(question: string): ListeningAnalysis["emotionalTone"] {
  const lower = question.toLowerCase();
  if (/urgent|asap|right now|immediately|soon/i.test(lower)) return "urgent";
  if (/fear|scared|afraid|worried|terrified|panic/i.test(lower)) return "fearful";
  if (/sad|heartbroken|grief|cry|depressed/i.test(lower)) return "sad";
  if (/confused|not sure|unclear|mixed up|doubt/i.test(lower)) return "confused";
  if (/hope|wish|maybe soon|optimistic|better/i.test(lower)) return "hopeful";
  if (/calm|okay|fine|steady|peaceful/i.test(lower)) return "calm";
  if (/just checking|whatever|dont care|detached/i.test(lower)) return "detached";
  return "anxious";
}

function pickNeed(tone: ListeningAnalysis["emotionalTone"], topic: ListeningAnalysis["topic"], question: string): ListeningAnalysis["emotionalNeed"] {
  const lower = question.toLowerCase();
  if (/boundary|leave|stop|should i|decision/i.test(lower)) return "decision_support";
  if (/remedy|mantra|puja|gemstone/i.test(lower)) return "spiritual_support";
  if (/sleep|insomnia|anxiety at night/i.test(lower)) return "grounding";
  if (/career|job|promotion|salary|boss|work/i.test(lower)) return tone === "anxious" ? "reassurance" : "clarity";
  if (/relationship|breakup|marriage|family/i.test(lower)) return tone === "sad" ? "grounding" : "reassurance";
  if (tone === "fearful" || tone === "anxious") return "reassurance";
  if (tone === "sad") return "grounding";
  if (tone === "hopeful") return "hope";
  if (topic === "timing") return "clarity";
  if (topic === "remedy") return "spiritual_support";
  if (/what next|how to|steps|plan/i.test(lower)) return "practical_steps";
  return "clarity";
}

function pickMissingContext(question: string, topic: ListeningAnalysis["topic"]): ListeningAnalysis["missingContext"] {
  const lower = question.toLowerCase();
  const missing: ListeningAnalysis["missingContext"] = [];
  if (/what will happen|tell me what|generic/i.test(lower)) missing.push("specific_question", "current_situation");
  if (topic === "relationship" && !/single|married|dating|breakup|partner/i.test(lower)) missing.push("relationship_status");
  if (topic === "career" && !/job|work|promotion|boss|salary|business/i.test(lower)) missing.push("career_context");
  if (topic === "timing" && !/day|month|year|week|soon|date/i.test(lower)) missing.push("time_window");
  if (/chart|kundli|reading|astrology/i.test(lower)) {
    if (!/birth date|dob|date of birth/i.test(lower)) missing.push("birth_date");
    if (!/birth time|time of birth/i.test(lower)) missing.push("birth_time");
    if (!/birth place|place of birth/i.test(lower)) missing.push("birth_place");
  }
  return [...new Set(missing)];
}

function pickRisks(question: string): ListeningAnalysis["safetyRisks"] {
  const lower = question.toLowerCase();
  const risks = new Set<ListeningAnalysis["safetyRisks"][number]>();
  if (/die|death|lifespan|how long will i live|when will i die/i.test(lower)) risks.add("death_lifespan");
  if (/doctor|medicine|medication|diagnos|cancer|surgery|pregnant|pregnancy/i.test(lower)) risks.add("medical");
  if (/court|lawyer|legal|jail|contract|lawsuit/i.test(lower)) risks.add("legal");
  if (/guarantee|stock|profit|lottery|crypto|rich/i.test(lower)) risks.add("financial_guarantee");
  if (/pregnant|pregnancy|baby/i.test(lower)) risks.add("pregnancy");
  if (/suicide|kill myself|end my life|i want to die|self harm/i.test(lower)) risks.add("self_harm");
  if (/curse|black magic|evil eye|fear of curse/i.test(lower)) risks.add("curse_fear");
  if (/expensive|50000|rupees|stone|gemstone|puja/i.test(lower)) risks.add("expensive_remedy_pressure");
  if (/guarantee|exact date|definitely|sure shot|predict/i.test(lower)) risks.add("deterministic_prediction");
  return [...risks];
}

function buildSummary(question: string, topic: ListeningAnalysis["topic"]): string {
  const trimmed = normalizeQuestion(question);
  const short = trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
  return topic === "unknown" ? short : `${topic}: ${short}`;
}

function buildAcknowledgement(topic: ListeningAnalysis["topic"], tone: ListeningAnalysis["emotionalTone"]): string {
  const toneText = tone === "urgent" ? "I can see this feels urgent." : tone === "sad" ? "I can hear the heaviness in this." : tone === "fearful" ? "I can see why this feels worrying." : tone === "confused" ? "I can see the question feels unclear." : "I’m listening carefully.";
  return topic === "general" ? toneText : `${toneText} I’m focusing on ${topic}.`;
}

function buildFollowUpQuestion(topic: ListeningAnalysis["topic"]): string {
  if (topic === "career") return "What part of your career situation should I focus on: job, promotion, salary, or business?";
  if (topic === "relationship") return "What is the current relationship situation you want me to focus on?";
  if (topic === "marriage") return "Is this about marriage timing, delay, or relationship readiness?";
  if (topic === "timing") return "What time window do you want me to focus on?";
  return "What specific part of your question should I focus on?";
}

function confidenceFor(question: string, missing: ListeningAnalysis["missingContext"]): ListeningAnalysis["confidence"] {
  if (!question.trim() || /what will happen\??$/i.test(question.trim())) return "low";
  if (missing.length >= 2) return "low";
  if (missing.length === 1) return "medium";
  return "high";
}

export function buildDeterministicListeningFallback(input: { question: string; userContext?: string | null; topicHint?: string | null; reason?: string }): ListeningAnalysis {
  const question = normalizeQuestion(input.question ?? "");
  const topic = pickTopic(question, input.topicHint);
  const tone = pickTone(question);
  const missingContext = pickMissingContext(question, topic);
  const safetyRisks = pickRisks(question);
  const shouldAskFollowUp = topic === "unknown" || /what will happen|tell me what will happen/i.test(question) || missingContext.includes("specific_question") || missingContext.includes("time_window");
  return {
    topic,
    emotionalTone: tone,
    emotionalNeed: pickNeed(tone, topic, question),
    userSituationSummary: buildSummary(question, topic),
    acknowledgementHint: buildAcknowledgement(topic, tone),
    missingContext,
    shouldAskFollowUp,
    followUpQuestion: shouldAskFollowUp ? buildFollowUpQuestion(topic) : undefined,
    safetyRisks,
    humanizationHints: topic === "unknown" ? ["start gently", "ask one clarifying question"] : [tone === "sad" ? "use warm language" : "reflect the user's concern", "avoid overclaiming certainty"],
    source: "deterministic_fallback",
    confidence: confidenceFor(question, missingContext),
  };
}
