/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract } from './contracts.ts';
import { makeUnavailableValue } from './unavailable.ts';

export const ASHTAKAVARGA_BAV_PLANETS = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
] as const;

export type AshtakavargaBavPlanet = (typeof ASHTAKAVARGA_BAV_PLANETS)[number];

export type AshtakavargaBavRow = {
  planet: AshtakavargaBavPlanet;
  bindusBySign: readonly number[];
};

export type SarvashtakavargaTotalResult = {
  status: 'computed';
  source: 'deterministic_calculation';
  totalsBySign: number[];
  grandTotal: number;
  contributingPlanets: AshtakavargaBavPlanet[];
  ruleVersion: 'sarvashtakavarga_total_from_seven_bav_rows_v1';
};

function isBavPlanet(value: unknown): value is AshtakavargaBavPlanet {
  return typeof value === 'string' && (ASHTAKAVARGA_BAV_PLANETS as readonly string[]).includes(value);
}

function normalizeBavRows(rows: readonly AshtakavargaBavRow[]): Map<AshtakavargaBavPlanet, AshtakavargaBavRow> {
  const byPlanet = new Map<AshtakavargaBavPlanet, AshtakavargaBavRow>();

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      throw new Error('Each BAV row must be an object.');
    }

    if (!isBavPlanet((row as { planet?: unknown }).planet)) {
      throw new Error(`Unsupported BAV planet: ${String((row as { planet?: unknown }).planet)}`);
    }

    if (!Array.isArray(row.bindusBySign) || row.bindusBySign.length !== 12) {
      throw new Error(`BAV row for ${row.planet} must contain exactly 12 sign bindu values.`);
    }

    for (const bindu of row.bindusBySign) {
      if (!Number.isInteger(bindu) || bindu < 0) {
        throw new Error(`BAV row for ${row.planet} contains a nonnumeric or negative bindu.`);
      }
    }

    if (byPlanet.has(row.planet)) {
      throw new Error(`Duplicate BAV row for ${row.planet}.`);
    }

    byPlanet.set(row.planet, row);
  }

  return byPlanet;
}

export function calculateSarvashtakavargaTotalFromBavRows(
  rows: readonly AshtakavargaBavRow[],
): SarvashtakavargaTotalResult {
  if (!Array.isArray(rows)) {
    throw new Error('BAV rows must be an array.');
  }

  const byPlanet = normalizeBavRows(rows);
  const missingPlanets = ASHTAKAVARGA_BAV_PLANETS.filter((planet) => !byPlanet.has(planet));

  if (missingPlanets.length > 0) {
    throw new Error(`Missing BAV rows for: ${missingPlanets.join(', ')}.`);
  }

  const totalsBySign = Array.from({ length: 12 }, (_unused, signIndex) => {
    return ASHTAKAVARGA_BAV_PLANETS.reduce((sum, planet) => {
      const row = byPlanet.get(planet);

      if (!row) {
        throw new Error(`Missing BAV row for ${planet}.`);
      }

      return sum + row.bindusBySign[signIndex];
    }, 0);
  });

  return {
    status: 'computed',
    source: 'deterministic_calculation',
    totalsBySign,
    grandTotal: totalsBySign.reduce((sum, value) => sum + value, 0),
    contributingPlanets: [...ASHTAKAVARGA_BAV_PLANETS],
    ruleVersion: 'sarvashtakavarga_total_from_seven_bav_rows_v1',
  };
}

export function buildAshtakavargaSection(args: {
  bavRows?: readonly AshtakavargaBavRow[] | null;
}): AstroSectionContract {
  if (!args.bavRows || args.bavRows.length === 0) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'module_not_implemented',
      fields: {
        binduMatrix: makeUnavailableValue({
          requiredModule: 'ashtakavarga_bindu_matrix',
          fieldKey: 'ashtakavarga.binduMatrix',
          reason: 'module_not_implemented',
        }),
        bavRows: makeUnavailableValue({
          requiredModule: 'ashtakavarga_bav_rows',
          fieldKey: 'ashtakavarga.bavRows',
          reason: 'module_not_implemented',
        }),
        sarvashtakavargaTotal: makeUnavailableValue({
          requiredModule: 'ashtakavarga_total',
          fieldKey: 'ashtakavarga.sarvashtakavargaTotal',
          reason: 'insufficient_birth_data',
        }),
      },
      warnings: [
        'Ashtakavarga BAV contribution rows are not deterministically implemented in this phase.',
      ],
    };
  }

  try {
    const total = calculateSarvashtakavargaTotalFromBavRows(args.bavRows);

    return {
      status: 'partial',
      source: 'deterministic_calculation',
      fields: {
        sarvashtakavargaTotal: total,
        binduMatrix: makeUnavailableValue({
          requiredModule: 'ashtakavarga_bindu_matrix',
          fieldKey: 'ashtakavarga.binduMatrix',
          reason: 'module_not_implemented',
        }),
        bavRows: args.bavRows,
      },
      warnings: [
        'Only Sarvashtakavarga total validation is computed from supplied deterministic BAV rows. Full BAV contribution matrix generation remains unavailable.',
      ],
    };
  } catch (error) {
    return {
      status: 'unavailable',
      source: 'none',
      reason: 'calculation_failed',
      fields: {
        binduMatrix: makeUnavailableValue({
          requiredModule: 'ashtakavarga_bindu_matrix',
          fieldKey: 'ashtakavarga.binduMatrix',
          reason: 'calculation_failed',
        }),
        bavRows: makeUnavailableValue({
          requiredModule: 'ashtakavarga_bav_rows',
          fieldKey: 'ashtakavarga.bavRows',
          reason: 'calculation_failed',
        }),
        sarvashtakavargaTotal: makeUnavailableValue({
          requiredModule: 'ashtakavarga_total',
          fieldKey: 'ashtakavarga.sarvashtakavargaTotal',
          reason: 'calculation_failed',
        }),
      },
      warnings: [error instanceof Error ? error.message : 'Ashtakavarga total unavailable.'],
    };
  }
}
