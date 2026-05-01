/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import {
  composeFinalUserAnswer,
  type FinalAnswerDomain,
  type FinalAnswerSafetyAction,
} from "./final-answer-composer"
import { validateFinalAnswerQuality } from "../validation/final-answer-quality-validator"

export type FinalResponseGateInput = {
  question: string
  draftAnswer: string
  domain: FinalAnswerDomain
  safetyAction?: FinalAnswerSafetyAction
  exactFact?: boolean
  allowChartAnchors?: boolean
  allowMemoryContext?: boolean
}

export type FinalResponseGateResult = {
  answer: string
  replaced: boolean
  reason:
    | "exact_fact_passthrough"
    | "safety_short_circuit"
    | "contaminated_rewrite"
    | "quality_rewrite"
    | "composer_cleanup"
    | "unchanged"
}

function normalizeQuestion(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

function normalizeAnswer(value: string): string {
  return value
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+\./g, ".")
    .trim()
}

const HARD_CONTAMINATION_PATTERNS: RegExp[] = [
  /\bthe main signal i see is\b/i,
  /\bleo lagna, gemini rasi, jupiter mahadasha\b/i,
  /\bjupiter mahadasha from 22 aug 2018 to 22 aug 2034\b/i,
  /\byou have touched on this theme before\b/i,
  /\bclarify your responsibilities, make your work more visible\b/i,
  /\byour work may need clearer visibility\b/i,
  /\bfamily pressure can make a career question feel heavier\b/i,
  /\bbusiness questions should stay grounded\b/i,
  /\bfor study choices\b/i,
  /\bspiritual practice should stay calm\b/i,
  /\bmarriage timing is best read through\b/i,
  /\bfocus first on stability: know your monthly baseline\b/i,
  /\bmoney pressure becomes easier to handle\b/i,
  /\bthis relationship question calls for\b/i,
  /\bchart anchors?\b/i,
  /\bearlier context\b/i,
  /\baccuracy:\b/i,
  /\bhow this is derived:\b/i,
]

const CHART_ANCHOR_PATTERNS: RegExp[] = [
  /\bleo lagna\b/i,
  /\bgemini rasi\b/i,
  /\bjupiter mahadasha\b/i,
  /\bthe main signal i see\b/i,
  /\bmoon and mercury in gemini\b/i,
  /\brahu and venus in the 12th\b/i,
  /\bmars in the 3rd\b/i,
]

const MEMORY_CONTEXT_PATTERNS: RegExp[] = [
  /\byou have touched on this theme before\b/i,
  /\blast time\b/i,
  /\bearlier\b/i,
  /\bpreviously\b/i,
  /\bprevious concern\b/i,
]

export function userExplicitlyAskedForChartBasis(question: string): boolean {
  const normalized = normalizeQuestion(question)
  return (
    /\bchart basis\b/.test(normalized) ||
    /\bchart fact\b/.test(normalized) ||
    /\bexact fact\b/.test(normalized) ||
    /\bplacement\b/.test(normalized) ||
    /\bplaced\b/.test(normalized) ||
    /\bhouse\b/.test(normalized) ||
    /\bdasha\b/.test(normalized) ||
    /\bmahadasha\b/.test(normalized) ||
    /\blagna\b/.test(normalized) ||
    /\bascendant\b/.test(normalized) ||
    /\brising sign\b/.test(normalized) ||
    /\bwhere is\b/.test(normalized) ||
    /\bwhich planet\b/.test(normalized) ||
    /\bwhich house\b/.test(normalized) ||
    /\bwhat does my chart say specifically\b/.test(normalized)
  )
}

export function userExplicitlyAskedForMemory(question: string): boolean {
  const normalized = normalizeQuestion(question)
  return (
    /\blast time\b/.test(normalized) ||
    /\bearlier\b/.test(normalized) ||
    /\bpreviously\b/.test(normalized) ||
    /\bas i said\b/.test(normalized) ||
    /\bcontinue\b/.test(normalized) ||
    /\bagain\b/.test(normalized)
  )
}

export function isContaminatedFinalAnswer(input: {
  question: string
  answer: string
  allowChartAnchors?: boolean
  allowMemoryContext?: boolean
}): boolean {
  const answer = input.answer

  if (HARD_CONTAMINATION_PATTERNS.some((pattern) => pattern.test(answer))) {
    return true
  }

  if (!input.allowChartAnchors && CHART_ANCHOR_PATTERNS.some((pattern) => pattern.test(answer))) {
    return true
  }

  if (!input.allowMemoryContext && MEMORY_CONTEXT_PATTERNS.some((pattern) => pattern.test(answer))) {
    return true
  }

  return false
}

export function getSafetyShortCircuitDomain(question: string): {
  domain: FinalAnswerDomain
  safetyAction: FinalAnswerSafetyAction
} | undefined {
  const normalized = normalizeQuestion(question)

  if (/\b(death|die|lifespan|danger to my life|death period|someone .* die|accidents? exactly|accident timing)\b/.test(normalized)) {
    return { domain: "death_safety", safetyAction: "death_boundary" }
  }

  if (/\b(diagnose|medical treatment|stop treatment|mantra only|health problem|dangerous for my health|insomnia caused by planets)\b/.test(normalized)) {
    return { domain: "health", safetyAction: "medical_boundary" }
  }

  if (/\b(court|legal|lawsuit|legal dispute|legal outcome|legal advice)\b/.test(normalized)) {
    return { domain: "legal", safetyAction: "legal_boundary" }
  }

  if (/\b(guarantee profit|business profit|guaranteed profit|invest all my money|risky financial opportunity|loan because astrology says money will come)\b/.test(normalized)) {
    return { domain: "business", safetyAction: "financial_boundary" }
  }

  if (/\b(foreign settlement guaranteed|leave india immediately|guaranteed.*abroad|guaranteed.*foreign)\b/.test(normalized)) {
    return { domain: "foreign", safetyAction: "financial_boundary" }
  }

  if (/\b(blue sapphire|gemstone|gemstone.*fix|fix all my problems)\b/.test(normalized)) {
    return { domain: "remedy", safetyAction: "gemstone_boundary" }
  }

  if (/\b(expensive puja|bad luck|curse|cursed|black magic|destiny ruined|saturn punishing|life blocked forever)\b/.test(normalized)) {
    return { domain: "spiritual", safetyAction: "spiritual_fear_boundary" }
  }

  return undefined
}

function buildHardReplacementAnswer(input: {
  question: string
  domain: FinalAnswerDomain
  safetyAction?: FinalAnswerSafetyAction
}): string {
  const normalized = normalizeQuestion(input.question)

  if (input.safetyAction === "death_boundary" || input.domain === "death_safety") {
    return "I would not predict death, lifespan, or exact danger timing. If you feel unsafe in real life, use practical safety steps and speak to someone trusted immediately. From an astrology perspective, the safest answer is to focus on wellbeing, caution, and reducing fear."
  }

  if (input.safetyAction === "medical_boundary" || input.domain === "health") {
    if (/\binsomnia\b|\bsleep\b/.test(normalized)) {
      return "Do not treat insomnia as caused by planets in a medical sense. Use the chart only for reflection. For practical support, reduce screens late at night, keep a steady sleep routine, and speak with a qualified professional if sleep trouble persists."
    }

    return "Astrology should not diagnose health or replace medical care. If symptoms are present or persistent, speak with a qualified professional. Use spiritual practice only as emotional support, not as treatment."
  }

  if (input.safetyAction === "legal_boundary" || input.domain === "legal") {
    return "Astrology should not be treated as legal advice or a guarantee of outcome. For court, contracts, police, or legal risk, speak with a qualified legal professional. Use astrology only as emotional support while you handle the practical steps."
  }

  if (input.safetyAction === "financial_boundary" && input.domain === "business") {
    return "Astrology cannot guarantee business profit. Treat this as a practical risk decision: check the numbers, written assumptions, downside exposure, and whether the opportunity still makes sense without a guaranteed outcome."
  }

  if (input.safetyAction === "financial_boundary" && input.domain === "foreign") {
    return "Foreign settlement should not be treated as guaranteed. Do not leave suddenly only because success feels possible. Check documents, savings, visa realities, skills, and real opportunities before making a major move."
  }

  if (input.safetyAction === "gemstone_boundary") {
    if (/\bblue sapphire\b/.test(normalized)) {
      return "Do not wear blue sapphire impulsively. Strong gemstones should only be considered after a careful full-chart review by a trusted expert. For now, use safer supports: routine, reflection, prayer if meaningful, and practical action."
    }

    return "No gemstone should be framed as fixing all problems. Keep spiritual support optional and low-pressure, and avoid any remedy that creates fear, urgency, or financial pressure."
  }

  if (input.safetyAction === "spiritual_fear_boundary") {
    return "Do not jump to curses, black magic, punishment, or doomed destiny as the explanation. A safer next step is to reduce fear, keep your routine steady, speak with someone grounded, and avoid expensive or panic-based remedies."
  }

  switch (input.domain) {
    case "career":
      if (/\bpromotion\b|\bboss\b|\brecognize\b|\bunseen\b|\bvisibility\b/.test(normalized)) {
        return "Your effort may be real, but it may not be visible to the people deciding growth. This week, document one measurable result, ask what promotion-ready performance looks like, and make your ownership clearer in one conversation."
      }

      if (/\bresign\b|\bchange my job\b|\bstuck\b/.test(normalized)) {
        return "Do not resign only from frustration. First compare three things: whether the role still teaches you, whether your work is visible, and whether another option is realistically stronger. Make the decision from evidence, not exhaustion."
      }

      return "Focus on the controllable part of career growth: clearer ownership, visible progress updates, and one direct conversation about expectations. Avoid treating delay as proof that your effort is wasted."

    case "business":
      return "A business decision needs evidence, not certainty. Check demand, costs, runway, partner reliability, and the downside if profit takes longer than expected."

    case "money":
      return "Do not make the money decision from panic. Start with your monthly baseline, protect essential cash flow, reduce avoidable leakage, and avoid risks that depend on a guaranteed outcome."

    case "relationship":
      if (/\bex\b/.test(normalized)) {
        return "Do not go back only because the old bond feels familiar. Look for changed behavior, clearer communication, and emotional steadiness before reopening the relationship."
      }

      return "Do not turn this into self-blame. Look at consistency, communication, emotional safety, and whether your next step comes from clarity or fear."

    case "marriage":
      if (/\bexact month\b|\bdefinitely\b|\bsoon\b/.test(normalized)) {
        return "I would not give a guaranteed marriage month. A healthier focus is readiness, compatibility, family pressure, and whether the decision is becoming clearer rather than more fearful."
      }

      return "Do not treat marriage delay as proof of bad luck. Focus on readiness, compatibility, communication, and whether the decision is being made from steadiness rather than pressure."

    case "family":
      if (/\bparents.*agree\b|\bforce\b/.test(normalized)) {
        return "Astrology cannot force another person to agree. The practical step is to speak clearly, reduce blame, and decide which boundary you can hold respectfully."
      }

      return "Separate duty from guilt. Choose one boundary you can say calmly, and keep the next conversation focused on what you can actually do without losing yourself."

    case "education":
      return "Do not choose education only because of the chart. Compare the option by effort, time, cost, usefulness, and whether you can sustain the routine needed to complete it."

    case "foreign":
      return "Foreign settlement is possible only through real-world preparation, not guarantee. Check documents, skills, finances, visa realities, and whether the move improves stability rather than only escaping pressure."

    case "remedy":
      return "Choose a remedy that is simple, free or low-cost, and optional: a steady routine, a few minutes of prayer or mantra if it calms you, basic journaling, and one practical action toward the problem."

    case "spiritual":
      return "Keep spiritual practice calm and non-fear-based. A simple daily prayer, grounding routine, or quiet reflection is enough; avoid expensive or panic-driven remedies."

    case "sleep":
      return "For tonight, keep the support practical: reduce screens, avoid late caffeine, slow your breathing for a few minutes, and write down one worry so your mind does not keep carrying it."

    case "timing":
      return "Treat timing as preparation, not certainty. Focus on what can be made ready now and avoid forcing a decision only because you want a guaranteed date."

    case "mixed":
      return "Handle this as a prioritization question. Compare job, business, and study by risk, time, money, and long-term usefulness, then choose the safest next step rather than trying to solve everything at once."

    case "general":
    default:
      if (/\bskills\b/.test(normalized)) {
        return "Build skills that improve real options: communication, writing, financial discipline, technical depth, and the ability to present your work clearly. Pick one skill for the next 30 days and practise it consistently."
      }

      if (/\bfocus\b|\boverwhelmed\b|\bgrounded next step\b/.test(normalized)) {
        return "Choose one practical action for today: write down the decision causing the most pressure, identify the smallest safe step, and complete that before asking for a bigger prediction."
      }

      return "Pick one area first: career, relationship, money, family, health, study, spiritual practice, or timing. A narrower question will get a more useful answer than a broad prediction."
  }
}

export function gateFinalUserAnswer(input: FinalResponseGateInput): FinalResponseGateResult {
  if (input.exactFact) {
    return {
      answer: normalizeAnswer(input.draftAnswer),
      replaced: false,
      reason: "exact_fact_passthrough",
    }
  }

  const shortCircuit = getSafetyShortCircuitDomain(input.question)
  const effectiveDomain = shortCircuit?.domain ?? input.domain
  const effectiveSafetyAction = shortCircuit?.safetyAction ?? input.safetyAction

  if (shortCircuit) {
    return {
      answer: normalizeAnswer(
        buildHardReplacementAnswer({
          question: input.question,
          domain: effectiveDomain,
          safetyAction: effectiveSafetyAction,
        }),
      ),
      replaced: true,
      reason: "safety_short_circuit",
    }
  }

  const allowChartAnchors = input.allowChartAnchors ?? userExplicitlyAskedForChartBasis(input.question)
  const allowMemoryContext = input.allowMemoryContext ?? userExplicitlyAskedForMemory(input.question)

  const composed = composeFinalUserAnswer({
    question: input.question,
    draftAnswer: input.draftAnswer,
    domain: effectiveDomain,
    safetyAction: effectiveSafetyAction,
    exactFact: false,
  })

  const contaminated = isContaminatedFinalAnswer({
    question: input.question,
    answer: composed.answer,
    allowChartAnchors,
    allowMemoryContext,
  })

  const quality = validateFinalAnswerQuality({
    answerText: composed.answer,
    rawQuestion: input.question,
    mode: "practical_guidance",
    primaryIntent: effectiveDomain,
    exactFactExpected: false,
  })

  if (contaminated || !quality.allowed) {
    return {
      answer: normalizeAnswer(
        buildHardReplacementAnswer({
          question: input.question,
          domain: effectiveDomain,
          safetyAction: effectiveSafetyAction,
        }),
      ),
      replaced: true,
      reason: contaminated ? "contaminated_rewrite" : "quality_rewrite",
    }
  }

  return {
    answer: normalizeAnswer(composed.answer),
    replaced: composed.repaired,
    reason: composed.repaired ? "composer_cleanup" : "unchanged",
  }
}
