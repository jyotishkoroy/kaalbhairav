/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import { renderReadingPlanFallback } from "./reading-plan-renderer";
import type { CompassionateSynthesisInput, CompassionateSynthesisResult } from "./compassionate-synthesizer";

export function buildCompassionateSynthesisFallback(input: CompassionateSynthesisInput, reason?: string): CompassionateSynthesisResult {
  const fallback = String(input.fallbackAnswer ?? "").trim();
  const rendered = renderReadingPlanFallback(input.plan);
  const answer = fallback && fallback.length >= rendered.length ? fallback : rendered;
  return {
    answer,
    source: "fallback",
    rejectedReason: reason,
    warnings: reason ? [reason] : [],
    metadata: {
      groqAttempted: Boolean(reason && !/disabled|missing_client|pipeline_disabled/i.test(reason)),
      groqAccepted: false,
      fallbackUsed: true,
    },
  };
}
