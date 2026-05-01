/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type FinalAnswerDomain =
  | "exact_fact"
  | "career"
  | "business"
  | "money"
  | "relationship"
  | "marriage"
  | "family"
  | "education"
  | "foreign"
  | "remedy"
  | "spiritual"
  | "sleep"
  | "health"
  | "legal"
  | "death_safety"
  | "timing"
  | "mixed"
  | "general"

export type FinalAnswerSafetyAction =
  | "none"
  | "medical_boundary"
  | "legal_boundary"
  | "financial_boundary"
  | "death_boundary"
  | "remedy_boundary"
  | "gemstone_boundary"
  | "spiritual_fear_boundary"

export type ComposeFinalAnswerInput = {
  question: string
  draftAnswer: string
  domain: FinalAnswerDomain
  safetyAction?: FinalAnswerSafetyAction
  exactFact?: boolean
}

export type ComposeFinalAnswerResult = {
  answer: string
  repaired: boolean
  removedFragments: string[]
}

function normalizeWhitespace(value: string): string {
  return value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").replace(/\s+\./g, ".").replace(/\s+,/g, ",").trim()
}

function normalizeSentenceKey(value: string): string {
  return value.toLowerCase().replace(/[`*_#>]/g, "").replace(/\s+/g, " ").trim()
}

function splitSentences(value: string): string[] {
  return normalizeWhitespace(value).split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean)
}

const VISIBLE_SCAFFOLD_FRAGMENTS = [
  "The question is broad, so start with the area that feels most urgent and choose one grounded next step.",
  "I can help, but the question is broad. Pick one area first: career, relationship, money, family, health, study, or spiritual practice.",
  "I am reading this in a grounded way, starting with the actual question rather than a canned prediction.",
  "This relationship question is emotionally heavy, so I will keep it gentle and practical.",
  "It makes sense that this feels frustrating when effort is not turning into recognition.",
  "Marriage timing is best read through readiness, communication, family expectations, and whether the decision supports emotional steadiness.",
  "Money pressure needs a grounded answer, not fear.",
  "Timing questions are best answered as preparation windows, not guarantees.",
  "Spiritual practice should reduce fear, not increase it.",
  "Health or wellbeing questions should stay safe, practical, and non-diagnostic.",
  "Family pressure is easier to handle when duty and guilt are separated clearly.",
  "For education, the useful focus is consistency, attention, and the learning environment that helps you follow through.",
  "Foreign travel or relocation works best when timing is matched with real preparation.",
  "Remedy questions should stay low-pressure, safe, and practical.",
] as const

function removeVisibleScaffold(answer: string): { answer: string; removedFragments: string[] } {
  let cleaned = answer
  const removedFragments: string[] = []
  for (const fragment of VISIBLE_SCAFFOLD_FRAGMENTS) {
    if (cleaned.includes(fragment)) {
      cleaned = cleaned.split(fragment).join("")
      removedFragments.push(fragment)
    }
  }
  return { answer: normalizeWhitespace(cleaned), removedFragments }
}

function dedupeSentences(answer: string): string {
  const seen = new Set<string>()
  const kept: string[] = []
  for (const sentence of splitSentences(answer)) {
    const key = normalizeSentenceKey(sentence)
    if (!key) continue
    if (key.length >= 24 && seen.has(key)) continue
    seen.add(key)
    kept.push(sentence)
  }
  return normalizeWhitespace(kept.join(" "))
}

function getDomainFallback(domain: FinalAnswerDomain): string {
  switch (domain) {
    case "career":
      return "Start with the controllable part: clarify the role you want, document visible wins, and ask for feedback tied to promotion criteria."
    case "business":
      return "Astrology cannot guarantee business profit. Do not invest, borrow, or risk money because of astrology. For business decisions, use accounts, contracts, cash flow, risk review, and qualified financial advice."
    case "money":
      return "Do not make the money decision from panic. Check your monthly baseline, protect essential cash flow, and avoid risks that depend on one guaranteed outcome."
    case "relationship":
      return "Do not turn this into self-blame. Look at consistency, emotional safety, communication, and whether the next step comes from clarity or fear."
    case "marriage":
      return "Do not treat delay as proof of bad luck. Focus on readiness, compatibility, communication, and whether the decision is being made from steadiness rather than pressure."
    case "family":
      return "Separate duty from guilt. Choose one boundary you can say calmly, and keep the next conversation focused on what you can actually do."
    case "education":
      return "Compare the options by effort, time, cost, and long-term usefulness. Choose the path you can sustain with routine, not just the one that reduces fear today."
    case "foreign":
      return "Do not make an immediate relocation decision because of astrology. Astrology cannot guarantee success abroad. Check visa status, confirmed work or study, housing, budget, documents, and family responsibilities first."
    case "remedy":
      return "Keep the remedy simple, low-cost, and optional. Use steady routine, reflection, prayer if meaningful, and practical action before considering anything expensive or intense."
    case "spiritual":
      return "Do not let spiritual fear drive the answer. Keep the practice simple, optional, and calming; avoid expensive or panic-based remedies."
    case "sleep":
      return "For tonight, keep it simple: reduce screens, avoid late caffeine, take a few slow breaths, and write down one worry so your mind does not keep carrying it."
    case "health":
      return "Astrology should not diagnose health. If symptoms are present or persistent, speak with a qualified professional, and use spiritual practice only as emotional support."
    case "legal":
      return "Astrology should not replace legal advice. If this involves court, police, contracts, or legal risk, rely on a qualified professional and use the reading only for emotional steadiness."
    case "death_safety":
      return "I would not predict death, lifespan, or exact danger timing. A responsible answer can only support wellbeing, practical caution, and calmer choices."
    case "timing":
      return "Treat timing as preparation, not certainty. Focus on what can be made ready now and avoid forcing a decision only because you want a guaranteed date."
    case "mixed":
      return "Handle this as a prioritization question. Pick the area that carries the highest real-world consequence first, then take one safe step before deciding the rest."
    case "general":
    default:
      return "Pick one area first: career, relationship, money, family, health, study, spiritual practice, or timing. Which one should we focus on?"
  }
}

function getSafetyBoundary(action: FinalAnswerSafetyAction | undefined): string | undefined {
  switch (action) {
    case "medical_boundary":
      return "This should not replace medical care; if symptoms are present or persistent, speak with a qualified professional."
    case "legal_boundary":
      return "This should not replace legal advice; for court, police, contracts, or legal risk, speak with a qualified professional."
    case "financial_boundary":
      return "This should not be treated as financial advice or a guaranteed profit signal; check the numbers and risk before acting."
    case "death_boundary":
      return "I will not predict death, lifespan, or exact accident timing."
    case "remedy_boundary":
      return "Avoid expensive, fear-based, or pressure-driven remedies."
    case "gemstone_boundary":
      return "Do not wear strong gemstones impulsively; consider them only after careful full-chart review by a trusted expert."
    case "spiritual_fear_boundary":
      return "Do not jump to curses, black magic, or doomed destiny as the explanation."
    case "none":
    default:
      return undefined
  }
}

export function composeFinalUserAnswer(input: ComposeFinalAnswerInput): ComposeFinalAnswerResult {
  const removedFragments: string[] = []

  if (input.exactFact) {
    const cleaned = normalizeWhitespace(dedupeSentences(input.draftAnswer))
    return { answer: cleaned, repaired: cleaned !== input.draftAnswer, removedFragments }
  }

  const removed = removeVisibleScaffold(input.draftAnswer)
  removedFragments.push(...removed.removedFragments)

  const safetyBoundary = getSafetyBoundary(input.safetyAction)
  const fallback = getDomainFallback(input.domain)

  const candidate = normalizeWhitespace(removed.answer)
  const needsFallback =
    candidate.length < 48 ||
    VISIBLE_SCAFFOLD_FRAGMENTS.some((fragment) => candidate.includes(fragment))

  const paragraphs = [safetyBoundary, needsFallback ? fallback : candidate].filter(Boolean) as string[]
  const answer = normalizeWhitespace(dedupeSentences(paragraphs.join(" ")))

  return {
    answer,
    repaired: answer !== input.draftAnswer || removedFragments.length > 0 || needsFallback,
    removedFragments,
  }
}
