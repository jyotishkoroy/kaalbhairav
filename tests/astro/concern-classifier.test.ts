import { describe, expect, it } from 'vitest'
import {
  classifyUserConcern,
  detectEmotionalTone,
  detectHighRiskFlags,
  detectQuestionType,
  detectTopic,
  detectsMonthlyGuidanceRequest,
  detectsPracticalNeed,
  detectsTechnicalRequest,
} from '@/lib/astro/reading/concern-classifier'

describe('Reading V2 concern classifier', () => {
  it('classifies career timing questions', () => {
    expect(classifyUserConcern('When will I get a job?')).toMatchObject({
      topic: 'career',
      questionType: 'timing',
    })
  })

  it('classifies promotion as career', () => {
    const concern = classifyUserConcern('I am working hard and not getting promotion.')

    expect(concern.topic).toBe('career')
  })

  it('classifies tomorrow as timing', () => {
    const concern = classifyUserConcern('how will be my tomorrow?')

    expect(['timing', 'general']).toContain(concern.topic)
    expect(concern.questionType).toBe('timing')
  })

  it('classifies sleep remedy as health or remedy without legal risk', () => {
    const concern = classifyUserConcern('Give me a remedy on my bad sleep cycle.')

    expect(['health', 'remedy']).toContain(concern.topic)
  })

  it('classifies sad marriage delay questions', () => {
    expect(classifyUserConcern('I am tired of waiting for marriage')).toMatchObject({
      topic: 'marriage',
      emotionalTone: 'sad',
      needsReassurance: true,
    })
  })

  it('classifies career decision questions', () => {
    expect(classifyUserConcern('Should I change my job now?')).toMatchObject({
      topic: 'career',
      emotionalTone: 'urgent',
      questionType: 'decision',
      wantsPracticalSteps: true,
    })
  })

  it('classifies relationship confusion questions', () => {
    expect(classifyUserConcern('I am confused about my relationship. Should I continue or move on?')).toMatchObject({
      topic: 'relationship',
      emotionalTone: 'confused',
      questionType: 'decision',
      needsReassurance: true,
      wantsPracticalSteps: true,
    })
  })

  it('classifies money pressure questions', () => {
    expect(classifyUserConcern('Money pressure is increasing. Will my financial condition improve?')).toMatchObject({
      topic: 'money',
      emotionalTone: 'anxious',
      questionType: 'yes_no',
      needsReassurance: true,
    })
  })

  it('classifies health-sensitive questions', () => {
    const concern = classifyUserConcern('Do I have a serious disease according to my chart?')

    expect(concern).toMatchObject({
      topic: 'health',
      questionType: 'yes_no',
      needsReassurance: true,
    })
    expect(concern.highRiskFlags).toContain('medical_diagnosis')
  })

  it('classifies death/lifespan questions as high risk', () => {
    const concern = classifyUserConcern('Can my chart tell when I will die?')

    expect(concern.topic).toBe('death')
    expect(concern.questionType).toBe('timing')
    expect(concern.needsReassurance).toBe(true)
    expect(concern.highRiskFlags).toContain('death_prediction')
  })

  it('classifies remedy requests', () => {
    expect(classifyUserConcern('What remedy should I do for career delay?')).toMatchObject({
      topic: 'career',
      questionType: 'remedy',
      wantsPracticalSteps: true,
    })
  })

  it('detects technical astrology requests', () => {
    const concern = classifyUserConcern('Explain my Saturn Mahadasha and Moon nakshatra.')

    expect(concern.wantsTechnicalAstrology).toBe(true)
    expect(concern.questionType).toBe('explanation')
  })

  it('detects education questions', () => {
    expect(detectTopic('Will I get admission to a good college?')).toBe('education')
  })

  it('detects family questions', () => {
    expect(detectTopic('Will my relationship with my father improve?')).toBe('family')
  })

  it('detects spirituality questions', () => {
    expect(detectTopic('What is my spiritual path and dharma?')).toBe('spirituality')
  })

  it('detects general questions when no topic matches', () => {
    expect(detectTopic('What is going on in my life?')).toBe('general')
  })

  it('detects timing, decision, explanation, remedy, yes/no, and general question types', () => {
    expect(detectQuestionType('When will things improve?')).toBe('timing')
    expect(detectQuestionType('Should I leave this job?')).toBe('decision')
    expect(detectQuestionType('Why is this happening?')).toBe('explanation')
    expect(detectQuestionType('What remedy should I do?')).toBe('remedy')
    expect(detectQuestionType('Will I succeed?')).toBe('yes_no')
    expect(detectQuestionType('Tell me about this situation')).toBe('general_prediction')
  })

  it('detects emotional tones', () => {
    expect(detectEmotionalTone('I am tired of waiting')).toBe('sad')
    expect(detectEmotionalTone('I am frustrated with work')).toBe('angry')
    expect(detectEmotionalTone('I am confused and stuck')).toBe('confused')
    expect(detectEmotionalTone('I feel pressure and worry')).toBe('anxious')
    expect(detectEmotionalTone('I hope things improve')).toBe('hopeful')
    expect(detectEmotionalTone('I need help right now')).toBe('urgent')
    expect(detectEmotionalTone('Tell me about my chart')).toBe('calm')
  })

  it('detects high risk flags', () => {
    expect(detectHighRiskFlags('Can astrology diagnose cancer?')).toContain('medical_diagnosis')
    expect(detectHighRiskFlags('When will I die?')).toContain('death_prediction')
    expect(detectHighRiskFlags('Will I go to jail?')).toContain('legal_certainty')
    expect(detectHighRiskFlags('Am I cursed?')).toContain('fear_based')
    expect(detectHighRiskFlags('I want to kill myself')).toContain('self_harm')
  })

  it('detects practical and technical needs independently', () => {
    expect(detectsPracticalNeed('What should I do next?')).toBe(true)
    expect(detectsTechnicalRequest('Show my dasha and transit')).toBe(true)
    expect(detectsPracticalNeed('Tell me about career')).toBe(false)
    expect(detectsTechnicalRequest('Tell me about career')).toBe(false)
  })

  it('detects monthly guidance requests', () => {
    expect(detectsMonthlyGuidanceRequest('What is my guidance for this month?')).toBe(true)
    expect(detectsMonthlyGuidanceRequest('How is this month for career?')).toBe(true)
    expect(detectsMonthlyGuidanceRequest('When will I get a job?')).toBe(false)
  })
})
