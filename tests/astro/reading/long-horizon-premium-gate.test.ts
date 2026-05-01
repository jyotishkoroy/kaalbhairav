/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest"
import { isLongHorizonPremiumPrediction, LONG_HORIZON_PREMIUM_MESSAGE } from "../../../lib/astro/reading/final-response-gate"

const now = new Date("2026-05-01T00:00:00.000Z")

describe("long horizon premium gate", () => {
  it.each([
    "Give me a prediction for the next 10 years.",
    "Tell me my future for the next 5 years.",
    "What will happen after 4 years?",
    "Give date for after 3 years.",
    "What will happen in 2031?",
    "Will I marry in 2032?",
    "Predict my career in 2035.",
    "Tell me exact date in 2030.",
    "I want a specific date more than 3 years from now.",
  ])("flags long horizon prediction: %s", (question) => {
    expect(isLongHorizonPremiumPrediction(question, now)).toBe(true)
  })

  it.each([
    "Give me a prediction for the next 3 years.",
    "What should I focus on now?",
    "Will I become rich by next year?",
    "Should I change my job this year?",
    "What can I do in the next 3 months?",
    "Give me a simple direction.",
    "Tell me my future.",
    "Where is Sun placed?",
    "What is my Lagna?",
    "Which house is connected to my career?",
  ])("does not flag short or exact-fact request: %s", (question) => {
    expect(isLongHorizonPremiumPrediction(question, now)).toBe(false)
  })

  it("exports the premium message verbatim", () => {
    expect(LONG_HORIZON_PREMIUM_MESSAGE).toBe(
      "Guru of guru (premium version) needed for predictions more than 3years",
    )
  })
})
