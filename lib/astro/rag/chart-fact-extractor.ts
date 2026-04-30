export type ChartFact = {
  factType: string;
  factKey: string;
  factValue: string;
  tags: string[];
};

export function extractChartFactsFromVersion(_chartJson: unknown): ChartFact[] {
  void _chartJson;
  return [];
}
