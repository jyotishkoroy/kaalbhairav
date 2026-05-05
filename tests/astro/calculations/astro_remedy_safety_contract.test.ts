/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { describe, expect, it } from 'vitest';
import {
  buildSafeGenericRemedies,
  validateRemedyText,
} from '@/lib/astro/calculations/remedy-safety.ts';

describe('remedy safety contract', () => {
  it('allows low-cost reflective generic remedy language', () => {
    const result = validateRemedyText('You may journal, meditate, and keep a disciplined routine.');

    expect(result.status).toBe('safe');
    expect(result.sanitizedText).not.toBeNull();
  });

  it('blocks gemstone certainty claims', () => {
    const result = validateRemedyText('You must wear a blue sapphire and it will definitely fix your life.');

    expect(result.status).toBe('blocked');
    expect(result.issues.some((issue) => issue.code === 'gemstone_certainty')).toBe(true);
  });

  it('blocks financially coercive ritual pressure', () => {
    const result = validateRemedyText('The only way is to pay for an urgent puja, otherwise disaster will happen.');

    expect(result.status).toBe('blocked');
    expect(result.issues.some((issue) => issue.code === 'expensive_puja_pressure' || issue.code === 'fear_based_guarantee')).toBe(true);
  });

  it('blocks medical claims', () => {
    const result = validateRemedyText('This remedy will cure your illness and replace doctor treatment.');

    expect(result.status).toBe('blocked');
    expect(result.issues.some((issue) => issue.code === 'medical_claim')).toBe(true);
  });

  it('blocks legal financial guarantees', () => {
    const result = validateRemedyText('This ritual gives guaranteed profit and court victory.');

    expect(result.status).toBe('blocked');
    expect(result.issues.some((issue) => issue.code === 'legal_financial_claim')).toBe(true);
  });

  it('blocks harmful instructions', () => {
    const result = validateRemedyText('You should fast without water for days.');

    expect(result.status).toBe('blocked');
    expect(result.issues.some((issue) => issue.code === 'harmful_instruction')).toBe(true);
  });

  it('generic safe remedies contain no blocked text', () => {
    const remedies = buildSafeGenericRemedies();

    for (const remedy of remedies) {
      const result = validateRemedyText(remedy);
      expect(result.status).toBe('safe');
    }
  });
});
