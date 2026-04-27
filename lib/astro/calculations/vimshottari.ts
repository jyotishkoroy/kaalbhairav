import { DASHA_SEQUENCE, DASHA_YEARS, NAKSHATRA_MAP, NAKSHATRA_SPAN, DASHA_YEAR_DAYS, VIMSHOTTARI_TOTAL_YEARS, type DashaLord } from './constants.ts'
import { normalize360 } from './math.ts'
import { nearNakshatraBoundary } from './boundary.ts'

export type DashaPeriod = {
  level: 'mahadasha' | 'antardasha' | 'pratyantardasha'
  lord: string
  start_utc: string
  end_utc: string
  duration_years: number
  duration_days: number
  parent_lords: string[]
}

export type VimshottariDashaResult = {
  moon_nakshatra_index: number
  moon_nakshatra: string
  birth_dasha_lord: string
  dasha_total_years: number
  dasha_elapsed_years: number
  dasha_remaining_years: number
  dasha_year_basis: '365.25_days' | 'sidereal_year_validated'
  mahadasha_sequence: DashaPeriod[]
  antardasha_sequence: DashaPeriod[]
  pratyantardasha_sequence: DashaPeriod[]
  current_dasha: {
    mahadasha: DashaPeriod | null
    antardasha: DashaPeriod | null
    pratyantardasha: DashaPeriod | null
  }
  boundary_warnings: string[]
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString()
}

function nowISO(): string { return new Date().toISOString() }

function findCurrent<T extends { start_utc: string; end_utc: string }>(periods: T[]): T | null {
  const now = Date.now()
  return periods.find(p => new Date(p.start_utc).getTime() <= now && now < new Date(p.end_utc).getTime()) ?? null
}

export function calculateVimshottari(moonSidereal: number, birthUtcISO: string): VimshottariDashaResult {
  const normalized = normalize360(moonSidereal)
  const moon_nakshatra_index = Math.floor(normalized / NAKSHATRA_SPAN)
  const clampedIdx = Math.min(moon_nakshatra_index, 26)
  const nak = NAKSHATRA_MAP[clampedIdx]
  const birth_dasha_lord = nak.lord as DashaLord
  const dasha_total_years = DASHA_YEARS[birth_dasha_lord]
  const degrees_into_nakshatra = normalized - clampedIdx * NAKSHATRA_SPAN
  const fraction_elapsed = degrees_into_nakshatra / NAKSHATRA_SPAN
  const dasha_elapsed_years = fraction_elapsed * dasha_total_years
  const dasha_remaining_years = dasha_total_years - dasha_elapsed_years

  // Boundary warnings
  const boundary_warnings: string[] = []
  if (nearNakshatraBoundary(moonSidereal)) boundary_warnings.push('Moon near nakshatra boundary — dasha lord boundary-sensitive')

  // Build mahadasha start (birth minus elapsed years)
  const birthMs = new Date(birthUtcISO).getTime()
  const mhStart = new Date(birthMs - dasha_elapsed_years * DASHA_YEAR_DAYS * 86400000).toISOString()

  // Find the starting index in the dasha sequence
  const startIdx = DASHA_SEQUENCE.indexOf(birth_dasha_lord as DashaLord)

  // Build 9 mahadashas
  const mahadasha_sequence: DashaPeriod[] = []
  let mhCursor = mhStart
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_SEQUENCE[(startIdx + i) % 9] as DashaLord
    const years = i === 0 ? dasha_total_years : DASHA_YEARS[lord]
    const days = years * DASHA_YEAR_DAYS
    const end = addDays(mhCursor, days)
    mahadasha_sequence.push({
      level: 'mahadasha',
      lord,
      start_utc: mhCursor,
      end_utc: end,
      duration_years: years,
      duration_days: days,
      parent_lords: [],
    })
    mhCursor = end
  }

  // Build antardashas for each mahadasha
  const antardasha_sequence: DashaPeriod[] = []
  const pratyantardasha_sequence: DashaPeriod[] = []

  for (const mh of mahadasha_sequence) {
    const mhIdx = DASHA_SEQUENCE.indexOf(mh.lord as DashaLord)
    let adCursor = mh.start_utc
    for (let j = 0; j < 9; j++) {
      const adLord = DASHA_SEQUENCE[(mhIdx + j) % 9] as DashaLord
      const adYears = mh.duration_years * DASHA_YEARS[adLord] / VIMSHOTTARI_TOTAL_YEARS
      const adDays = adYears * DASHA_YEAR_DAYS
      const adEnd = addDays(adCursor, adDays)
      antardasha_sequence.push({
        level: 'antardasha',
        lord: adLord,
        start_utc: adCursor,
        end_utc: adEnd,
        duration_years: adYears,
        duration_days: adDays,
        parent_lords: [mh.lord],
      })

      // Build pratyantardashas for this antardasha
      const adIdx = DASHA_SEQUENCE.indexOf(adLord)
      let pdCursor = adCursor
      for (let k = 0; k < 9; k++) {
        const pdLord = DASHA_SEQUENCE[(adIdx + k) % 9] as DashaLord
        const pdYears = adYears * DASHA_YEARS[pdLord] / VIMSHOTTARI_TOTAL_YEARS
        const pdDays = pdYears * DASHA_YEAR_DAYS
        const pdEnd = addDays(pdCursor, pdDays)
        pratyantardasha_sequence.push({
          level: 'pratyantardasha',
          lord: pdLord,
          start_utc: pdCursor,
          end_utc: pdEnd,
          duration_years: pdYears,
          duration_days: pdDays,
          parent_lords: [mh.lord, adLord],
        })
        pdCursor = pdEnd
      }
      adCursor = adEnd
    }
  }

  const current_mahadasha = findCurrent(mahadasha_sequence)
  const current_antardasha = findCurrent(antardasha_sequence)
  const current_pratyantardasha = findCurrent(pratyantardasha_sequence)

  return {
    moon_nakshatra_index: clampedIdx,
    moon_nakshatra: nak.name,
    birth_dasha_lord,
    dasha_total_years,
    dasha_elapsed_years,
    dasha_remaining_years,
    dasha_year_basis: '365.25_days',
    mahadasha_sequence,
    antardasha_sequence,
    pratyantardasha_sequence,
    current_dasha: {
      mahadasha: current_mahadasha,
      antardasha: current_antardasha,
      pratyantardasha: current_pratyantardasha,
    },
    boundary_warnings,
  }
}
