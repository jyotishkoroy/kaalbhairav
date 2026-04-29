import type {
  AstroEvidenceWithSource,
  BirthDetailsInput,
  ChartSummary,
  ReadingLanguage,
  ReadingMode,
  UserConcern,
} from '@/lib/astro/reading/reading-types'

export type PredictionContext = {
  concern: UserConcern
  birthDetails?: BirthDetailsInput
  chartSummary: ChartSummary
  evidence: AstroEvidenceWithSource[]
  memorySummary?: string
  safetyWarnings: string[]
  mode?: ReadingMode
  language?: ReadingLanguage
}

export type PredictionContextInput = {
  concern: UserConcern
  birthDetails?: BirthDetailsInput
  chartSummary?: ChartSummary
  evidence?: AstroEvidenceWithSource[]
  memorySummary?: string
  safetyWarnings?: string[]
  mode?: ReadingMode
  language?: ReadingLanguage
}

export function createPredictionContext(
  input: PredictionContextInput,
): PredictionContext {
  return {
    concern: input.concern,
    birthDetails: input.birthDetails,
    chartSummary: input.chartSummary ?? {},
    evidence: input.evidence ?? [],
    memorySummary: input.memorySummary,
    safetyWarnings: input.safetyWarnings ?? [],
    mode: input.mode,
    language: input.language,
  }
}
