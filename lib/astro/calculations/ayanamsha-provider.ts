/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AyanamshaType } from './contracts.ts';
import { normalizeDegrees360 } from './ephemeris-provider.ts';

export interface AyanamshaProvider {
  engineId: string;
  // Exact AstroSage bit-for-bit reproduction may require matching ephemeris files,
  // ayanamsha constants, and provider versions. This interface keeps the provider
  // swappable and versioned without allowing LLM-generated exact facts.
  calculateAyanamshaDeg(
    jdUtExact: number,
    type: AyanamshaType,
  ): Promise<number> | number;
}

export function tropicalToSidereal(
  tropicalLongitudeDeg: number,
  ayanamshaDeg: number,
): number {
  if (!Number.isFinite(tropicalLongitudeDeg)) {
    throw new Error('Tropical longitude must be a finite number.');
  }

  if (!Number.isFinite(ayanamshaDeg)) {
    throw new Error('Ayanamsha must be a finite number.');
  }

  return normalizeDegrees360(tropicalLongitudeDeg - ayanamshaDeg);
}

export function normalizeAyanamshaType(input: unknown): AyanamshaType {
  if (typeof input !== 'string') {
    throw new Error('Ayanamsha type must be a string.');
  }

  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[.\s-]+/g, '_')
    .replace(/_+/g, '_');

  if (normalized === 'lahiri') {
    return 'lahiri';
  }

  if (
    normalized === 'kp_new' ||
    normalized === 'k_p_new' ||
    normalized === 'k_p_new_' ||
    input.trim().toLowerCase() === 'k. p. new' ||
    input.trim().toLowerCase() === 'k.p. new'
  ) {
    return 'kp_new';
  }

  throw new Error(`Unsupported ayanamsha type: ${input}`);
}

export function assertAyanamshaDeg(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Ayanamsha must be finite.');
  return value;
}
