/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, expect, it } from 'vitest'
import { generateQuestionBankRecords, summarizeQuestionBank } from '../../scripts/astro-question-bank-core.mjs'

describe('astro v2 question bank generator', () => {
  it('generates exactly 52000 cases with 26 domains', () => {
    const records = generateQuestionBankRecords()
    const summary = summarizeQuestionBank(records)

    expect(records).toHaveLength(52000)
    expect(summary.totalRecords).toBe(52000)
    expect(summary.domainCount).toBe(26)
    expect(Object.values(summary.byDomain)).toEqual(Array(26).fill(2000))
    expect(records.every((record) => record.question.length > 0)).toBe(true)
    expect(records.every((record) => record.expectedMustIncludeAny.length > 0)).toBe(true)
  })
})

