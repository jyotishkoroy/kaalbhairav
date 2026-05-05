/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import {
  ASHTAKAVARGA_BAV_PLANETS,
  buildAshtakavargaSection,
  calculateSarvashtakavargaTotalFromBavRows,
  type AshtakavargaBavRow,
} from '@/lib/astro/calculations/ashtakavarga.ts';
import { isUnavailableValue } from '@/lib/astro/calculations/unavailable.ts';

function completeBavRows(): AshtakavargaBavRow[] {
  return [
    { planet: 'Sun', bindusBySign: [3, 4, 2, 5, 3, 4, 2, 3, 5, 4, 3, 2] },
    { planet: 'Moon', bindusBySign: [4, 3, 5, 2, 4, 3, 5, 4, 2, 3, 4, 5] },
    { planet: 'Mars', bindusBySign: [2, 3, 4, 3, 2, 5, 4, 3, 2, 5, 4, 3] },
    { planet: 'Mercury', bindusBySign: [5, 2, 3, 4, 5, 2, 3, 4, 5, 2, 3, 4] },
    { planet: 'Jupiter', bindusBySign: [3, 5, 4, 2, 3, 5, 4, 2, 3, 5, 4, 2] },
    { planet: 'Venus', bindusBySign: [4, 4, 3, 3, 5, 5, 2, 2, 4, 4, 3, 3] },
    { planet: 'Saturn', bindusBySign: [2, 2, 5, 5, 3, 3, 4, 4, 2, 2, 5, 5] },
  ];
}

describe('astro ashtakavarga total fixture contract', () => {
  it('computes Sarvashtakavarga total from seven BAV rows', () => {
    const result = calculateSarvashtakavargaTotalFromBavRows(completeBavRows());

    expect(result.status).toBe('computed');
    expect(result.totalsBySign).toEqual([23, 23, 26, 24, 25, 27, 24, 22, 23, 25, 26, 24]);
    expect(result.grandTotal).toBe(292);
    expect(result.contributingPlanets).toEqual(ASHTAKAVARGA_BAV_PLANETS);
  });

  it('rejects unsupported BAV planets including Rahu and Uranus', () => {
    expect(() =>
      calculateSarvashtakavargaTotalFromBavRows([
        ...completeBavRows(),
        { planet: 'Rahu', bindusBySign: Array(12).fill(1) } as unknown as AshtakavargaBavRow,
      ]),
    ).toThrow(/Unsupported BAV planet/);

    expect(() =>
      calculateSarvashtakavargaTotalFromBavRows([
        ...completeBavRows(),
        { planet: 'Uranus', bindusBySign: Array(12).fill(1) } as unknown as AshtakavargaBavRow,
      ]),
    ).toThrow(/Unsupported BAV planet/);
  });

  it('rejects nonnumeric and negative bindus', () => {
    const nonnumeric = completeBavRows().map((row) => row.planet === 'Moon' ? { ...row, bindusBySign: [4, 3, 5, 2, 4, 3, 5, 4, 2, 3, Number.NaN, 5] } : row);
    expect(() => calculateSarvashtakavargaTotalFromBavRows(nonnumeric)).toThrow(/nonnumeric or negative bindu/);

    const negative = completeBavRows().map((row) => row.planet === 'Moon' ? { ...row, bindusBySign: [4, 3, 5, 2, 4, 3, 5, 4, 2, 3, -1, 5] } : row);
    expect(() => calculateSarvashtakavargaTotalFromBavRows(negative)).toThrow(/nonnumeric or negative bindu/);
  });

  it('rejects missing one required BAV row', () => {
    const rows = completeBavRows().filter((row) => row.planet !== 'Saturn');

    expect(() => calculateSarvashtakavargaTotalFromBavRows(rows)).toThrow(/Missing BAV rows for: Saturn/);
  });

  it('rejects duplicate rows instead of double counting', () => {
    const rows = completeBavRows();

    expect(() =>
      calculateSarvashtakavargaTotalFromBavRows([...rows, rows[0]]),
    ).toThrow(/Duplicate BAV row for Sun/);
  });

  it('buildAshtakavargaSection returns unavailable when no deterministic BAV rows exist', () => {
    const section = buildAshtakavargaSection({ bavRows: null });

    expect(section.status).toBe('unavailable');
    expect(isUnavailableValue(section.fields?.binduMatrix)).toBe(true);
    expect(isUnavailableValue(section.fields?.bavRows)).toBe(true);
    expect(isUnavailableValue(section.fields?.sarvashtakavargaTotal)).toBe(true);
  });

  it('buildAshtakavargaSection computes only total while full bindu matrix remains unavailable', () => {
    const section = buildAshtakavargaSection({ bavRows: completeBavRows() });

    expect(section.status).toBe('partial');
    expect((section.fields?.sarvashtakavargaTotal as { status?: string }).status).toBe('computed');
    expect(isUnavailableValue(section.fields?.binduMatrix)).toBe(true);
    expect(section.warnings?.join(' ')).toMatch(/Full BAV contribution matrix generation remains unavailable/);
  });
});
