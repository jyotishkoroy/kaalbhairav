/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type ReportFieldSourceType =
  | 'input_display'
  | 'astronomical_calculation'
  | 'deterministic_derived'
  | 'static_lookup'
  | 'static_template'
  | 'rag_grounded_text'
  | 'llm_grounded_text'
  | 'unavailable';

export type ReportFieldRiskLevel =
  | 'SAFE'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'BLOCKER';

export function isDeterministicReportFieldSource(sourceType: ReportFieldSourceType): boolean {
  return sourceType === 'input_display'
    || sourceType === 'astronomical_calculation'
    || sourceType === 'deterministic_derived'
    || sourceType === 'static_lookup'
    || sourceType === 'static_template';
}
