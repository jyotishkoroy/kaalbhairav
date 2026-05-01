/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { FinalAnswerQualityFailure, FinalAnswerQualityInput, FinalAnswerQualityResult } from "./final-answer-quality-types"

const POLISH_BLOCKED_RENDER_PHRASES = [
  "Accuracy:",
  "How this is derived:",
  "Chart anchors that matter:",
  "Chart anchors:",
  "Chart basis:",
  "Key anchors:",
  "Suggested follow-up:",
  "Earlier context:",
  "Safety note:",
  "Previous concern:",
  "metadata",
  "primaryIntent:",
  "secondaryIntents:",
  "directV2Route",
  "For career, the chart should be read through",
  "For education, the reading should focus",
  "For spiritual questions, the answer should stay",
  "For remedies, I would keep the guidance",
  "You are asking for guidance on a specific situation",
  "You are asking about timing, so I will keep this focused",
  "You are asking about career progress, so I would focus",
  "The overall pattern matters more than one isolated prediction",
  "The first thing I would look at here is the pattern behind the question",
  "So my honest reading is",
  "A useful career reading stays practical",
  "Marriage questions are best handled without fear or pressure",
  "This is an emotional question, so I would keep the reading gentle and practical",
  "The main signal I would take from this is",
  "This question should be read",
  "The person may be seeking",
  "The answer should stay tied",
  "Keep the answer tied",
  "[REDACTED]",
] as const

const INTERNAL_LEAK_PHRASES = [
  "this question should be read",
  "this question should be read through",
  "the person may be seeking",
  "the answer should stay tied",
  "keep the answer tied",
  "the answer should stay",
  "this should be read",
  "for career, the chart should be read through",
  "the chart should be read through",
  "validator policy",
  "internal renderer",
  "evidence policy",
  "memory policy",
  "safety policy",
]

const METADATA_LEAK_PHRASES = [
  "metadata",
  "chartanchorsused",
  "llmrefinerused",
  "llmrefinerfallback",
  "directv2route",
  "profilepath",
  "mode:",
  "primaryintent:",
  "secondaryintents:",
  "chart basis",
  "key anchors",
  "accuracy",
  "suggested follow-up",
]

const MEMORY_LEAK_PHRASES = [
  "previous concern:",
  "previous concern",
  "preference:",
  "guidance already given:",
  "memory:",
  "retrieved memory:",
  "companion memory:",
  "user memory:",
]

const DUPLICATE_PHRASES = [
  "career progress career",
  "career progress promotion",
  "career career progress",
  "career progress work",
  "career progress business",
  "career progress job",
  "relationship or marriage relationship",
  "relationship or marriage marriage",
  "relationship or marriage career",
  "money money",
  "specific situation work",
  "specific situation career",
]

const UNSAFE_CLAIM_PHRASES = [
  "you will definitely",
  "you are guaranteed to",
  "this will certainly happen",
  "you will die",
  "death will happen on",
  "you will win the court case",
  "you will become rich for sure",
]

const UNSAFE_REMEDY_PHRASES = [
  "this gemstone will fix all your problems",
  "you must buy this expensive puja",
  "stop medical treatment and only chant",
  "will cure disease",
  "wear blue sapphire immediately and everything will improve",
]

const GENERIC_PHRASES = [
  "the overall pattern matters more than one isolated prediction",
  "a responsible reading should reduce fear",
]

function normalizeForPolishCheck(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/[_`#>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function normalize(text: string): string {
  return normalizeForPolishCheck(text)
}

function containsPhrase(text: string, phrase: string): boolean {
  return normalizeForPolishCheck(text).includes(normalizeForPolishCheck(phrase))
}

function hasAnyPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => containsPhrase(text, phrase))
}

function containsBlockedPolishPhrase(answerText: string): boolean {
  const normalized = normalizeForPolishCheck(answerText)
  return POLISH_BLOCKED_RENDER_PHRASES.some((phrase) => normalized.includes(normalizeForPolishCheck(phrase)))
}

function getRepeatedSentences(answerText: string): string[] {
  const sentences = answerText
    .split(/[.!?]\s+/)
    .map((sentence) => normalizeForPolishCheck(sentence).replace(/[.!?]+$/g, ""))
    .filter((sentence) => sentence.length >= 24)

  const seen = new Set<string>()
  const repeated = new Set<string>()

  for (const sentence of sentences) {
    if (seen.has(sentence)) {
      repeated.add(sentence)
    }
    seen.add(sentence)
  }

  return Array.from(repeated)
}

function isEmptyOrMeaningless(answerText: string, allowCompactExactFact: boolean): boolean {
  const normalized = answerText.trim()
  if (!normalized) return true
  if (allowCompactExactFact) return false
  if (normalized.length < 8) return true
  const wordCount = normalized.split(/\s+/).filter(Boolean).length
  return wordCount < 2 && !/^(?:leo|aries|taurus|gemini|cancer|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\.?$/i.test(normalized)
}

function questionDomain(question?: string, expectedDomain?: string, primaryIntent?: string): string {
  const seed = normalize(`${question ?? ""} ${expectedDomain ?? ""} ${primaryIntent ?? ""}`)
  if (/(money|income|salary|finance|financial|business|revenue)/i.test(seed)) return "money"
  if (/(relationship|marriage|partner|spouse|love|romance)/i.test(seed)) return "relationship"
  if (/(sleep|rest|insomnia|health|remedy|illness|medical)/i.test(seed)) return "sleep"
  if (/(foreign|abroad|settle|settlement|immigration|move overseas)/i.test(seed)) return "foreign_settlement"
  if (/(exact fact|exact_fact|lagna|ascendant|which sign|what is my)/i.test(seed)) return "exact_fact"
  if (/(career|job|promotion|work|profession|business)/i.test(seed)) return "career"
  return expectedDomain ?? primaryIntent ?? "general"
}

function isExactFactContext(input: FinalAnswerQualityInput): boolean {
  return input.mode === "exact_fact" || input.primaryIntent === "exact_fact" || input.exactFactExpected === true || /exact_fact|what is my|lagna|ascendant/i.test(input.rawQuestion ?? "")
}

function looksLikeDirectExactFact(answer: string): boolean {
  return /^(?:direct answer:\s*)?(?:lagna|ascendant|moon sign|sun sign|venus sign)\b/i.test(answer.trim()) || /^(?:direct answer:\s*)?(?:leo|aries|taurus|gemini|cancer|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b/i.test(answer.trim())
}

function genericOnly(answer: string): boolean {
  const text = normalize(answer)
  if (!text) return false
  const matches = GENERIC_PHRASES.filter((phrase) => text.includes(phrase)).length
  if (matches === 0) return false
  return text.length < 160 || matches > 1
}

function onlyDisclaimer(answer: string): boolean {
  const text = normalize(answer)
  return /medical, legal, or financial advice/.test(text) || /should not be treated as medical, legal, or financial advice/.test(text)
}

function containsExplicitFinancialRefusal(answer: string): boolean {
  const normalized = answer.toLowerCase()

  if (
    (
      normalized.includes("astrology cannot guarantee business profit") &&
      normalized.includes("do not invest, borrow, or risk money because of astrology") &&
      normalized.includes("qualified financial advice")
    ) ||
    (
      normalized.includes("astrology cannot guarantee business profit") &&
      normalized.includes("do not treat a chart as permission to take financial risk") &&
      normalized.includes("qualified financial advice")
    ) ||
    (
      normalized.includes("do not trust a risky financial opportunity because of a chart") &&
      normalized.includes("astrology cannot verify profit, safety, legality, or repayment") &&
      normalized.includes("qualified financial advice")
    )
  ) {
    return true
  }

  const hasFinancialContext =
    /\b(financial|money|income|loan|debt|invest|investment|business|profit|cash|budget|real-money)\b/.test(normalized)

  const hasRefusal =
    /\b(astrology should not decide|do not invest all your money|do not take debt|cannot guarantee|i cannot guarantee|do not treat a chart as permission|should not be used to declare certain loss|use the chart only for reflection)\b/.test(normalized)

  const hasProfessionalBoundary =
    /\b(qualified financial professional|professional advice|real-money decisions?|downside risk|repayment capacity|emergency cash|protect essentials)\b/.test(normalized)

  const hasMinimalRefusal = hasFinancialContext && /\bcannot guarantee\b/.test(normalized)

  return (hasFinancialContext && hasRefusal && hasProfessionalBoundary) || hasMinimalRefusal
}

function containsExplicitRelocationRefusal(answer: string): boolean {
  const normalized = answer.toLowerCase()

  if (
    (
      normalized.includes("astrology cannot guarantee foreign settlement") &&
      normalized.includes("do not make immigration decisions based only on a chart") &&
      normalized.includes("visa") &&
      normalized.includes("budget")
    ) ||
    (
      normalized.includes("do not make an immediate relocation decision because of astrology") &&
      normalized.includes("astrology cannot guarantee success abroad") &&
      normalized.includes("visa") &&
      normalized.includes("housing")
    )
  ) {
    return true
  }

  const hasRelocationContext =
    /\b(foreign settlement|relocate|relocation|abroad|leave india|visa|job or study offer|documents)\b/.test(normalized)

  const hasRefusal =
    /\b(cannot guarantee|do not relocate immediately|not a guaranteed prediction|not a fixed promise|based only on a chart)\b/.test(normalized)

  const hasPracticalBoundary =
    /\b(visa eligibility|job or study offers?|budget|documents|housing|family responsibilities|responsibilities)\b/.test(normalized)

  return hasRelocationContext && hasRefusal && hasPracticalBoundary
}

function directFactMissing(answer: string): boolean {
  const text = normalize(answer)
  if (/(cannot verify|cannot determine|cannot confirm|deterministic data available)/i.test(text)) return false
  if (looksLikeDirectExactFact(answer)) return false
  if (/financial certainty|medical, legal, or financial certainty/i.test(text)) return false
  if (/^(?:leo|aries|taurus|gemini|cancer|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\.?$/i.test(text)) return false
  return onlyDisclaimer(answer) || /general stress patterns|responsible reading|overall pattern matters/i.test(text)
}

export function validateFinalAnswerQuality(input: FinalAnswerQualityInput): FinalAnswerQualityResult {
  const failures = new Set<FinalAnswerQualityFailure>()
  const answer = input.answerText ?? ""

  if (isEmptyOrMeaningless(answer, isExactFactContext(input))) failures.add("empty_answer")
  const normalizedAnswer = normalize(answer)
  if (containsBlockedPolishPhrase(answer)) failures.add("internal_instruction_leak")
  if (hasAnyPhrase(answer, INTERNAL_LEAK_PHRASES)) failures.add("internal_instruction_leak")
  if (hasAnyPhrase(answer, METADATA_LEAK_PHRASES)) failures.add("metadata_leak")
  if (hasAnyPhrase(answer, MEMORY_LEAK_PHRASES)) failures.add("memory_contamination")
  if (hasAnyPhrase(answer, DUPLICATE_PHRASES)) failures.add("duplicate_topic_phrase")
  if (getRepeatedSentences(answer).length > 0) failures.add("duplicate_topic_phrase")
  if (hasAnyPhrase(answer, UNSAFE_CLAIM_PHRASES)) failures.add("unsafe_claim")
  if (hasAnyPhrase(answer, UNSAFE_REMEDY_PHRASES)) failures.add("unsafe_remedy")
  if (genericOnly(answer)) failures.add("generic_boilerplate")

  const domain = questionDomain(input.rawQuestion, input.expectedDomain, input.primaryIntent)
  if (domain === "money" && /career progress|career/i.test(normalizedAnswer) && !/(salary|income|job income|work income|business revenue|revenue)/i.test(normalizedAnswer)) {
    failures.add("wrong_domain_answer")
  }
  if (domain === "relationship" && /career progress|career/i.test(normalizedAnswer)) failures.add("wrong_domain_answer")
  if (domain === "sleep" && /(career|finance|financial|money)/i.test(normalizedAnswer)) failures.add("wrong_domain_answer")
  if (domain === "foreign_settlement" && /career|promotion/i.test(normalizedAnswer) && !/abroad|settle|immigration/i.test(normalizedAnswer)) failures.add("wrong_domain_answer")
  if (isExactFactContext(input) && directFactMissing(answer)) failures.add("safety_overreplacement")
  if (isExactFactContext(input) && /will definitely|guaranteed|certainly/i.test(normalizedAnswer)) failures.add("unsupported_chart_fact")
  if (isExactFactContext(input) && /(general pattern|practical guidance|next step|stay positive)/i.test(normalizedAnswer) && !looksLikeDirectExactFact(answer) && !/(cannot verify|deterministic data available)/i.test(normalizedAnswer)) failures.add("wrong_domain_answer")
  if (isExactFactContext(input) && /medical, legal, or financial advice/.test(normalizedAnswer) && !looksLikeDirectExactFact(answer)) failures.add("safety_overreplacement")
  if (input.metadata && typeof input.metadata === "object" && "timing" in input.metadata) {
    if (/next year|next month|within \d+ (days|weeks|months)|on \d{4}-\d{2}-\d{2}/i.test(normalizedAnswer) && !/(cannot verify|deterministic data available)/i.test(normalizedAnswer)) {
      failures.add("unsupported_chart_fact")
    }
  }

  const explicitFinancialRefusal = containsExplicitFinancialRefusal(answer)
  const explicitRelocationRefusal = containsExplicitRelocationRefusal(answer)
  const exactFactFinancialBoundary = isExactFactContext(input) && looksLikeDirectExactFact(answer) && /financial certainty/i.test(normalizedAnswer)
  if (
    hasAnyPhrase(answer, [
      "guarantee",
      "guaranteed",
      "definitely",
      "certainly",
      "will come",
      "invest all your money",
      "take the loan",
      "buy this stock",
      "buy stock",
      "financial certainty",
      "money certainty",
      "profit this year",
      "success abroad",
      "leave india immediately",
    ])
  ) {
    const unsafeContext = /\b(money|income|financial|loan|debt|invest|investment|business|profit|foreign settlement|relocate|relocation|abroad|leave india|visa)\b/i.test(answer)
    if (unsafeContext && !explicitFinancialRefusal && !explicitRelocationRefusal && !exactFactFinancialBoundary) failures.add("unsafe_claim")
  }

  if (hasAnyPhrase(answer, ["safety note: safety note:", "chart basis:", "key anchors:", "accuracy:", "suggested follow-up:"])) {
    failures.add(hasAnyPhrase(answer, ["chart basis:", "key anchors:", "accuracy:", "suggested follow-up:"]) ? "metadata_leak" : "internal_instruction_leak")
  }

  const uniqueFailures = [...failures]
  const rewriteHint =
    failures.has("internal_instruction_leak") ? "Remove internal planning/debug labels and render only user-facing answer sections." :
    failures.has("memory_contamination") ? "Remove raw memory labels; use at most one natural relevance sentence." :
    failures.has("duplicate_topic_phrase") ? "Deduplicate repeated openings or boilerplate sentences." :
    failures.has("wrong_domain_answer") ? "Rebuild answer from the primary intent/domain." :
    failures.has("safety_overreplacement") ? "Answer the exact fact directly or state deterministic unavailability; append only minimal boundary." :
    failures.has("unsafe_claim") ? "Remove guarantee, deterministic timing, or fatalistic claim." :
    failures.has("unsafe_remedy") ? "Replace remedy with low-cost, optional, non-coercive support and professional-help boundary if needed." :
    undefined

  return {
    allowed: uniqueFailures.length === 0,
    failures: uniqueFailures,
    rewriteHint,
  }
}
