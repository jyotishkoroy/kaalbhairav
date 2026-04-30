export type PythonTimingAdapterWindow = {
  label: string;
  startsOn?: string;
  endsOn?: string;
  domain: string;
  interpretation: string;
  source: "python_transit";
  confidence: "partial" | "strong";
  tags: string[];
  metadata: Record<string, unknown>;
};

export type PythonTimingAdapterInput = {
  question: string;
  domain: string;
  userId?: string;
  profileId?: string | null;
  chartFacts?: unknown[];
  timeoutMs?: number;
  enabled?: boolean;
  adapter?: (input: PythonTimingAdapterInput) => Promise<PythonTimingAdapterWindow[]>;
};

export type PythonTimingAdapterResult = {
  ok: boolean;
  windows: PythonTimingAdapterWindow[];
  error?: string;
  skipped: boolean;
};

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}

function normalizeTags(value: unknown): string[] {
  const items = Array.isArray(value) ? value : value == null ? [] : [value];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(normalized);
  }
  return tags;
}

function sanitizeWindow(window: unknown, fallbackDomain: string): PythonTimingAdapterWindow | null {
  if (!window || typeof window !== "object" || Array.isArray(window)) return null;
  const raw = window as Record<string, unknown>;
  const label = typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : null;
  const interpretation = typeof raw.interpretation === "string" && raw.interpretation.trim() ? raw.interpretation.trim() : null;
  const domain = typeof raw.domain === "string" && raw.domain.trim() ? raw.domain.trim() : fallbackDomain;
  if (!label || !interpretation || !domain) return null;

  const startsOn = isIsoDate(raw.startsOn) ? raw.startsOn : undefined;
  const endsOn = isIsoDate(raw.endsOn) ? raw.endsOn : undefined;
  if ((raw.startsOn != null && !startsOn) || (raw.endsOn != null && !endsOn)) return null;
  if (startsOn && endsOn && compareIsoDates(endsOn, startsOn) < 0) return null;

  const confidence = raw.confidence === "strong" ? "strong" : "partial";
  return {
    label,
    startsOn,
    endsOn,
    domain,
    interpretation,
    source: "python_transit",
    confidence,
    tags: normalizeTags(raw.tags),
    metadata: raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata) ? { ...(raw.metadata as Record<string, unknown>) } : {},
  };
}

function isWindowLikeArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function timeoutError(ms: number): Error {
  return new Error(`python timing adapter timeout after ${ms}ms`);
}

export async function getPythonTimingWindows(input: PythonTimingAdapterInput): Promise<PythonTimingAdapterResult> {
  const enabled = input.enabled === true;
  const timeoutMs = Number.isFinite(input.timeoutMs ?? NaN) && (input.timeoutMs ?? 0) > 0 ? Math.trunc(input.timeoutMs as number) : 5000;
  if (!enabled) {
    return { ok: true, windows: [], skipped: true };
  }
  if (typeof input.adapter !== "function") {
    return { ok: true, windows: [], skipped: true };
  }

  try {
    const result = await Promise.race([
      Promise.resolve().then(() => input.adapter?.(input)),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          clearTimeout(timer);
          reject(timeoutError(timeoutMs));
        }, timeoutMs);
      }),
    ]);
    if (!isWindowLikeArray(result)) {
      return { ok: false, windows: [], skipped: false, error: "invalid_timing_adapter_output" };
    }
    const rawWindows = result;
    const windows = rawWindows.map((window) => sanitizeWindow(window, input.domain)).filter((window): window is PythonTimingAdapterWindow => Boolean(window));
    if (!windows.length && rawWindows.length > 0) {
      return { ok: false, windows: [], skipped: false, error: "invalid_timing_adapter_output" };
    }
    return { ok: true, windows, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, windows: [], skipped: false, error: message };
  }
}
