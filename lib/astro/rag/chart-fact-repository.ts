import type { ChartFact } from "./chart-fact-extractor";

export type ChartFactRepositoryResult = {
  ok: boolean;
  facts: ChartFact[];
};

export async function upsertChartFacts(_facts: ChartFact[]): Promise<ChartFactRepositoryResult> {
  void _facts;
  return { ok: true, facts: [] };
}
