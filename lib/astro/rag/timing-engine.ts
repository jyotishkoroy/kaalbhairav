export type TimingContext = {
  available: boolean;
  windows: Array<{
    label: string;
    startsOn?: string;
    endsOn?: string;
    domain: string;
    interpretation: string;
    source: "dasha" | "varshaphal" | "python_transit" | "stored";
    confidence: "partial" | "strong";
  }>;
  limitation?: string;
};

export function buildTimingContext(): TimingContext {
  return { available: false, windows: [], limitation: "Timing engine is not enabled." };
}
