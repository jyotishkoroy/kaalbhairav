/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import type { AstroSectionContract, CalculationSource } from './contracts';

export type CalculationProvenance = {
  source: CalculationSource;
  engineVersion?: string;
  ephemerisVersion?: string;
  inputHash?: string;
  settingsHash?: string;
  chartVersionId?: string;
};

type SectionWithOptionalLlmSource = Omit<AstroSectionContract, 'source'> & {
  source?: CalculationSource | 'llm_grounded_text' | 'llm' | 'client_request' | string;
};

export function assertDeterministicSource(
  section: SectionWithOptionalLlmSource,
  fieldKey: string,
): asserts section is AstroSectionContract & { source: 'deterministic_calculation' | 'stored_current_chart_json' } {
  if (
    section.source !== 'deterministic_calculation' &&
    section.source !== 'stored_current_chart_json'
  ) {
    throw new Error(
      `Exact field "${fieldKey}" must come from deterministic calculation or stored current chart JSON.`,
    );
  }
}
