// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

export { validateAnswerTiming } from './validators/timing-validator.ts';

export function validateUnsupportedAdvancedTimingClaim(args: {
  text: string;
  availableFieldKeys?: readonly string[];
}): {
  valid: boolean;
  reason?: string;
} {
  const text = args.text.toLowerCase();
  const available = new Set(args.availableFieldKeys ?? []);

  const claimsSadeSatiDate =
    text.includes('sade sati') &&
    /\b(start|starts|end|ends|date|from|until|between|period)\b/i.test(args.text);

  if (claimsSadeSatiDate && !available.has('advanced.sadeSatiDates')) {
    return {
      valid: false,
      reason: 'Detailed Sade Sati timing is unavailable without deterministic Saturn ingress fixtures.',
    };
  }

  const claimsVarshaphalTiming = text.includes('varshaphal') || text.includes('solar return');

  if (claimsVarshaphalTiming && !available.has('advanced.varshaphal')) {
    return {
      valid: false,
      reason: 'Varshaphal timing is unavailable without deterministic solar-return calculation.',
    };
  }

  const claimsTransitTiming =
    text.includes('transit') &&
    /\b(on|from|until|between|date|window|period|starts|ends)\b/i.test(args.text);

  if (claimsTransitTiming && !available.has('transits.predictionTiming')) {
    return {
      valid: false,
      reason: 'Transit timing claims require deterministic as-of date and ephemeris-backed timing fields.',
    };
  }

  return { valid: true };
}
