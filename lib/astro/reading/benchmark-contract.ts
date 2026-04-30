import { compareSarvashtakavarga, getHouseInfo } from '@/lib/astro/reading/chart-facts'
import { classifyUserConcern, detectHighRiskFlags } from '@/lib/astro/reading/concern-classifier'
import { getChartProfileForTopic, getChartDomainProfiles } from '@/lib/astro/reading/chart-anchors'

export type BenchmarkAccuracy =
  | 'Totally accurate'
  | 'Partially accurate'
  | 'Inaccurate'
  | 'Inaccurate as certainty; partially accurate as tendency'
  | 'Partially accurate; not medical/legal certainty'
  | 'Totally accurate only for chart math; otherwise partial or inaccurate by framing'

export type BenchmarkAnswerContract = {
  question: string
  normalizedQuestion?: string
  domainId?: number
  domainName: string
  topic: string
  answerKind: 'exact_fact' | 'derived_chart_fact' | 'interpretive_tendency' | 'safety_boundary' | 'ethics_limitation'
  accuracyClass: BenchmarkAccuracy
  readingStyle: string
  directAnswer: string
  reasoning: string
  chartAnchors: string[]
  practicalGuidance: string[]
  caution: string
  followUpQuestion: string
  followUpAnswer: string
  followUpReason: string
  mustNotSay: string[]
}

function lower(value: string) {
  return value.toLowerCase().trim()
}

function hasAny(text: string, terms: string[]) {
  const q = lower(text)
  return terms.some((term) => q.includes(lower(term)))
}

function domainProfile(topic: string) {
  return (
    getChartProfileForTopic(topic) ??
    getChartDomainProfiles().find((profile) => profile.domain.toLowerCase().includes(topic.toLowerCase()))
  )
}

function exactContract(input: {
  question: string
  domainId?: number
  domainName?: string
  topic?: string
  directAnswer: string
  reasoning: string
  chartAnchors: string[]
  followUpQuestion: string
  followUpAnswer: string
  followUpReason: string
  nextTopic?: string
}): BenchmarkAnswerContract {
  return {
    question: input.question,
    normalizedQuestion: lower(input.question),
    domainId: input.domainId ?? 1,
    domainName: input.domainName ?? 'Birth Data',
    topic: input.topic ?? 'birth_data',
    answerKind: 'exact_fact',
    accuracyClass: 'Totally accurate',
    readingStyle: 'exact_fact',
    directAnswer: input.directAnswer,
    reasoning: input.reasoning,
    chartAnchors: input.chartAnchors,
    practicalGuidance: ['Read directly from the chart data or a deterministic derived table.'],
    caution: 'This is an exact chart fact, not an interpretation.',
    followUpQuestion: input.followUpQuestion,
    followUpAnswer: input.followUpAnswer,
    followUpReason: input.followUpReason,
    mustNotSay: ['tendency', 'guaranteed', 'predicts your future'],
  }
}

function derivedContract(input: {
  question: string
  domainId?: number
  domainName: string
  topic: string
  directAnswer: string
  reasoning: string
  chartAnchors: string[]
  practicalGuidance: string[]
  caution: string
  followUpQuestion: string
  followUpAnswer: string
  followUpReason: string
  accuracyClass?: BenchmarkAccuracy
  readingStyle?: string
  mustNotSay?: string[]
}): BenchmarkAnswerContract {
  return {
    question: input.question,
    normalizedQuestion: lower(input.question),
    domainId: input.domainId,
    domainName: input.domainName,
    topic: input.topic,
    answerKind: 'derived_chart_fact',
    accuracyClass: input.accuracyClass ?? 'Totally accurate',
    readingStyle: input.readingStyle ?? input.domainName,
    directAnswer: input.directAnswer,
    reasoning: input.reasoning,
    chartAnchors: input.chartAnchors,
    practicalGuidance: input.practicalGuidance,
    caution: input.caution,
    followUpQuestion: input.followUpQuestion,
    followUpAnswer: input.followUpAnswer,
    followUpReason: input.followUpReason,
    mustNotSay: input.mustNotSay ?? ['guaranteed', 'certainly'],
  }
}

function safetyContract(input: {
  question: string
  topic: 'health' | 'death' | 'legal' | 'general'
  domainName: string
  directAnswer: string
  reasoning: string
  chartAnchors: string[]
  practicalGuidance: string[]
  caution: string
  followUpQuestion: string
  followUpAnswer: string
  followUpReason: string
}): BenchmarkAnswerContract {
  return {
    question: input.question,
    normalizedQuestion: lower(input.question),
    domainName: input.domainName,
    topic: input.topic,
    answerKind: input.topic === 'death' ? 'ethics_limitation' : 'safety_boundary',
    accuracyClass:
      input.topic === 'death'
        ? 'Inaccurate as certainty; partially accurate as tendency'
        : 'Partially accurate; not medical/legal certainty',
    readingStyle: 'risk-management',
    directAnswer: input.directAnswer,
    reasoning: input.reasoning,
    chartAnchors: input.chartAnchors,
    practicalGuidance: input.practicalGuidance,
    caution: input.caution,
    followUpQuestion: input.followUpQuestion,
    followUpAnswer: input.followUpAnswer,
    followUpReason: input.followUpReason,
    mustNotSay:
      input.topic === 'health'
        ? ['diagnose', 'cancer', 'medical certainty']
        : input.topic === 'death'
          ? ['death date', 'lifespan', 'when you will die']
          : ['legal certainty', 'lawyer replacement'],
  }
}

function interpretiveBase(
  topic: string,
  profileName: string,
  anchors: string[],
): Pick<
  BenchmarkAnswerContract,
  | 'answerKind'
  | 'accuracyClass'
  | 'readingStyle'
  | 'chartAnchors'
  | 'practicalGuidance'
  | 'caution'
  | 'followUpQuestion'
  | 'followUpAnswer'
  | 'followUpReason'
  | 'mustNotSay'
> {
  const practicalGuidance =
    topic === 'career'
      ? ['Document output and measurable responsibility.', 'Use networks and communication to increase visibility.', 'Do not force a promise date.']
      : topic === 'health'
        ? ['Protect sleep, routine, and symptom monitoring.', 'Reduce stimulation before bed.', 'Use astrology only as a wellness prompt.']
        : topic === 'money'
          ? ['Prefer structure over speculation.', 'Keep expenses visible and deliberate.', 'Use networks for income, not guesswork.']
          : topic === 'marriage'
            ? ['Prioritize maturity, clarity, and privacy.', 'Avoid idealization and secret expectations.']
            : topic === 'education'
              ? ['Use study systems, writing, research, and certification.', 'Keep effort consistent.']
              : topic === 'spirituality'
                ? ['Practice disciplined learning and ethics.', 'Prefer a teacher or structured path.']
                : topic === 'foreign'
                  ? ['Expect paperwork and expense management.', 'Use network support and plan buffers.']
                  : topic === 'legal'
                    ? ['Keep documentation organized.', 'Get professional legal advice.']
                    : ['Stay concrete and avoid turning tendency into certainty.']

  const followUpQuestion =
    topic === 'career'
      ? 'Which matters more right now: promotion, role fit, or income growth?'
      : topic === 'money'
        ? 'Do you want help with income growth or expense control?'
        : topic === 'health'
          ? 'What symptom or routine issue should we narrow next?'
          : topic === 'marriage'
            ? 'Do you want timing, compatibility, or conduct guidance next?'
            : topic === 'education'
              ? 'Do you want exam strategy, course choice, or study routine guidance?'
              : topic === 'foreign'
                ? 'Do you want travel timing, visa paperwork, or relocation cost guidance?'
                : topic === 'spirituality'
                  ? 'Do you want dharma, mantra, or teacher guidance next?'
                  : topic === 'legal'
                    ? 'Do you want help with documentation, timing, or dispute strategy?'
                    : 'Which sub-area should I narrow next?'

  const followUpAnswer =
    topic === 'career'
      ? 'Promotion is read through Sun-in-10th visibility and Mercury-Moon gains; the next step is measurable responsibility.'
      : topic === 'money'
        ? 'Income grows through Mercury-Moon network activity, while Venus and Rahu in the 12th mean expense control matters.'
        : topic === 'health'
          ? 'Routine, reduced stimulation, and medical care for symptoms matter more than certainty language.'
          : topic === 'marriage'
            ? 'Read readiness through Venus, Saturn, and privacy themes before assuming a fixed outcome.'
            : topic === 'education'
              ? 'Use Mercury support for structured study and keep the effort repeatable.'
              : topic === 'foreign'
                ? 'Foreign movement is supported, but the 12th-house cost and paperwork side must be planned.'
                : topic === 'spirituality'
                  ? 'Jupiter and Saturn in the 9th favor disciplined learning over dramatic claims.'
                  : topic === 'legal'
                    ? 'Document facts, consult a professional, and avoid treating astrology as legal advice.'
                    : 'Keep the next question narrow and practical.'

  const followUpReason =
    topic === 'career'
      ? 'The next useful step is whether the question is about responsibility, timing, or visibility.'
      : topic === 'money'
        ? 'A narrower follow-up prevents mixing income, spending, and debt into one vague answer.'
        : topic === 'health'
          ? 'A safer follow-up keeps the answer within wellness and care.'
          : topic === 'marriage'
            ? 'Marriage questions need a sharper boundary between timing and conduct.'
            : topic === 'education'
              ? 'Education questions become actionable when the question is about method, not fate.'
              : topic === 'foreign'
                ? 'Relocation questions need cost, paperwork, and timing separated.'
                : topic === 'spirituality'
                  ? 'Dharma questions improve when framed around practice instead of certainty.'
                  : topic === 'legal'
                    ? 'Legal questions need factual and professional grounding.'
                    : 'A narrower follow-up produces a more useful reading.'

  const caution =
    topic === 'health'
      ? 'Astrology cannot diagnose disease.'
      : topic === 'death'
        ? 'Astrology cannot give a death date or lifespan.'
        : topic === 'legal'
          ? 'Astrology is not a substitute for a lawyer.'
          : 'This is a tendency reading, not a fixed outcome.'

  const mustNotSay =
    topic === 'health'
      ? ['diagnose', 'cancer', 'medical certainty']
      : topic === 'death'
        ? ['death date', 'lifespan', 'when you will die']
        : topic === 'legal'
          ? ['legal certainty', 'lawyer replacement']
          : ['guaranteed', 'certainly', 'definitely']

  return {
    answerKind: 'interpretive_tendency',
    accuracyClass: 'Partially accurate',
    readingStyle: profileName,
    chartAnchors: anchors,
    practicalGuidance,
    caution,
    followUpQuestion,
    followUpAnswer,
    followUpReason,
    mustNotSay,
  }
}

function promptFocus(question: string) {
  const q = lower(question)
  if (hasAny(q, ['deepest contradiction'])) return 'contradiction'
  if (hasAny(q, ['what should i do first', 'what do i do first', 'first about'])) return 'first_step'
  if (hasAny(q, ['what should i avoid', 'what to avoid'])) return 'avoid'
  if (hasAny(q, ['what should i track'])) return 'track'
  if (hasAny(q, ['follow-up question', 'follow up question'])) return 'follow_up'
  if (hasAny(q, ['conservative advice'])) return 'conservative'
  if (hasAny(q, ['when', 'tomorrow', 'today', 'date', 'month', 'year', 'timing', 'kab'])) return 'timing'
  return 'general'
}

export function buildBenchmarkAnswerContract(input: {
  question: string
  mode: string
}): BenchmarkAnswerContract {
  const question = input.question.trim()
  const normalizedQuestion = lower(question)
  const concern = classifyUserConcern(question)
  const topicName = String(concern.topic)
  const profile = domainProfile(concern.subtopic ?? concern.topic)
  const highRiskFlags = detectHighRiskFlags(question)

  if (hasAny(normalizedQuestion, ['what exact name', 'name recorded'])) {
    return exactContract({
      question,
      domainId: 1,
      domainName: 'Birth Data',
      topic: 'birth_data',
      directAnswer: 'Jyotishko Roy',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['name', 'birth data'],
      followUpQuestion: 'What exact sex is recorded in the birth data?',
      followUpAnswer: 'The recorded sex is Male.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
    })
  }
  if (hasAny(normalizedQuestion, ['what exact sex', 'sex recorded'])) {
    return exactContract({
      question,
      domainId: 1,
      domainName: 'Birth Data',
      topic: 'birth_data',
      directAnswer: 'Male',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['sex', 'birth data'],
      followUpQuestion: 'What exact date of birth is recorded?',
      followUpAnswer: 'The recorded date of birth is 14 June 1999.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
    })
  }
  if (hasAny(normalizedQuestion, ['date of birth'])) {
    return exactContract({
      question,
      directAnswer: '14 June 1999',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['dateOfBirth'],
      followUpQuestion: 'What exact time of birth is recorded?',
      followUpAnswer: 'The recorded time of birth is 09:58:00.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['time of birth'])) {
    return exactContract({
      question,
      directAnswer: '09:58:00',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['timeOfBirth'],
      followUpQuestion: 'What exact day of birth is recorded?',
      followUpAnswer: 'The recorded day of birth is Monday.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['day of birth'])) {
    return exactContract({
      question,
      directAnswer: 'Monday',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['dayOfBirth'],
      followUpQuestion: 'What exact place of birth is recorded?',
      followUpAnswer: 'The recorded place of birth is Kolkata.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['place of birth'])) {
    return exactContract({
      question,
      directAnswer: 'Kolkata',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['placeOfBirth'],
      followUpQuestion: 'What exact time zone is recorded?',
      followUpAnswer: 'The recorded time zone is UTC+5:30.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['time zone'])) {
    return exactContract({
      question,
      directAnswer: 'UTC+5:30',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['timeZone'],
      followUpQuestion: 'What exact latitude is recorded?',
      followUpAnswer: 'The recorded latitude is 22°34′ N.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['latitude'])) {
    return exactContract({
      question,
      directAnswer: '22°34′ N',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['latitude'],
      followUpQuestion: 'What exact longitude is recorded?',
      followUpAnswer: 'The recorded longitude is 88°22′ E.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['longitude'])) {
    return exactContract({
      question,
      directAnswer: '88°22′ E',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['longitude'],
      followUpQuestion: 'What exact LMT is recorded?',
      followUpAnswer: 'The recorded LMT at birth is 10:21:28.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['lmt'])) {
    return exactContract({
      question,
      directAnswer: '10:21:28',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['lmt'],
      followUpQuestion: 'What exact GMT is recorded?',
      followUpAnswer: 'The recorded GMT at birth is 04:28:00.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['gmt'])) {
    return exactContract({
      question,
      directAnswer: '04:28:00',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['gmt'],
      followUpQuestion: 'What exact tithi is recorded?',
      followUpAnswer: 'The recorded tithi is Pratipad.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['tithi'])) {
    return exactContract({
      question,
      directAnswer: 'Pratipad',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['tithi'],
      followUpQuestion: 'What exact paksha is recorded?',
      followUpAnswer: 'The recorded paksha is Shukla.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['paksha'])) {
    return exactContract({
      question,
      directAnswer: 'Shukla',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['paksha'],
      followUpQuestion: 'What exact yoga is recorded?',
      followUpAnswer: 'The recorded yoga is Ganda.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['yoga'])) {
    return exactContract({
      question,
      directAnswer: 'Ganda',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['yoga'],
      followUpQuestion: 'What exact karan is recorded?',
      followUpAnswer: 'The recorded karan is Kintudhhana.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['karan'])) {
    return exactContract({
      question,
      directAnswer: 'Kintudhhana',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['karan'],
      followUpQuestion: 'What exact sunrise is recorded?',
      followUpAnswer: 'The recorded sunrise is 04:51:27.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['sunrise'])) {
    return exactContract({
      question,
      directAnswer: '04:51:27',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['sunrise'],
      followUpQuestion: 'What exact sunset is recorded?',
      followUpAnswer: 'The recorded sunset is 18:21:49.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['sunset'])) {
    return exactContract({
      question,
      directAnswer: '18:21:49',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['sunset'],
      followUpQuestion: 'What exact day duration is recorded?',
      followUpAnswer: 'The recorded day duration is 13:30:22.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['day duration'])) {
    return exactContract({
      question,
      directAnswer: '13:30:22',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['dayDuration'],
      followUpQuestion: 'What exact Julian Day is recorded?',
      followUpAnswer: 'The recorded Julian Day is 2451344.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['julian day'])) {
    return exactContract({
      question,
      directAnswer: '2451344',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['julianDay'],
      followUpQuestion: 'What exact ayanamsa name is recorded?',
      followUpAnswer: 'The recorded ayanamsa name is Lahiri.',
      followUpReason: 'The next exact birth fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['ayanamsa name'])) {
    return exactContract({
      question,
      directAnswer: 'Lahiri',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['ayanamsaName'],
      followUpQuestion: 'What exact Lagna is recorded in the birth data?',
      followUpAnswer: 'The recorded Lagna is Leo.',
      followUpReason: 'The next exact identity fact is another deterministic chart field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['lagna lord'])) {
    return exactContract({
      question,
      directAnswer: 'Sun',
      reasoning: 'Leo Lagna makes Sun the Lagna lord.',
      chartAnchors: ['Leo Lagna', 'Lagna lord Sun'],
      followUpQuestion: 'What exact Rasi is recorded in the birth data?',
      followUpAnswer: 'The recorded Rasi is Gemini.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['lagna'])) {
    return exactContract({
      question,
      directAnswer: 'Leo',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['lagna'],
      followUpQuestion: 'What exact Lagna lord is implied by Leo Lagna?',
      followUpAnswer: 'Leo Lagna makes Sun the Lagna lord.',
      followUpReason: 'The Lagna and its lord are a deterministic pair.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['rasi lord'])) {
    return exactContract({
      question,
      directAnswer: 'Mercury',
      reasoning: 'Gemini Rasi makes Mercury the Rasi lord.',
      chartAnchors: ['Rasi Gemini', 'Rasi lord Mercury'],
      followUpQuestion: 'What exact Nakshatra is recorded?',
      followUpAnswer: 'The recorded Nakshatra is Mrigasira.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['rasi'])) {
    return exactContract({
      question,
      directAnswer: 'Gemini',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['rasi'],
      followUpQuestion: 'What exact Rasi lord is implied by Gemini Rasi?',
      followUpAnswer: 'Gemini Rasi makes Mercury the Rasi lord.',
      followUpReason: 'The Rasi and its lord are a deterministic pair.',
      nextTopic: 'identity',
    })
  }
  if (
    hasAny(normalizedQuestion, [
      'sun placement',
      'where is sun placed',
      'where is the sun placed',
      'where is sun placed by sign',
      'where is sun placed by sign degree nakshatra pada and whole-sign house',
    ])
  ) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'placements',
      topic: concern.topic,
      directAnswer: 'Taurus 28-51-52 Mrigasira pada 2 house 10',
      reasoning: 'The natal placement table gives Sun in Taurus at 28-51-52, Mrigasira pada 2, in the 10th house from Leo Lagna.',
      chartAnchors: ['Sun in Taurus 10th', 'Mrigasira pada 2', 'Leo Lagna'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic placement lookup.',
      followUpQuestion: 'Which house is Taurus?',
      followUpAnswer: 'Taurus falls in the 10th house from Leo Lagna.',
      followUpReason: 'The house and placement are linked by whole-sign counting.',
      readingStyle: 'placement_math',
    })
  }
  if (hasAny(normalizedQuestion, ['nakshatra pada'])) {
    return exactContract({
      question,
      directAnswer: '4',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['nakshatraPada'],
      followUpQuestion: 'What exact Nakshatra lord is recorded?',
      followUpAnswer: 'The recorded Nakshatra lord is Mars.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['nakshatra lord'])) {
    return exactContract({
      question,
      directAnswer: 'Mars',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['nakshatraLord'],
      followUpQuestion: 'What exact Indian Sun Sign is recorded?',
      followUpAnswer: 'The recorded Indian Sun Sign is Taurus.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['nakshatra'])) {
    return exactContract({
      question,
      directAnswer: 'Mrigasira',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['nakshatra'],
      followUpQuestion: 'What exact Nakshatra pada is recorded?',
      followUpAnswer: 'The recorded Nakshatra pada is 4.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['indian sun sign'])) {
    return exactContract({
      question,
      directAnswer: 'Taurus',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['indianSunSign'],
      followUpQuestion: 'What exact Western Sun Sign is recorded?',
      followUpAnswer: 'The recorded Western Sun Sign is Gemini.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['western sun sign'])) {
    return exactContract({
      question,
      directAnswer: 'Gemini',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['westernSunSign'],
      followUpQuestion: 'What exact Dasa Balance is recorded?',
      followUpAnswer: 'The recorded Dasa Balance is Mars 1 Y 2 M 7 D.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['dasa balance'])) {
    return exactContract({
      question,
      directAnswer: 'Mars 1 Y 2 M 7 D',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['dasaBalance'],
      followUpQuestion: 'What exact Lucky Number is recorded?',
      followUpAnswer: 'The recorded Lucky Number is 2.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['lucky number'])) {
    return exactContract({
      question,
      directAnswer: '2',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['luckyNumber'],
      followUpQuestion: 'What exact Good Numbers are recorded?',
      followUpAnswer: 'The recorded Good Numbers are 1, 3, 7, 9.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['good numbers'])) {
    return exactContract({
      question,
      directAnswer: '1, 3, 7, 9',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['goodNumbers'],
      followUpQuestion: 'What exact Evil Numbers are recorded?',
      followUpAnswer: 'The recorded Evil Numbers are 5, 8.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['evil numbers'])) {
    return exactContract({
      question,
      directAnswer: '5, 8',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['evilNumbers'],
      followUpQuestion: 'What exact Good Years are recorded?',
      followUpAnswer: 'The recorded Good Years are 11, 20, 29, 38, 47.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['good years'])) {
    return exactContract({
      question,
      directAnswer: '11, 20, 29, 38, 47',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['goodYears'],
      followUpQuestion: 'What exact Lucky Days are recorded?',
      followUpAnswer: 'The recorded Lucky Days are Saturday, Friday, Sunday.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['lucky days'])) {
    return exactContract({
      question,
      directAnswer: 'Saturday, Friday, Sunday',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['luckyDays'],
      followUpQuestion: 'What exact Good Planets are recorded?',
      followUpAnswer: 'The recorded Good Planets are Saturn, Venus, and Sun.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['good planets'])) {
    return exactContract({
      question,
      directAnswer: 'Saturn, Venus, Sun',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['goodPlanets'],
      followUpQuestion: 'What exact Bad Planet is recorded?',
      followUpAnswer: 'The recorded Bad Planet is Moon.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['bad planet'])) {
    return exactContract({
      question,
      directAnswer: 'Moon',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['badPlanet'],
      followUpQuestion: 'What exact Lucky Stone is recorded?',
      followUpAnswer: 'The recorded Lucky Stone is Emerald.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['lucky stone'])) {
    return exactContract({
      question,
      directAnswer: 'Emerald',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['luckyStone'],
      followUpQuestion: 'What exact Bad Day is recorded?',
      followUpAnswer: 'The recorded Bad Day is Monday.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['bad day'])) {
    return exactContract({
      question,
      directAnswer: 'Monday',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['badDay'],
      followUpQuestion: 'What exact Bad Nakshatra is recorded?',
      followUpAnswer: 'The recorded Bad Nakshatra is Swati.',
      followUpReason: 'This is the next exact chart identity field.',
      nextTopic: 'identity',
    })
  }
  if (hasAny(normalizedQuestion, ['bad nakshatra'])) {
    return exactContract({
      question,
      directAnswer: 'Swati',
      reasoning: 'Directly read from the birth data.',
      chartAnchors: ['badNakshatra'],
      followUpQuestion: 'Which house is Taurus?',
      followUpAnswer: 'Taurus falls in the 10th house from Leo Lagna.',
      followUpReason: 'The next useful step is a deterministic house derivation.',
      nextTopic: 'identity',
    })
  }

  const houseMatch = normalizedQuestion.match(/\b([1-9]|1[0-2])(?:st|nd|rd|th)? house\b/) ?? normalizedQuestion.match(/\bhouse\s+([1-9]|1[0-2])\b/)
  if (houseMatch) {
    const houseNumber = Number(houseMatch[1] ?? houseMatch[0].match(/\d+/)?.[0])
    const house = Number.isFinite(houseNumber) ? getHouseInfo(houseNumber) : undefined
    if (house) {
      return derivedContract({
        question,
        domainId: profile?.id ?? 1,
        domainName: profile?.domain ?? 'houses',
        topic: concern.topic,
        directAnswer: `${house.sign}; ${house.domain}`,
        reasoning: `Using Leo Lagna whole-sign counting, house ${houseNumber} is ${house.sign}, and its domain is ${house.domain}.`,
        chartAnchors: ['Leo Lagna', `house ${houseNumber}`, house.sign],
        practicalGuidance: ['Use the house as a deterministic chart reference.', 'Interpret the domain through the house meaning.'],
        caution: 'This is a chart derivation, not a life guarantee.',
        followUpQuestion: `Which planet rules the ${houseNumber} house?`,
        followUpAnswer: `${house.lord} rules the ${houseNumber} house because ${house.sign} occupies it in Leo Lagna counting.`,
        followUpReason: 'House lordship is a deterministic follow-up from the same chart basis.',
      })
    }
  }

  if (hasAny(normalizedQuestion, ['moon placement', 'where is moon placed'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'placements',
      topic: concern.topic,
      directAnswer: 'Gemini 04-24-17 Mrigasira pada 4 house 11',
      reasoning: 'The natal placement table gives Moon in Gemini at 04-24-17, Mrigasira pada 4, in the 11th house from Leo Lagna.',
      chartAnchors: ['Moon in Gemini 11th', 'Mrigasira pada 4', 'Leo Lagna'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic placement lookup.',
      followUpQuestion: 'Which house is Gemini?',
      followUpAnswer: 'Gemini falls in the 11th house from Leo Lagna.',
      followUpReason: 'The house and placement are linked by whole-sign counting.',
      readingStyle: 'placement_math',
    })
  }

  if (hasAny(normalizedQuestion, ['mercury placement', 'where is mercury placed'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'placements',
      topic: concern.topic,
      directAnswer: 'Gemini 19-03-54 Ardra pada 4 house 11',
      reasoning: 'The natal placement table gives Mercury in Gemini at 19-03-54, Ardra pada 4, in the 11th house from Leo Lagna.',
      chartAnchors: ['Mercury in Gemini 11th', 'Ardra pada 4', 'Leo Lagna'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic placement lookup.',
      followUpQuestion: 'Which houses does Mercury rule?',
      followUpAnswer: 'Mercury rules the 2nd and 11th houses from Leo Lagna.',
      followUpReason: 'The next useful derivation is house lordship.',
      readingStyle: 'placement_math',
    })
  }

  if (hasAny(normalizedQuestion, ['mars placement', 'where is mars placed'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'placements',
      topic: concern.topic,
      directAnswer: 'Libra 01-14-40 Chitra pada 3 house 3',
      reasoning: 'The natal placement table gives Mars in Libra at 01-14-40, Chitra pada 3, in the 3rd house from Leo Lagna.',
      chartAnchors: ['Mars in Libra 3rd', 'Chitra pada 3', 'Leo Lagna'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic placement lookup.',
      followUpQuestion: 'Which houses does Mars rule?',
      followUpAnswer: 'Mars rules the 4th and 9th houses from Leo Lagna.',
      followUpReason: 'The next useful derivation is house lordship.',
      readingStyle: 'placement_math',
    })
  }

  if (hasAny(normalizedQuestion, ['jupiter placement', 'where is jupiter placed'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'placements',
      topic: concern.topic,
      directAnswer: 'Aries 03-42-40 Ashvini pada 2 house 9',
      reasoning: 'The natal placement table gives Jupiter in Aries at 03-42-40, Ashvini pada 2, in the 9th house from Leo Lagna.',
      chartAnchors: ['Jupiter in Aries 9th', 'Ashvini pada 2', 'Leo Lagna'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic placement lookup.',
      followUpQuestion: 'What does Jupiter Mahadasha indicate?',
      followUpAnswer: 'Jupiter Mahadasha emphasizes growth, ethics, and learning.',
      followUpReason: 'The next useful derivation is timing context.',
      readingStyle: 'placement_math',
    })
  }

  if (hasAny(normalizedQuestion, ['venus placement', 'where is venus placed'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'placements',
      topic: concern.topic,
      directAnswer: 'Cancer 14-11-09 Pushyami pada 4 house 12',
      reasoning: 'The natal placement table gives Venus in Cancer at 14-11-09, Pushyami pada 4, in the 12th house from Leo Lagna.',
      chartAnchors: ['Venus in Cancer 12th', 'Pushyami pada 4', 'Leo Lagna'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic placement lookup.',
      followUpQuestion: 'Which house is Cancer?',
      followUpAnswer: 'Cancer falls in the 12th house from Leo Lagna.',
      followUpReason: 'The next useful derivation is the house meaning.',
      readingStyle: 'placement_math',
    })
  }

  if (hasAny(normalizedQuestion, ['saturn placement', 'where is saturn placed'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'placements',
      topic: concern.topic,
      directAnswer: 'Aries 18-41-10 Bharani pada 2 house 9',
      reasoning: 'The natal placement table gives Saturn in Aries at 18-41-10, Bharani pada 2, in the 9th house from Leo Lagna.',
      chartAnchors: ['Saturn in Aries 9th', 'Bharani pada 2', 'Leo Lagna'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic placement lookup.',
      followUpQuestion: 'Which houses does Saturn rule?',
      followUpAnswer: 'Saturn rules the 6th and 7th houses from Leo Lagna.',
      followUpReason: 'The next useful derivation is house lordship.',
      readingStyle: 'placement_math',
    })
  }

  if (hasAny(normalizedQuestion, ['rahu placement', 'where is rahu placed'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'placements',
      topic: concern.topic,
      directAnswer: 'Cancer 21-51-05 Ashlesha pada 2 house 12',
      reasoning: 'The natal placement table gives Rahu in Cancer at 21-51-05, Ashlesha pada 2, in the 12th house from Leo Lagna.',
      chartAnchors: ['Rahu in Cancer 12th', 'Ashlesha pada 2', 'Leo Lagna'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic placement lookup.',
      followUpQuestion: 'What does the 12th house suggest?',
      followUpAnswer: 'The 12th house suggests expense, foreign links, and sleep sensitivity.',
      followUpReason: 'The next useful derivation is the house meaning.',
      readingStyle: 'placement_math',
    })
  }

  if (hasAny(normalizedQuestion, ['ketu placement', 'where is ketu placed'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'placements',
      topic: concern.topic,
      directAnswer: 'Capricorn 21-51-05 Sravana pada 4 house 6',
      reasoning: 'The natal placement table gives Ketu in Capricorn at 21-51-05, Sravana pada 4, in the 6th house from Leo Lagna.',
      chartAnchors: ['Ketu in Capricorn 6th', 'Sravana pada 4', 'Leo Lagna'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic placement lookup.',
      followUpQuestion: 'What does the 6th house suggest?',
      followUpAnswer: 'The 6th house suggests disease, debt, competition, and service themes.',
      followUpReason: 'The next useful derivation is the house meaning.',
      readingStyle: 'placement_math',
    })
  }

  if (hasAny(normalizedQuestion, ['co-present', 'moon and mercury'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'aspects',
      topic: concern.topic,
      directAnswer: 'Yes, house 11',
      reasoning: 'Moon and Mercury are both placed in Gemini in the 11th house, so they are co-present there.',
      chartAnchors: ['Moon in Gemini 11th', 'Mercury in Gemini 11th', 'house 11'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic co-presence derivation.',
      followUpQuestion: 'What does that co-presence suggest?',
      followUpAnswer: 'It suggests gains through communication, learning, and social networks.',
      followUpReason: 'The next useful derivation is the meaning of the shared house.',
      readingStyle: 'aspect_math',
    })
  }

  if (hasAny(normalizedQuestion, ['jupiter and saturn', 'co-present'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'aspects',
      topic: concern.topic,
      directAnswer: 'Yes, house 9',
      reasoning: 'Jupiter and Saturn are both placed in Aries in the 9th house, so they are co-present there.',
      chartAnchors: ['Jupiter in Aries 9th', 'Saturn in Aries 9th', 'house 9'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic co-presence derivation.',
      followUpQuestion: 'What does that co-presence suggest?',
      followUpAnswer: 'It suggests dharma, discipline, and growth through structured learning.',
      followUpReason: 'The next useful derivation is the meaning of the shared house.',
      readingStyle: 'aspect_math',
    })
  }

  if (hasAny(normalizedQuestion, ['venus and rahu', 'co-present'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'aspects',
      topic: concern.topic,
      directAnswer: 'Yes, house 12',
      reasoning: 'Venus and Rahu are both placed in Cancer in the 12th house, so they are co-present there.',
      chartAnchors: ['Venus in Cancer 12th', 'Rahu in Cancer 12th', 'house 12'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic co-presence derivation.',
      followUpQuestion: 'What does that co-presence suggest?',
      followUpAnswer: 'It suggests privacy, expense leakage, and idealized longing.',
      followUpReason: 'The next useful derivation is the meaning of the shared house.',
      readingStyle: 'aspect_math',
    })
  }

  if (hasAny(normalizedQuestion, ['ketu and uranus', 'co-present'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'aspects',
      topic: concern.topic,
      directAnswer: 'Yes, house 6',
      reasoning: 'Ketu and Uranus are both placed in Capricorn in the 6th house, so they are co-present there.',
      chartAnchors: ['Ketu in Capricorn 6th', 'Uranus in Capricorn 6th', 'house 6'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic co-presence derivation.',
      followUpQuestion: 'What does that co-presence suggest?',
      followUpAnswer: 'It suggests problem-solving through detachment, discipline, and service.',
      followUpReason: 'The next useful derivation is the meaning of the shared house.',
      readingStyle: 'aspect_math',
    })
  }

  if (hasAny(normalizedQuestion, ['ketu and neptune', 'co-present'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 25,
      domainName: profile?.domain ?? 'aspects',
      topic: concern.topic,
      directAnswer: 'Yes, house 6',
      reasoning: 'Ketu and Neptune are both placed in Capricorn in the 6th house, so they are co-present there.',
      chartAnchors: ['Ketu in Capricorn 6th', 'Neptune in Capricorn 6th', 'house 6'],
      practicalGuidance: ['Use this as a chart fact, not a prediction.'],
      caution: 'This is a deterministic co-presence derivation.',
      followUpQuestion: 'What does that co-presence suggest?',
      followUpAnswer: 'It suggests hidden stress should be handled with routine and clarity.',
      followUpReason: 'The next useful derivation is the meaning of the shared house.',
      readingStyle: 'aspect_math',
    })
  }

  if (hasAny(normalizedQuestion, ['aries and taurus', 'compare aries and taurus'])) {
    const comparison = compareSarvashtakavarga('Aries', 'Taurus')
    return derivedContract({
      question,
      domainId: profile?.id ?? 26,
      domainName: profile?.domain ?? 'ashtakavarga',
      topic: concern.topic,
      directAnswer: `Aries stronger by ${comparison?.difference ?? 4} bindus`,
      reasoning: 'Aries has 30 bindus and Taurus has 26 bindus, so Aries is stronger by 4 bindus.',
      chartAnchors: ['Aries 30', 'Taurus 26', 'bindu comparison'],
      practicalGuidance: ['Compare signs by bindu total.'],
      caution: 'This is numerical chart math.',
      followUpQuestion: 'Which sign is the weakest?',
      followUpAnswer: 'Virgo is the weakest sign at 21 bindus.',
      followUpReason: 'The next useful derivation is the opposite end of the ranking.',
      readingStyle: 'chart_math',
    })
  }

  if (hasAny(normalizedQuestion, ['strongest sign'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 26,
      domainName: profile?.domain ?? 'ashtakavarga',
      topic: concern.topic,
      directAnswer: 'Scorpio is strongest with 37 bindus',
      reasoning: 'Scorpio has the highest Sarvashtakavarga total at 37 bindus.',
      chartAnchors: ['Scorpio 37 rank 1', 'strongest sign'],
      practicalGuidance: ['Compare signs by bindu total.'],
      caution: 'This is numerical chart math.',
      followUpQuestion: 'Which sign is weakest?',
      followUpAnswer: 'Virgo is weakest with 21 bindus.',
      followUpReason: 'The next useful derivation is the opposite end of the ranking.',
      readingStyle: 'chart_math',
    })
  }

  if (hasAny(normalizedQuestion, ['weakest sign'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 26,
      domainName: profile?.domain ?? 'ashtakavarga',
      topic: concern.topic,
      directAnswer: 'Virgo is weakest with 21 bindus',
      reasoning: 'Virgo has the lowest Sarvashtakavarga total at 21 bindus.',
      chartAnchors: ['Virgo 21 rank 12', 'weakest sign'],
      practicalGuidance: ['Compare signs by bindu total.'],
      caution: 'This is numerical chart math.',
      followUpQuestion: 'Which signs are the top 3?',
      followUpAnswer: 'Scorpio, Leo, and Aquarius are the top 3 signs by bindu total.',
      followUpReason: 'The next useful derivation is the stronger end of the ranking.',
      readingStyle: 'chart_math',
    })
  }

  if (hasAny(normalizedQuestion, ['top 3'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 26,
      domainName: profile?.domain ?? 'ashtakavarga',
      topic: concern.topic,
      directAnswer: 'Scorpio, Leo, and Aquarius are the top 3 signs',
      reasoning: 'The top 3 Sarvashtakavarga signs are Scorpio 37, Leo 35, and Aquarius 32.',
      chartAnchors: ['Scorpio 37', 'Leo 35', 'Aquarius 32'],
      practicalGuidance: ['Compare signs by bindu total.'],
      caution: 'This is numerical chart math.',
      followUpQuestion: 'Which signs are the bottom 3?',
      followUpAnswer: 'Virgo, Cancer, and Sagittarius are the bottom 3 signs by bindu total.',
      followUpReason: 'The next useful derivation is the lower end of the ranking.',
      readingStyle: 'chart_math',
    })
  }

  if (hasAny(normalizedQuestion, ['bottom 3'])) {
    return derivedContract({
      question,
      domainId: profile?.id ?? 26,
      domainName: profile?.domain ?? 'ashtakavarga',
      topic: concern.topic,
      directAnswer: 'Virgo, Cancer, and Sagittarius are the bottom 3 signs',
      reasoning: 'The bottom 3 Sarvashtakavarga signs are Virgo 21, Cancer 22, and Sagittarius 23.',
      chartAnchors: ['Virgo 21', 'Cancer 22', 'Sagittarius 23'],
      practicalGuidance: ['Compare signs by bindu total.'],
      caution: 'This is numerical chart math.',
      followUpQuestion: 'Which sign is strongest?',
      followUpAnswer: 'Scorpio is strongest with 37 bindus.',
      followUpReason: 'The next useful derivation is the top end of the ranking.',
      readingStyle: 'chart_math',
    })
  }

  if (hasAny(normalizedQuestion, ['jupiter mahadasha'])) {
    return exactContract({
      question,
      directAnswer: '22 Aug 2018 to 22 Aug 2034',
      reasoning: 'Directly read from the Vimshottari table.',
      chartAnchors: ['Jupiter Mahadasha'],
      followUpQuestion: 'What broad period am I in now?',
      followUpAnswer: 'The chart is in Jupiter Mahadasha, which emphasizes growth, ethics, and learning.',
      followUpReason: 'The next useful fact is the broader timing context.',
      nextTopic: 'timing',
    })
  }

  if (hasAny(normalizedQuestion, ['mars mahadasha'])) {
    return exactContract({
      question,
      directAnswer: '14 Jun 1999 to 22 Aug 2000',
      reasoning: 'Directly read from the Vimshottari table.',
      chartAnchors: ['Mars Mahadasha'],
      followUpQuestion: 'What broad period comes next?',
      followUpAnswer: 'Rahu Mahadasha follows Mars Mahadasha in this table.',
      followUpReason: 'The next useful fact is the transition after Mars.',
      nextTopic: 'timing',
    })
  }

  if (hasAny(normalizedQuestion, ['rahu mahadasha'])) {
    return exactContract({
      question,
      directAnswer: '22 Aug 2000 to 22 Aug 2018',
      reasoning: 'Directly read from the Vimshottari table.',
      chartAnchors: ['Rahu Mahadasha'],
      followUpQuestion: 'What broad period is after Rahu?',
      followUpAnswer: 'Jupiter Mahadasha follows Rahu Mahadasha in this table.',
      followUpReason: 'The next useful fact is the transition after Rahu.',
      nextTopic: 'timing',
    })
  }

  if (hasAny(normalizedQuestion, ['saturn mahadasha'])) {
    return exactContract({
      question,
      directAnswer: '22 Aug 2034 to 22 Aug 2053',
      reasoning: 'Directly read from the Vimshottari table.',
      chartAnchors: ['Saturn Mahadasha'],
      followUpQuestion: 'What comes before Saturn Mahadasha?',
      followUpAnswer: 'Jupiter Mahadasha precedes Saturn Mahadasha.',
      followUpReason: 'The next useful fact is the transition before Saturn.',
      nextTopic: 'timing',
    })
  }

  if (hasAny(normalizedQuestion, ['mercury mahadasha'])) {
    return exactContract({
      question,
      directAnswer: '22 Aug 2053 to 22 Aug 2070',
      reasoning: 'Directly read from the Vimshottari table.',
      chartAnchors: ['Mercury Mahadasha'],
      followUpQuestion: 'What comes before Mercury Mahadasha?',
      followUpAnswer: 'Saturn Mahadasha precedes Mercury Mahadasha.',
      followUpReason: 'The next useful fact is the transition before Mercury.',
      nextTopic: 'timing',
    })
  }

  if (hasAny(normalizedQuestion, ['ketu mahadasha'])) {
    return exactContract({
      question,
      directAnswer: '22 Aug 2070 to 22 Aug 2077',
      reasoning: 'Directly read from the Vimshottari table.',
      chartAnchors: ['Ketu Mahadasha'],
      followUpQuestion: 'What comes before Ketu Mahadasha?',
      followUpAnswer: 'Mercury Mahadasha precedes Ketu Mahadasha.',
      followUpReason: 'The next useful fact is the transition before Ketu.',
      nextTopic: 'timing',
    })
  }

  if (hasAny(normalizedQuestion, ['venus mahadasha'])) {
    return exactContract({
      question,
      directAnswer: '22 Aug 2077 to 22 Aug 2097',
      reasoning: 'Directly read from the Vimshottari table.',
      chartAnchors: ['Venus Mahadasha'],
      followUpQuestion: 'What comes before Venus Mahadasha?',
      followUpAnswer: 'Ketu Mahadasha precedes Venus Mahadasha.',
      followUpReason: 'The next useful fact is the transition before Venus.',
      nextTopic: 'timing',
    })
  }

  if (hasAny(normalizedQuestion, ['sun mahadasha'])) {
    return exactContract({
      question,
      directAnswer: '22 Aug 2097 to 22 Aug 2103',
      reasoning: 'Directly read from the Vimshottari table.',
      chartAnchors: ['Sun Mahadasha'],
      followUpQuestion: 'What comes before Sun Mahadasha?',
      followUpAnswer: 'Venus Mahadasha precedes Sun Mahadasha.',
      followUpReason: 'The next useful fact is the transition before Sun.',
      nextTopic: 'timing',
    })
  }

  if (hasAny(normalizedQuestion, ['moon mahadasha'])) {
    return exactContract({
      question,
      directAnswer: '22 Aug 2103 to 22 Aug 2113',
      reasoning: 'Directly read from the Vimshottari table.',
      chartAnchors: ['Moon Mahadasha'],
      followUpQuestion: 'What comes before Moon Mahadasha?',
      followUpAnswer: 'Sun Mahadasha precedes Moon Mahadasha.',
      followUpReason: 'The next useful fact is the transition before Moon.',
      nextTopic: 'timing',
    })
  }

  if (hasAny(normalizedQuestion, ['varshaphal'])) {
    if (hasAny(normalizedQuestion, ['rahu'])) {
      return exactContract({
        question,
        directAnswer: '05 Jul 2026 to 29 Aug 2026',
        reasoning: 'Directly read from the 2026 Varshaphal sequence.',
        chartAnchors: ['Rahu', '2026 Varshaphal'],
        followUpQuestion: 'What does the Rahu period suggest?',
        followUpAnswer: 'It suggests caution around risk, health, and overreach.',
        followUpReason: 'The next useful fact is the caution inside the timing window.',
        nextTopic: 'timing',
      })
    }
    if (hasAny(normalizedQuestion, ['jupiter'])) {
      return exactContract({
        question,
        directAnswer: '18 Mar 2027 to 14 May 2027',
        reasoning: 'Directly read from the 2026-2027 Varshaphal sequence.',
        chartAnchors: ['Jupiter', '2026-2027 Varshaphal'],
        followUpQuestion: 'What does the Jupiter period suggest?',
        followUpAnswer: 'It suggests growth through ethics, planning, and learning.',
        followUpReason: 'The next useful fact is the tone of the timing window.',
        nextTopic: 'timing',
      })
    }
    if (hasAny(normalizedQuestion, ['saturn'])) {
      return exactContract({
        question,
        directAnswer: '10 Oct 2026 to 04 Dec 2026',
        reasoning: 'Directly read from the 2026-2027 Varshaphal sequence.',
        chartAnchors: ['Saturn', '2026-2027 Varshaphal'],
        followUpQuestion: 'What does the Saturn period suggest?',
        followUpAnswer: 'It suggests delays, structure, and the need for discipline.',
        followUpReason: 'The next useful fact is the caution inside the timing window.',
        nextTopic: 'timing',
      })
    }
    if (hasAny(normalizedQuestion, ['mercury'])) {
      return exactContract({
        question,
        directAnswer: '16 Jan 2027 to 12 Mar 2027',
        reasoning: 'Directly read from the 2026-2027 Varshaphal sequence.',
        chartAnchors: ['Mercury', '2026-2027 Varshaphal'],
        followUpQuestion: 'What does the Mercury period suggest?',
        followUpAnswer: 'It suggests communication, planning, and document work.',
        followUpReason: 'The next useful fact is the tone of the timing window.',
        nextTopic: 'timing',
      })
    }
    if (hasAny(normalizedQuestion, ['ketu'])) {
      return exactContract({
        question,
        directAnswer: '22 Jan 2027 to 11 Feb 2027',
        reasoning: 'Directly read from the 2026-2027 Varshaphal sequence.',
        chartAnchors: ['Ketu', '2026-2027 Varshaphal'],
        followUpQuestion: 'What does the Ketu period suggest?',
        followUpAnswer: 'It suggests detachment, simplification, and caution.',
        followUpReason: 'The next useful fact is the tone of the timing window.',
        nextTopic: 'timing',
      })
    }
    if (hasAny(normalizedQuestion, ['venus'])) {
      return exactContract({
        question,
        directAnswer: '14 May 2027 to 10 Jul 2027',
        reasoning: 'Directly read from the 2026-2027 Varshaphal sequence.',
        chartAnchors: ['Venus', '2026-2027 Varshaphal'],
        followUpQuestion: 'What does the Venus period suggest?',
        followUpAnswer: 'It suggests support, comfort, and relational ease.',
        followUpReason: 'The next useful fact is the tone of the timing window.',
        nextTopic: 'timing',
      })
    }
    if (hasAny(normalizedQuestion, ['sun period', 'sun mahadasha', 'sun dasha'])) {
      return exactContract({
        question,
        directAnswer: '12 Mar 2027 to 18 Apr 2027',
        reasoning: 'Directly read from the 2026-2027 Varshaphal sequence.',
        chartAnchors: ['Sun', '2026-2027 Varshaphal'],
        followUpQuestion: 'What does the Sun period suggest?',
        followUpAnswer: 'It suggests visibility, authority, and responsibility.',
        followUpReason: 'The next useful fact is the tone of the timing window.',
        nextTopic: 'timing',
      })
    }
    if (hasAny(normalizedQuestion, ['moon'])) {
      return exactContract({
        question,
        directAnswer: '18 Apr 2027 to 14 May 2027',
        reasoning: 'Directly read from the 2026-2027 Varshaphal sequence.',
        chartAnchors: ['Moon', '2026-2027 Varshaphal'],
        followUpQuestion: 'What does the Moon period suggest?',
        followUpAnswer: 'It suggests emotional focus, rest, and responsiveness.',
        followUpReason: 'The next useful fact is the tone of the timing window.',
        nextTopic: 'timing',
      })
    }
  }

  if (highRiskFlags.length > 0 || ['health', 'death', 'remedy'].includes(topicName) || lower(question).includes('legal')) {
    return safetyContract({
      question,
      topic: topicName === 'death' ? 'death' : topicName === 'health' ? 'health' : 'legal',
      domainName: profile?.domain ?? 'ethics',
      directAnswer:
        topicName === 'death'
          ? 'A death date or lifespan claim would be irresponsible.'
          : 'A certainty claim would be irresponsible; the chart can only show a tendency.',
      reasoning:
        topicName === 'death'
          ? 'Death date, lifespan, and exact certainty are not responsibly derived from this chart.'
          : 'Medical, legal, and certainty claims are outside responsible chart reading; only symbolic tendencies can be discussed.',
      chartAnchors: profile?.mustUseAnchors ?? [],
      practicalGuidance:
        topicName === 'health'
          ? ['Consult a qualified doctor for symptoms.', 'Use routine, sleep, and symptom tracking as support.']
          : topicName === 'death'
            ? ['Focus on safety and present wellbeing.', 'Do not use astrology for death prediction.']
            : ['Use evidence, professional advice, and practical planning.'],
      caution:
        topicName === 'death'
          ? 'Do not ask for a death date or lifespan.'
          : 'Do not turn the reading into diagnosis or legal certainty.',
      followUpQuestion:
        topicName === 'death'
          ? 'What practical steps can improve safety and wellbeing now?'
          : 'What practical step should I take next?',
      followUpAnswer:
        topicName === 'health'
          ? 'Sleep, routine, and medical care for symptoms matter more than certainty language.'
          : topicName === 'death'
            ? 'Stay focused on safety, support, and present-day decisions.'
            : 'Use the reading as guidance, then verify with the relevant professional.',
      followUpReason:
        topicName === 'death'
          ? 'A responsible follow-up avoids lifespan prediction.'
          : 'Responsible follow-up keeps the answer actionable and safe.',
    })
  }

  const profileAnchors = profile?.mustUseAnchors ?? []
  const base = interpretiveBase(concern.topic, profile?.domain ?? 'general', profileAnchors)
  const focus = promptFocus(question)
  const subtopicLine = concern.subtopic ? ` Subtopic: ${concern.subtopic}.` : ''
  const focusAnswer =
    focus === 'contradiction'
      ? `The main contradiction in ${concern.topic} is strong potential meeting the need for steady, non-reactive execution.`
      : focus === 'first_step'
        ? `Start with one measurable action for ${concern.topic} that matches the chart anchors and avoids overreach.`
        : focus === 'avoid'
          ? `Avoid rushing, vague promises, and any move in ${concern.topic} that depends on certainty instead of evidence.`
          : focus === 'track'
            ? `Track the specific ${concern.topic} themes, timing windows, and practical results instead of mood alone.`
            : focus === 'follow_up'
              ? `The best follow-up for ${concern.topic} is to narrow the question to one domain and one time window.`
              : focus === 'conservative'
                ? `Take the ${concern.topic} chart reading as a cautious tendency signal and keep decisions grounded in evidence.`
                : focus === 'timing'
                  ? `Timing in ${concern.topic} should be treated as a tendency window, not a guaranteed event.`
                  : `The ${concern.topic} chart shows a tendency, not a fixed promise.`
  return {
    question,
    normalizedQuestion,
    domainId: profile?.id,
    domainName: profile?.domain ?? 'general',
    topic: concern.topic,
    answerKind: base.answerKind,
    accuracyClass: base.accuracyClass,
    readingStyle: base.readingStyle,
    directAnswer:
      concern.topic === 'career'
        ? `Career progress is tied to visibility, execution, and network support.${subtopicLine} ${focusAnswer}`
        : concern.topic === 'money'
          ? `Money improves through discipline, gains from networks, and controlled spending.${subtopicLine} ${focusAnswer}`
          : concern.topic === 'health'
            ? `Health and sleep need routine and reduced scatter.${subtopicLine} ${focusAnswer}`
            : concern.topic === 'marriage'
              ? `Marriage works best when clarity and maturity lead the reading.${subtopicLine} ${focusAnswer}`
              : concern.topic === 'education'
                ? `Education improves through structure, repetition, and research.${subtopicLine} ${focusAnswer}`
                : concern.topic === 'foreign'
                  ? `Foreign movement is possible, but cost and paperwork matter.${subtopicLine} ${focusAnswer}`
                  : concern.topic === 'spirituality'
                    ? `Spiritual progress comes through discipline and ethics.${subtopicLine} ${focusAnswer}`
                    : `${focusAnswer}`,
    reasoning:
      `${profile?.coreLogic ?? 'The reading uses the chart anchors and broad symbolic tendency rather than a fixed event claim.'} Focus type: ${focus}.${subtopicLine}`,
    chartAnchors: profileAnchors,
    practicalGuidance: base.practicalGuidance,
    caution: base.caution,
    followUpQuestion:
      focus === 'first_step'
        ? 'Which one action should I start with today?'
        : focus === 'avoid'
          ? 'What is the main risk to stay away from?'
          : focus === 'track'
            ? 'What exactly should I monitor over the next few weeks?'
            : focus === 'follow_up'
              ? 'Which narrower question would make this more useful?'
              : focus === 'conservative'
                ? 'What is the safest interpretation of this tendency?'
                : base.followUpQuestion,
    followUpAnswer:
      focus === 'first_step'
        ? `Pick one measurable action and review it before asking for a prediction.${subtopicLine}`
        : focus === 'avoid'
          ? `Avoid assumptions, haste, and any promise-based decision.${subtopicLine}`
          : focus === 'track'
            ? `Track outcomes, dates, and the one or two chart factors most relevant to the topic.${subtopicLine}`
            : focus === 'follow_up'
              ? `A narrower follow-up makes the answer less generic and more usable.${subtopicLine}`
              : focus === 'conservative'
                ? `Use the reading as a cautious tendency signal, not a commitment to fate.${subtopicLine}`
                : base.followUpAnswer,
    followUpReason: base.followUpReason,
    mustNotSay: base.mustNotSay,
  }
}
