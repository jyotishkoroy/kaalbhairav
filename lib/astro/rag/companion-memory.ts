export type CompanionMemorySummary = {
  safeSummary: string | null;
};

export function summarizeCompanionMemory(): CompanionMemorySummary {
  return { safeSummary: null };
}
