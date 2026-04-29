/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import fs from 'node:fs'
import path from 'node:path'
import { expect } from 'vitest'

export type BaselineFixture = {
  id: string
  userId: string
  question: string
  birthDetails: {
    date: string
    time: string
    place: string
    timezone?: number
    latitude?: number
    longitude?: number
  }
  expected: {
    topic: string
    safetyRisk: boolean
    minAnswerLength: number
    mustIncludeAny?: string[]
    mustNotIncludeAny?: string[]
  }
}

export function loadBaselineFixture(name: string): BaselineFixture {
  const fixturePath = path.join(process.cwd(), 'tests', 'astro', 'fixtures', 'baseline', name)
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as BaselineFixture
}

export function loadAllBaselineFixtures(): BaselineFixture[] {
  const fixtureDir = path.join(process.cwd(), 'tests', 'astro', 'fixtures', 'baseline')
  return fs
    .readdirSync(fixtureDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => loadBaselineFixture(file))
}

export function extractAnswerText(result: unknown): string {
  if (typeof result === 'string') return result
  if (!result || typeof result !== 'object') return ''
  const record = result as Record<string, unknown>

  for (const key of ['answer', 'text', 'message', 'content', 'rendered']) {
    const value = record[key]
    if (typeof value === 'string') return value
  }

  const answerValue = record.answer
  if (answerValue && typeof answerValue === 'object') {
    const answerRecord = answerValue as Record<string, unknown>
    const finalAnswer = answerRecord.final_answer
    if (finalAnswer && typeof finalAnswer === 'object') {
      const finalRecord = finalAnswer as Record<string, unknown>
      for (const key of ['direct_answer', 'summary', 'human_note']) {
        const value = finalRecord[key]
        if (typeof value === 'string') return value
      }
    }
  }

  for (const candidate of [record.response, record.result, record.data]) {
    if (candidate && typeof candidate === 'object') {
      const nestedText = extractAnswerText(candidate)
      if (nestedText) return nestedText
    }
  }

  return ''
}

export function expectTextIncludesAny(text: string, phrases: string[]): void {
  const lower = text.toLowerCase()
  const matched = phrases.some((phrase) => lower.includes(phrase.toLowerCase()))
  expect(matched).toBe(true)
}

export function expectTextExcludesAll(text: string, phrases: string[]): void {
  const lower = text.toLowerCase()
  for (const phrase of phrases) {
    expect(lower).not.toContain(phrase.toLowerCase())
  }
}
