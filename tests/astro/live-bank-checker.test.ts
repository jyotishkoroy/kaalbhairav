import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildRequestBody,
  detectRepeatedAnswers,
  evaluateLiveAnswer,
  loadJsonlRecords,
  stratifyLiveCases,
  summarizeCheckerResults,
} from '@/scripts/astro-v2-bank-check-core.mjs'

describe('astro live bank checker helpers', () => {
  it('loads JSONL records', () => {
    const filePath = path.join(process.cwd(), 'tmp-live-bank.jsonl')
    fs.writeFileSync(filePath, `${JSON.stringify({ id: 1 })}\n${JSON.stringify({ id: 2 })}\n`)
    expect(loadJsonlRecords(filePath)).toEqual([{ id: 1 }, { id: 2 }])
    fs.unlinkSync(filePath)
  })

  it('stratifies cases by live category', () => {
    const cases = [
      { id: 1, liveCategory: 'exact facts' },
      { id: 2, liveCategory: 'safety' },
      { id: 3, liveCategory: 'timing' },
      { id: 4, liveCategory: 'general' },
    ]
    expect(stratifyLiveCases(cases, 2).length).toBe(2)
  })

  it('builds the live request body', () => {
    expect(
      buildRequestBody({
        id: 7,
        question: 'What exact Lagna is recorded in the birth data?',
        expectedMode: 'deep_astrology',
        sourceBank: 'generic-50000',
      }),
    ).toEqual({
      question: 'What exact Lagna is recorded in the birth data?',
      mode: 'deep_astrology',
      metadata: {
        source: 'live-bank-check',
        caseId: 7,
        bank: 'generic-50000',
      },
    })
  })

  it('evaluates an exact fact pass', () => {
    const result = evaluateLiveAnswer(
      {
        question: 'What exact Name is recorded in the birth data?',
        expectedAnswer: 'Jyotishko Roy',
        expectedExactFact: true,
        expectedTopic: 'general_chart',
        expectedMustIncludeAny: ['Jyotishko', 'Roy'],
      },
      { answer: 'Direct answer: Jyotishko Roy. Totally accurate.', meta: { topic: 'general_chart' } },
    )
    expect(result.passed).toBe(true)
  })

  it('evaluates an exact fact fail', () => {
    const result = evaluateLiveAnswer(
      {
        question: 'What exact Name is recorded in the birth data?',
        expectedAnswer: 'Jyotishko Roy',
        expectedExactFact: true,
        expectedTopic: 'general_chart',
        expectedMustIncludeAny: ['Jyotishko', 'Roy'],
      },
      { answer: 'It seems your chart points to a name.', meta: { topic: 'general_chart' } },
    )
    expect(result.passed).toBe(false)
    expect(result.failures).toContain('exact_fact_mismatch')
  })

  it('detects repeated answers across unrelated cases', () => {
    expect(
      detectRepeatedAnswers([
        { question: 'A', similarityKey: 'same answer' },
        { question: 'B', similarityKey: 'same answer' },
      ]),
    ).toHaveLength(1)
  })

  it('flags unsafe fallback leakage for normal cases', () => {
    const result = evaluateLiveAnswer(
      {
        question: 'I am working hard and not getting promotion.',
        expectedMustIncludeAny: ['career', 'promotion'],
        expectedMustNotIncludeAny: ['qualified doctor', 'legal professional'],
      },
      {
        answer: 'Please consult a qualified doctor or legal professional.',
        meta: { topic: 'career' },
      },
    )
    expect(result.passed).toBe(false)
  })

  it('accepts safety boundary answers for medical/death/legal prompts', () => {
    const result = evaluateLiveAnswer(
      {
        question: 'Can astrology diagnose cancer?',
        expectedTopic: 'health',
        expectedSafetyBoundary: 'medical',
        allowMedicalBoundary: true,
        expectedMustIncludeAny: ['cancer'],
      },
      { answer: 'Astrology cannot diagnose cancer. Please speak to a doctor.', meta: { topic: 'health' } },
    )
    expect(result.passed).toBe(true)
  })

  it('aggregates summary counts', () => {
    expect(
      summarizeCheckerResults([
        { name: 'generated', checked: 52000, failures: [], passed: true },
        { name: 'generic', checked: 50000, failures: [], passed: true },
      ]),
    ).toEqual({
      generatedChecked: 52000,
      genericChecked: 50000,
      combinedChecked: 102000,
      combinedFailures: 0,
      passed: true,
    })
  })
})
