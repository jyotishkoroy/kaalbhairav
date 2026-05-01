/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseQuestionFrame } from "../lib/astro/rag/question-frame-parser.ts"
import { routeStructuredIntent } from "../lib/astro/rag/structured-intent-router.ts"
import { validateFinalAnswerQuality } from "../lib/astro/validation/final-answer-quality-validator.ts"
import type { FinalAnswerQualityFailure } from "../lib/astro/validation/final-answer-quality-types.ts"

type BulkRegressionCase = {
  id: string
  category: string
  question: string
  badAnswer: string
  goodAnswer?: string
  expectedFailures: FinalAnswerQualityFailure[]
  expectedIntent?: string
  expectedMode?: string
  expectedDomain?: string
  notes?: string
}

type BulkRegressionReport = {
  total: number
  passed: number
  failed: number
  failures: Array<{
    id: string
    category: string
    question: string
    expectedFailures: string[]
    actualFailures: string[]
    reason: string
    answerSnippet: string
  }>
}

function loadBank(): BulkRegressionCase[] {
  const fixturePath = path.resolve(process.cwd(), "tests/astro/fixtures/bulk-answer-quality-regression-bank.json")
  const raw = fs.readFileSync(fixturePath, "utf8")
  const parsed = JSON.parse(raw)

  if (!Array.isArray(parsed)) {
    throw new Error("Bulk regression bank must be a JSON array")
  }

  return parsed as BulkRegressionCase[]
}

function assertCaseShape(testCase: BulkRegressionCase): string[] {
  const errors: string[] = []

  if (!testCase.id || typeof testCase.id !== "string") errors.push("missing id")
  if (!testCase.category || typeof testCase.category !== "string") errors.push("missing category")
  if (!testCase.question || typeof testCase.question !== "string") errors.push("missing question")
  if (!testCase.badAnswer || typeof testCase.badAnswer !== "string") errors.push("missing badAnswer")
  if (!Array.isArray(testCase.expectedFailures) || testCase.expectedFailures.length === 0) {
    errors.push("missing expectedFailures")
  }

  return errors
}

function includesAllExpectedFailures(actual: readonly string[], expected: readonly string[]): boolean {
  return expected.every((failure) => actual.includes(failure))
}

export function runBulkAnswerQualityRegression(cases: BulkRegressionCase[]): BulkRegressionReport {
  const failures: BulkRegressionReport["failures"] = []

  for (const testCase of cases) {
    const shapeErrors = assertCaseShape(testCase)

    if (shapeErrors.length > 0) {
      failures.push({
        id: testCase.id ?? "(missing id)",
        category: testCase.category ?? "(missing category)",
        question: testCase.question ?? "",
        expectedFailures: testCase.expectedFailures ?? [],
        actualFailures: [],
        reason: `Invalid fixture shape: ${shapeErrors.join(", ")}`,
        answerSnippet: String(testCase.badAnswer ?? "").slice(0, 240),
      })
      continue
    }

    const questionFrame = parseQuestionFrame(testCase.question)
    const intent = routeStructuredIntent({
      rawQuestion: testCase.question,
      questionFrame,
    })

    if (testCase.expectedIntent && intent.primaryIntent !== testCase.expectedIntent) {
      failures.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        expectedFailures: testCase.expectedFailures,
        actualFailures: [],
        reason: `Expected intent ${testCase.expectedIntent} but got ${intent.primaryIntent}`,
        answerSnippet: testCase.badAnswer.slice(0, 240),
      })
      continue
    }

    if (testCase.expectedMode && intent.mode !== testCase.expectedMode) {
      failures.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        expectedFailures: testCase.expectedFailures,
        actualFailures: [],
        reason: `Expected mode ${testCase.expectedMode} but got ${intent.mode}`,
        answerSnippet: testCase.badAnswer.slice(0, 240),
      })
      continue
    }

    const quality = validateFinalAnswerQuality({
      answerText: testCase.badAnswer,
      rawQuestion: testCase.question,
      coreQuestion: questionFrame.coreQuestion,
      mode: intent.mode,
      primaryIntent: intent.primaryIntent,
      secondaryIntents: intent.secondaryIntents,
      exactFactExpected: intent.primaryIntent === "exact_fact",
      expectedDomain: testCase.expectedDomain,
    })

    const actualFailures = quality.failures

    if (quality.allowed || !includesAllExpectedFailures(actualFailures, testCase.expectedFailures)) {
      failures.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        expectedFailures: testCase.expectedFailures,
        actualFailures,
        reason: quality.allowed
          ? "Bad answer was unexpectedly allowed"
          : "Actual failures did not include all expected failures",
        answerSnippet: testCase.badAnswer.slice(0, 240),
      })
      continue
    }

    if (testCase.goodAnswer) {
      const goodQuality = validateFinalAnswerQuality({
        answerText: testCase.goodAnswer,
        rawQuestion: testCase.question,
        coreQuestion: questionFrame.coreQuestion,
        mode: intent.mode,
        primaryIntent: intent.primaryIntent,
        secondaryIntents: intent.secondaryIntents,
        exactFactExpected: intent.primaryIntent === "exact_fact",
        expectedDomain: testCase.expectedDomain,
      })

      if (!goodQuality.allowed) {
        failures.push({
          id: testCase.id,
          category: testCase.category,
          question: testCase.question,
          expectedFailures: [],
          actualFailures: goodQuality.failures,
          reason: "Good answer was unexpectedly rejected",
          answerSnippet: testCase.goodAnswer.slice(0, 240),
        })
      }
    }
  }

  return {
    total: cases.length,
    failed: failures.length,
    passed: cases.length - failures.length,
    failures,
  }
}

function main(): void {
  const cases = loadBank()
  const report = runBulkAnswerQualityRegression(cases)

  console.log(
    JSON.stringify(
      {
        total: report.total,
        passed: report.passed,
        failed: report.failed,
      },
      null,
      2,
    ),
  )

  if (report.failures.length > 0) {
    console.error(JSON.stringify({ failures: report.failures.slice(0, 25) }, null, 2))
    process.exitCode = 1
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isDirectRun) {
  main()
}
