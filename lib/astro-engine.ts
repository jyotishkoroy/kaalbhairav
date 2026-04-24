export type AstroEngineInput = {
  birth_date: string
  birth_time: string | null
  latitude: string
  longitude: string
  place_name: string
}

export async function getChart(input: AstroEngineInput) {
  const hasExactBirthTime = Boolean(input.birth_time)
  const chartDateTime = `${input.birth_date}T${input.birth_time ?? '12:00'}:00`

  return {
    engine: 'placeholder-local-v1',
    status: 'computed_placeholder',
    computed_at: new Date().toISOString(),
    birth: {
      date: input.birth_date,
      time: input.birth_time,
      time_assumption: hasExactBirthTime
        ? 'exact_user_provided'
        : 'unknown_time_using_noon_placeholder',
      place_name: input.place_name,
      latitude: Number(input.latitude),
      longitude: Number(input.longitude),
    },
    symbolic_context: {
      chart_datetime_local: chartDateTime,
      has_exact_birth_time: hasExactBirthTime,
      note: 'This is a placeholder chart context. Replace lib/astro-engine.ts with a real Jyotish engine later.',
    },
    guidance_limits: [
      'Use this only as reflective context.',
      'Do not present planetary placements, dashas, nakshatras, or houses as calculated facts yet.',
      'Do not make health, financial, legal, death, or fixed-date predictions.',
    ],
  }
}