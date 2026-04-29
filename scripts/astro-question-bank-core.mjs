import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const JYOTISHKO_CHART_ANCHORS = {
  identity: {
    lagna: 'Leo',
    rasi: 'Gemini',
    currentMahadasha: 'Jupiter Mahadasha from 22 Aug 2018 to 22 Aug 2034',
  },
}

const CHART_DOMAIN_PROFILES = Array.from({ length: 26 }, (_, index) => ({
  id: index + 1,
  domain: [
    'Identity, Personality, Core Temperament',
    'Physical Health, Vitality',
    'Mental Health, Stress',
    'Education, Study, Knowledge',
    'Career, Work, Profession',
    'Business, Contracts, Legal',
    'Money, Income, Wealth',
    'Love, Dating, Romance',
    'Marriage, Partnership',
    'Family, Parents, Siblings',
    'Children, Parenting',
    'Friends, Networks, Community',
    'Home, Property, Vehicles',
    'Relocation, Foreign Travel',
    'Spirituality, Dharma',
    'Reputation, Public Authority',
    'Law, Conflict, Competitors',
    'Hidden Matters, Losses',
    'Travel, Movement',
    'Creativity, Writing, Media',
    'Daily Habits, Lifestyle',
    'Decision-making, Risk',
    'Service, Charity, Ethics',
    'Aging, Life Phases',
    '2026-2027 Specific Timing',
    'Astrology Accuracy, Ethics, Method Limits',
  ][index],
  topicKeys: ['career', 'job', 'work', 'timing', 'health', 'money', 'marriage', 'family', 'education', 'remedy'],
  coreLogic: 'Use the chart anchors, not generic astrology.',
  mustUseAnchors: ['Leo Lagna', 'Moon in Gemini 11th', 'Sun in Taurus 10th'],
}))

const BASE_TEMPLATES = [
  'What is the deepest contradiction in {domain}?',
  'Where does strength become weakness in {domain}?',
  'What hidden risk is easy to ignore in {domain}?',
  'What should I do first about {domain}?',
  'What should I avoid in {domain}?',
  'Can this area improve in {timing}?',
  'What should I track in {domain}?',
  'What evidence would confirm this reading?',
  'What could make this reading wrong?',
  'Give me conservative advice about {domain}.',
  'Give me high-risk/high-reward advice about {domain}.',
  'Give me a yes/no style answer about {domain}.',
  'Give me timing guidance about {domain}.',
  'Give me remedial guidance about {domain}.',
  'Give me psychological insight about {domain}.',
  'Compare two options in {domain}.',
  'What is likely if I decide quickly?',
  'What is likely if I wait?',
  'How does Jupiter Mahadasha affect {domain}?',
  'How does 2026-2027 Varshaphal affect {domain}?',
  'What is the role of Leo Lagna in {domain}?',
  'What is the role of Gemini Moon/Mercury in {domain}?',
  'What is the role of Rahu/Venus 12th in {domain}?',
  'What is the role of Ketu 6th in {domain}?',
  'What follow-up question should I ask about {domain}?',
]

const TIMING_CONTEXTS = [
  'during Jupiter Mahadasha before 2034',
  'during Jupiter-Ketu/Jupiter-Venus transition of 2026',
  'during 2026-2027 Varshaphal year',
  'during a stressful Rahu or 12th-house period',
  'during a strong Sun/10th-house career phase',
  'during Mercury/networking or 11th-house phase',
  'during Saturn responsibility phase',
  'before age 32',
  'after age 32',
  'after age 35',
  'when finances are expanding',
  'when expenses are rising',
  'when relationships feel intense',
  'when health or sleep is weak',
  'when career visibility increases',
  'when foreign opportunities appear',
  'when family pressure is high',
  'when making a partnership decision',
  'when choosing education/certification',
  'when facing legal or competitive pressure',
]

const SCENARIO_SLICES = [
  'if the native asks what to avoid',
  'if the native asks what to do first',
  'if the native asks what to track',
  'if the native asks what evidence would confirm the reading',
]

const SEED_TEMPLATES = [
  'What is the deepest contradiction in {domain}?',
  'What should I do first about {domain}?',
  'What should I avoid in {domain}?',
  'How does Jupiter Mahadasha affect {domain}?',
  'How does 2026-2027 Varshaphal affect {domain}?',
  'What should I track in {domain}?',
  'What follow-up question should I ask about {domain}?',
  'Give me conservative advice about {domain}.',
]

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function buildQuestion(template, domain, timing, scenario) {
  return template
    .replaceAll('{domain}', domain.domain.toLowerCase())
    .replaceAll('{timing}', timing)
    .trim() + `, ${scenario}.`
}

function buildCase(domain, templateIndex, timingIndex, sliceIndex, id) {
  const template = BASE_TEMPLATES[templateIndex]
  const timing = TIMING_CONTEXTS[timingIndex]
  const scenario = SCENARIO_SLICES[sliceIndex]
  const question = buildQuestion(template, domain, timing, scenario)
  const anchor = domain.mustUseAnchors[0] ?? JYOTISHKO_CHART_ANCHORS.identity.lagna

  return {
    id,
    domainId: domain.id,
    domain: domain.domain,
    question,
    expectedAnswerStyle: `${domain.coreLogic} Use ${anchor} and related chart facts. ${scenario}.`,
    expectedReasoningAnchors: [...domain.mustUseAnchors],
    expectedAccuracyClass: domain.id === 2 || domain.id === 26 ? 'supportive-only' : timing.includes('2026') ? 'tendency' : 'partial',
    readingStyle: timing.includes('timing') || template.includes('timing') || template.includes('when') ? 'timing' : 'practical',
    expectedFollowUpQuestion: `Which sub-area of ${domain.domain.toLowerCase()} should I narrow next?`,
    expectedFollowUpAnswer: `Anchor the reading to ${domain.mustUseAnchors.slice(0, 2).join(' and ')} and avoid generic advice.`,
    expectedFollowUpReason: 'Narrowing the topic prevents generic answers.',
    expectedTopic: slugify(domain.domain),
    expectedMode: timing.includes('timing') || template.includes('When') ? 'timing_prediction' : 'practical_guidance',
    expectedMustIncludeAny: domain.topicKeys.slice(0, 6),
    expectedMustNotIncludeAny: domain.id === 2 ? ['death date', 'lifespan'] : ['generic monthly report'],
    allowMedicalBoundary: domain.id === 2 || domain.id === 26,
    allowLegalBoundary: domain.id === 6 || domain.id === 17,
    allowDeathBoundary: domain.id === 26,
    allowMonthly: domain.id === 25,
    allowRemedy: domain.id === 21 || domain.id === 23 || template.includes('remedial'),
  }
}

function domainToExpectedTopic(domain) {
  const lower = domain.domain.toLowerCase()
  if (lower.includes('health')) return 'health'
  if (lower.includes('career')) return 'career'
  if (lower.includes('money')) return 'money'
  if (lower.includes('marriage')) return 'marriage'
  if (lower.includes('love')) return 'relationship'
  if (lower.includes('education')) return 'education'
  if (lower.includes('family')) return 'family'
  if (lower.includes('spiritual')) return 'spirituality'
  if (lower.includes('law')) return 'general'
  if (lower.includes('timing')) return 'general'
  return 'general'
}

export function generateSeedCases() {
  const cases = []
  let id = 1
  for (const domain of CHART_DOMAIN_PROFILES) {
    for (const template of SEED_TEMPLATES) {
      cases.push({
        id,
        domainId: domain.id,
        domain: domain.domain,
        question: template.replace('{domain}', domain.domain.toLowerCase()),
        expectedAnswerStyle: domain.coreLogic,
        expectedReasoningAnchors: [...domain.mustUseAnchors],
        expectedAccuracyClass: domain.id === 2 || domain.id === 26 ? 'supportive-only' : 'partial',
        readingStyle: 'practical',
        expectedFollowUpQuestion: `Which sub-area of ${domain.domain.toLowerCase()} should I narrow next?`,
        expectedFollowUpAnswer: `Anchor the reading to ${domain.mustUseAnchors.slice(0, 2).join(' and ')}.`,
        expectedFollowUpReason: 'Narrowing the topic prevents generic answers.',
        expectedTopic: domainToExpectedTopic(domain),
        expectedMode: template.includes('Jupiter') || template.includes('2026') ? 'timing_prediction' : 'practical_guidance',
        expectedMustIncludeAny: domain.mustUseAnchors.map((anchor) => anchor.split(' ')[0].toLowerCase()).slice(0, 3),
        expectedMustNotIncludeAny: ['generic monthly report'],
        allowMedicalBoundary: domain.id === 2 || domain.id === 26,
        allowLegalBoundary: domain.id === 6 || domain.id === 17,
        allowDeathBoundary: domain.id === 26,
        allowMonthly: domain.id === 25,
        allowRemedy: domain.id === 21 || domain.id === 23,
      })
      id += 1
    }
  }
  return cases
}

export function generateQuestionBankRecords() {
  const records = []
  let id = 1
  for (const domain of CHART_DOMAIN_PROFILES) {
    for (let t = 0; t < BASE_TEMPLATES.length; t += 1) {
      for (let ti = 0; ti < TIMING_CONTEXTS.length; ti += 1) {
        for (let s = 0; s < SCENARIO_SLICES.length; s += 1) {
          records.push(buildCase(domain, t, ti, s, id))
          id += 1
        }
      }
    }
  }
  return records
}

export function summarizeQuestionBank(records) {
  const byDomain = Object.create(null)
  for (const record of records) {
    byDomain[record.domain] = (byDomain[record.domain] ?? 0) + 1
  }
  return {
    totalRecords: records.length,
    domainCount: Object.keys(byDomain).length,
    byDomain,
    anchors: JYOTISHKO_CHART_ANCHORS,
  }
}

export function getGeneratedPaths() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  return {
    generatedDir: path.join(root, 'generated', 'astro-v2-question-bank'),
    jsonlPath: path.join(root, 'generated', 'astro-v2-question-bank', 'generated-question-bank.jsonl'),
    summaryPath: path.join(root, 'generated', 'astro-v2-question-bank', 'generated-question-bank-summary.json'),
  }
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}
