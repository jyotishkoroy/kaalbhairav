import type { ChartFact } from "./chart-fact-extractor";
import type { RequiredDataPlan } from "./required-data-planner";
import type { RetrievalContext, TimingWindow } from "./retrieval-types";
import type { ReasoningPath } from "./reasoning-path-builder";
import type { AstroRagFlags } from "./feature-flags";
import { getPythonTimingWindows, type PythonTimingAdapterInput } from "./python-timing-adapter";

export type TimingSource = "dasha" | "varshaphal" | "python_transit" | "stored" | "user_provided";
export type TimingConfidence = "partial" | "strong";

export type TimingContextWindow = {
  label: string;
  startsOn?: string;
  endsOn?: string;
  domain: string;
  interpretation: string;
  source: TimingSource;
  confidence: TimingConfidence;
  tags: string[];
  factKeys: string[];
  metadata: Record<string, unknown>;
};

export type TimingContext = {
  available: boolean;
  windows: TimingContextWindow[];
  requested: boolean;
  allowed: boolean;
  limitation?: string;
  missingSources: string[];
  warnings: string[];
  metadata: {
    domain: string;
    sourceCounts: Record<TimingSource, number>;
    usedStoredWindows: boolean;
    usedDashaFacts: boolean;
    usedVarshaphalFacts: boolean;
    usedPythonAdapter: boolean;
    usedUserProvidedDates: boolean;
    partial: boolean;
  };
};

export type BuildTimingContextInput = {
  question?: string;
  plan?: RequiredDataPlan;
  context?: RetrievalContext;
  reasoningPath?: ReasoningPath;
  flags?: AstroRagFlags;
  explicitUserDates?: Array<{ label?: string; startsOn?: string; endsOn?: string; interpretation?: string; domain?: string }>;
  pythonAdapter?: PythonTimingAdapterInput["adapter"];
};

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}

function parseDateRangeFromText(text: string): { startsOn?: string; endsOn?: string } | null {
  const normalized = text.trim();
  const rangeMatch = normalized.match(/(?<!\d)(\d{4}-\d{2}-\d{2})(?:\s*(?:to|-)\s*)(\d{4}-\d{2}-\d{2})(?!\d)/i);
  if (rangeMatch) return { startsOn: rangeMatch[1], endsOn: rangeMatch[2] };
  const singleMatch = normalized.match(/(?<!\d)(\d{4}-\d{2}-\d{2})(?!\d)/);
  return singleMatch ? { startsOn: singleMatch[1] } : null;
}

function normalizeTags(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of values) {
    if (typeof item !== "string") continue;
    const normalized = item.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(normalized);
  }
  return tags;
}

function makeSourceCounts(): Record<TimingSource, number> {
  return { dasha: 0, varshaphal: 0, python_transit: 0, stored: 0, user_provided: 0 };
}

function dateWindowValid(startsOn?: string, endsOn?: string): boolean {
  if (startsOn && !isIsoDate(startsOn)) return false;
  if (endsOn && !isIsoDate(endsOn)) return false;
  if (startsOn && endsOn && compareIsoDates(endsOn, startsOn) < 0) return false;
  return true;
}

function dedupeWindows(windows: TimingContextWindow[]): TimingContextWindow[] {
  const seen = new Set<string>();
  return windows.filter((window) => {
    const key = [window.source, window.label, window.startsOn ?? "", window.endsOn ?? "", window.domain].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sourceRank(source: TimingSource): number {
  return { stored: 0, dasha: 1, varshaphal: 2, python_transit: 3, user_provided: 4 }[source];
}

function confidenceRank(confidence: TimingConfidence): number {
  return confidence === "strong" ? 0 : 1;
}

function compareWindows(a: TimingContextWindow, b: TimingContextWindow): number {
  const confidenceDelta = confidenceRank(a.confidence) - confidenceRank(b.confidence);
  if (confidenceDelta) return confidenceDelta;
  const aDate = a.startsOn ?? "";
  const bDate = b.startsOn ?? "";
  if (aDate && bDate && aDate !== bDate) return compareIsoDates(aDate, bDate);
  if (aDate && !bDate) return -1;
  if (!aDate && bDate) return 1;
  const sourceDelta = sourceRank(a.source) - sourceRank(b.source);
  if (sourceDelta) return sourceDelta;
  return a.label.localeCompare(b.label);
}

function cloneMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function dateRangeFromFact(fact: ChartFact): { startsOn?: string; endsOn?: string; warning?: string } | null {
  const metadata = fact.metadata ?? {};
  const candidates = [
    [metadata.startsOn, metadata.endsOn],
    [metadata.starts_on, metadata.ends_on],
    [metadata.startDate, metadata.endDate],
  ] as const;
  for (const [starts, ends] of candidates) {
    const startsOn = typeof starts === "string" ? starts : undefined;
    const endsOn = typeof ends === "string" ? ends : undefined;
    if ((startsOn && !isIsoDate(startsOn)) || (endsOn && !isIsoDate(endsOn))) return { warning: "Invalid timing date in chart fact metadata." };
    if (startsOn && endsOn && compareIsoDates(endsOn, startsOn) < 0) return { warning: "Invalid timing date range in chart fact metadata." };
    if (startsOn || endsOn) return { startsOn, endsOn };
  }
  const valueRange = fact.factValue ? parseDateRangeFromText(fact.factValue) : null;
  if (!valueRange) return null;
  if (!dateRangeFromTextIsValid(valueRange)) return { warning: "Invalid timing date in chart fact value." };
  return valueRange;
}

function dateRangeFromTextIsValid(range: { startsOn?: string; endsOn?: string }): boolean {
  return dateWindowValid(range.startsOn, range.endsOn);
}

function extractTimingFromFact(fact: ChartFact, domain?: string): TimingContextWindow[] {
  const factDomain = domain ?? String(fact.metadata?.domain ?? fact.factKey ?? "general");
  const tags = normalizeTags([...(fact.tags ?? []), "timing", fact.factType]);
  const factKeys = [fact.factKey];
  if (fact.factType === "dasha") {
    const range = dateRangeFromFact(fact);
    if (range?.warning) return [{ label: fact.factValue || fact.factKey || "Dasha backdrop", domain: factDomain, interpretation: "This dasha fact can be used as a broad timing backdrop, but it does not provide an exact date window.", source: "dasha", confidence: "partial", tags, factKeys, metadata: { factKey: fact.factKey, warning: range.warning } }];
    if (range?.startsOn || range?.endsOn) {
      return [{
        label: fact.factValue || fact.factKey || "Dasha window",
        startsOn: range.startsOn,
        endsOn: range.endsOn,
        domain: factDomain,
        interpretation: `Grounded dasha source: ${fact.factValue}`,
        source: "dasha",
        confidence: range.startsOn && range.endsOn ? "strong" : "partial",
        tags,
        factKeys,
        metadata: cloneMetadata(fact.metadata),
      }];
    }
    return [{ label: fact.factValue || "Dasha backdrop", domain: factDomain, interpretation: "This dasha fact can be used as a broad timing backdrop, but it does not provide an exact date window.", source: "dasha", confidence: "partial", tags, factKeys, metadata: cloneMetadata(fact.metadata) }];
  }
  if (fact.factType === "varshaphal") {
    const range = dateRangeFromFact(fact);
    if (range?.warning) return [];
    if (range?.startsOn || range?.endsOn) {
      return [{
        label: fact.factValue || "Varshaphal period",
        startsOn: range.startsOn,
        endsOn: range.endsOn,
        domain: factDomain,
        interpretation: `Grounded Varshaphal source: ${fact.factValue}`,
        source: "varshaphal",
        confidence: range.startsOn && range.endsOn ? "strong" : "partial",
        tags,
        factKeys,
        metadata: cloneMetadata(fact.metadata),
      }];
    }
    const year = typeof fact.metadata?.year === "number" ? fact.metadata.year : typeof fact.factValue === "string" ? fact.factValue.match(/\b(20\d{2})\b/)?.[1] : undefined;
    if (year) {
      const text = String(year);
      return [{ label: fact.factValue || `Varshaphal ${text}`, startsOn: `${text}-01-01`, endsOn: `${text}-12-31`, domain: factDomain, interpretation: `Grounded Varshaphal source: ${fact.factValue}`, source: "varshaphal", confidence: "partial", tags, factKeys, metadata: cloneMetadata(fact.metadata) }];
    }
    return [{ label: fact.factValue || "Varshaphal period", domain: factDomain, interpretation: "This Varshaphal fact is a broad backdrop and does not provide an exact date window.", source: "varshaphal", confidence: "partial", tags, factKeys, metadata: cloneMetadata(fact.metadata) }];
  }
  return [];
}

function hasUnsafeTimingRestriction(input?: BuildTimingContextInput): boolean {
  const question = (input?.question ?? "").toLowerCase();
  return /die|death|medical|diagnos|court|legal|stock|profit|guarantee|lifespan/.test(question);
}

export function extractTimingFromChartFacts(facts: ChartFact[], domain?: string): TimingContextWindow[] {
  const windows: TimingContextWindow[] = [];
  for (const fact of facts ?? []) {
    const extracted = extractTimingFromFact(fact, domain);
    windows.push(...extracted);
  }
  return dedupeWindows(windows).sort(compareWindows).slice(0, 8);
}

export function mapStoredTimingWindow(window: TimingWindow): TimingContextWindow | null {
  return mapStoredTimingWindowInternal(window);
}

export function extractExplicitUserDates(input: BuildTimingContextInput): TimingContextWindow[] {
  return extractExplicitUserDatesInternal(input);
}

function mapStoredTimingWindowInternal(window: TimingWindow): TimingContextWindow | null {
  if (!["dasha", "varshaphal", "python_transit", "stored", "user_provided"].includes(window.source)) return null;
  if (!["partial", "strong"].includes(window.confidence)) return null;
  if (!dateWindowValid(window.startsOn ?? undefined, window.endsOn ?? undefined)) return null;
  return {
    label: window.label || "Timing window",
    startsOn: window.startsOn ?? undefined,
    endsOn: window.endsOn ?? undefined,
    domain: window.domain || "general",
    interpretation: window.interpretation,
    source: window.source,
    confidence: window.confidence,
    tags: normalizeTags(window.tags),
    factKeys: [],
    metadata: cloneMetadata(window.metadata),
  };
}

function extractExplicitUserDatesInternal(input: BuildTimingContextInput): TimingContextWindow[] {
  const out: TimingContextWindow[] = [];
  for (const item of input.explicitUserDates ?? []) {
    if (!item?.startsOn && !item?.endsOn) continue;
    if (!dateWindowValid(item.startsOn, item.endsOn)) continue;
    out.push({
      label: item.label?.trim() || "User-provided timing reference",
      startsOn: item.startsOn,
      endsOn: item.endsOn,
      domain: item.domain?.trim() || input.plan?.domain || input.context?.metadata.domain || "general",
      interpretation: item.interpretation?.trim() || "User-provided timing reference.",
      source: "user_provided",
      confidence: "partial",
      tags: ["timing", "user_provided"],
      factKeys: [],
      metadata: {},
    });
  }
  return out;
}

async function maybeLoadPythonWindows(input: BuildTimingContextInput): Promise<{ windows: TimingContextWindow[]; warning?: string }> {
  const flags = input.flags;
  const allow = flags?.oracleVmTimingEnabled === true || flags?.timingSource === "python_oracle";
  if (!allow || typeof input.pythonAdapter !== "function") return { windows: [] };
  const result = await getPythonTimingWindows({
    question: input.question ?? "",
    domain: input.plan?.domain ?? input.context?.metadata.domain ?? "general",
    enabled: true,
    adapter: input.pythonAdapter,
    timeoutMs: 5000,
  });
  if (!result.ok) return { windows: [], warning: `Python timing adapter failed: ${result.error ?? "unknown error"}` };
  return { windows: result.windows.map((window) => ({
    label: window.label,
    startsOn: window.startsOn,
    endsOn: window.endsOn,
    domain: window.domain || input.plan?.domain || input.context?.metadata.domain || "general",
    interpretation: window.interpretation,
    source: "python_transit",
    confidence: window.confidence,
    tags: normalizeTags(window.tags),
    factKeys: [],
    metadata: cloneMetadata(window.metadata),
  })) };
}

export async function buildTimingContext(input?: BuildTimingContextInput): Promise<TimingContext> {
  const sourceCounts = makeSourceCounts();
  const domain = input?.plan?.domain ?? input?.context?.metadata.domain ?? "general";
  const requested = Boolean(input?.plan?.needsTiming || input?.plan?.requiresTimingSource || input?.question || input?.explicitUserDates?.length);
  const planAllowed = input?.plan?.timingAllowed ?? false;
  const safetyRestricted = Boolean(input?.plan?.blockedBySafety);
  const warnings: string[] = [...(input?.reasoningPath?.warnings ?? [])];
  const missingSources = new Set<string>();
  const windows: TimingContextWindow[] = [];

  if (!input?.plan && !input?.context && !input?.explicitUserDates?.length && !input?.pythonAdapter) {
    return {
      available: false,
      windows: [],
      requested: false,
      allowed: false,
      limitation: "Timing engine is not enabled.",
      missingSources: [],
      warnings: [],
      metadata: { domain, sourceCounts, usedStoredWindows: false, usedDashaFacts: false, usedVarshaphalFacts: false, usedPythonAdapter: false, usedUserProvidedDates: false, partial: true },
    };
  }

  if (hasUnsafeTimingRestriction(input) || safetyRestricted) {
    return {
      available: false,
      windows: [],
      requested,
      allowed: false,
      limitation: "Timing claims are restricted for this question.",
      missingSources: [],
      warnings,
      metadata: { domain, sourceCounts, usedStoredWindows: false, usedDashaFacts: false, usedVarshaphalFacts: false, usedPythonAdapter: false, usedUserProvidedDates: false, partial: Boolean(input?.context?.metadata.partial) },
    };
  }

  if (!planAllowed && requested) {
    return {
      available: false,
      windows: [],
      requested,
      allowed: false,
      limitation: "Timing claims are restricted for this question.",
      missingSources: [],
      warnings,
      metadata: { domain, sourceCounts, usedStoredWindows: false, usedDashaFacts: false, usedVarshaphalFacts: false, usedPythonAdapter: false, usedUserProvidedDates: false, partial: Boolean(input?.context?.metadata.partial) },
    };
  }

  for (const window of input?.context?.timingWindows ?? []) {
    const mapped = mapStoredTimingWindowInternal(window);
    if (!mapped) {
      warnings.push("One or more stored timing windows were rejected because of invalid source or date data.");
      continue;
    }
    windows.push(mapped);
    sourceCounts[mapped.source] += 1;
  }

  const facts = input?.context?.chartFacts ?? [];
  for (const fact of facts) {
    if (fact.factType === "dasha" || fact.factKey === "current_mahadasha" || fact.factKey === "current_antardasha") {
      const extracted = extractTimingFromFact(fact, domain);
      if (extracted.some((window) => window.metadata.warning)) warnings.push("One or more dasha timing facts contained invalid dates.");
      windows.push(...extracted.filter((window) => window.source === "dasha"));
      sourceCounts.dasha += extracted.filter((window) => window.source === "dasha").length;
    }
    if (fact.factType === "varshaphal") {
      const extracted = extractTimingFromFact(fact, domain);
      if (!extracted.length && fact.metadata && (fact.metadata.startsOn || fact.metadata.endsOn || fact.metadata.starts_on || fact.metadata.ends_on)) {
        warnings.push("One or more Varshaphal timing facts contained invalid dates.");
      }
      windows.push(...extracted.filter((window) => window.source === "varshaphal"));
      sourceCounts.varshaphal += extracted.filter((window) => window.source === "varshaphal").length;
    }
  }

  for (const userWindow of extractExplicitUserDatesInternal(input ?? {})) {
    windows.push(userWindow);
    sourceCounts.user_provided += 1;
  }

  const python = await maybeLoadPythonWindows(input ?? {});
  if (python.warning) warnings.push(python.warning);
  for (const window of python.windows) {
    windows.push(window);
    sourceCounts.python_transit += 1;
  }

  const deduped = dedupeWindows(windows).sort(compareWindows).slice(0, 8);
  const usedStoredWindows = deduped.some((window) => window.source === "stored");
  const usedDashaFacts = deduped.some((window) => window.source === "dasha");
  const usedVarshaphalFacts = deduped.some((window) => window.source === "varshaphal");
  const usedPythonAdapter = deduped.some((window) => window.source === "python_transit");
  const usedUserProvidedDates = deduped.some((window) => window.source === "user_provided");
  const partial = Boolean(input?.context?.metadata.partial || deduped.some((window) => window.confidence === "partial"));
  const allowed = planAllowed && !safetyRestricted;
  const available = deduped.length > 0 && allowed;
  if (!deduped.length) {
    missingSources.add("timing_source");
  }
  if (input?.plan?.requiresTimingSource && !deduped.length) missingSources.add("timing_source");
  if (!deduped.length) {
    return {
      available: false,
      windows: [],
      requested,
      allowed,
      limitation: "No grounded timing source is available yet, so I cannot state a timing window.",
      missingSources: [...missingSources],
      warnings: [...warnings, ...(input?.context?.metadata.partial ? ["Retrieval context was partial; timing context may be incomplete."] : [])],
      metadata: { domain, sourceCounts, usedStoredWindows, usedDashaFacts, usedVarshaphalFacts, usedPythonAdapter, usedUserProvidedDates, partial: true },
    };
  }

  return {
    available,
    windows: deduped,
    requested,
    allowed,
    limitation: available ? undefined : "Timing claims are restricted for this question.",
    missingSources: [...missingSources],
    warnings: [...warnings, ...(input?.context?.metadata.partial ? ["Retrieval context was partial; timing context may be incomplete."] : [])],
    metadata: { domain, sourceCounts, usedStoredWindows, usedDashaFacts, usedVarshaphalFacts, usedPythonAdapter, usedUserProvidedDates, partial },
  };
}
