export type RetrievalContext = {
  chartFacts: unknown[];
  reasoningRules: unknown[];
  benchmarkExamples: unknown[];
  timingWindows: unknown[];
  safeRemedies: unknown[];
  memorySummary?: string;
};

export async function retrieveAstroRagContext(): Promise<RetrievalContext> {
  return { chartFacts: [], reasoningRules: [], benchmarkExamples: [], timingWindows: [], safeRemedies: [] };
}
