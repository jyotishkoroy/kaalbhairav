/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract } from './contracts.ts'
import type { EphemerisProvider } from './ephemeris-provider.ts'
import { makeUnavailableValue } from './unavailable.ts'

export type CalculateSunriseSunsetV2Args = {
  dateLocal: string
  latitudeDeg: number | null
  longitudeDeg: number | null
  timezoneHours: number | null
  provider?: EphemerisProvider
}

export async function calculateSunriseSunsetV2(
  args: CalculateSunriseSunsetV2Args,
): Promise<AstroSectionContract> {
  if (
    args.latitudeDeg === null ||
    args.longitudeDeg === null ||
    args.timezoneHours === null
  ) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'insufficient_birth_data',
      fields: {
        sunrise: makeUnavailableValue({
          requiredModule: 'sunrise_sunset',
          fieldKey: 'panchang.sunrise',
          reason: 'insufficient_birth_data',
        }),
        sunset: makeUnavailableValue({
          requiredModule: 'sunrise_sunset',
          fieldKey: 'panchang.sunset',
          reason: 'insufficient_birth_data',
        }),
      },
    }
  }

  if (!args.provider?.calculateSunriseSunset) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'module_not_implemented',
      fields: {
        sunrise: makeUnavailableValue({
          requiredModule: 'sunrise_sunset',
          fieldKey: 'panchang.sunrise',
          reason: 'module_not_implemented',
        }),
        sunset: makeUnavailableValue({
          requiredModule: 'sunrise_sunset',
          fieldKey: 'panchang.sunset',
          reason: 'module_not_implemented',
        }),
      },
    }
  }

  try {
    const result = await args.provider.calculateSunriseSunset({
      dateLocal: args.dateLocal,
      latitudeDeg: args.latitudeDeg,
      longitudeDeg: args.longitudeDeg,
      timezoneHours: args.timezoneHours,
    })

    return {
      status: 'computed',
      source: 'deterministic_calculation',
      engine: args.provider.engineId,
      fields: {
        sunriseLocalIso: result.sunriseLocalIso,
        sunsetLocalIso: result.sunsetLocalIso,
      },
    }
  } catch (error) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'ephemeris_unavailable',
      fields: {
        sunrise: makeUnavailableValue({
          requiredModule: 'sunrise_sunset',
          fieldKey: 'panchang.sunrise',
          reason: 'ephemeris_unavailable',
        }),
        sunset: makeUnavailableValue({
          requiredModule: 'sunrise_sunset',
          fieldKey: 'panchang.sunset',
          reason: 'ephemeris_unavailable',
        }),
      },
      warnings: [error instanceof Error ? error.message : 'Sunrise/sunset provider unavailable.'],
    }
  }
}
