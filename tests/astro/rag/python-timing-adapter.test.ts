import { describe, expect, it, vi } from "vitest";
import { getPythonTimingWindows } from "../../../lib/astro/rag/python-timing-adapter";

function pythonWindow(overrides: Record<string, unknown> = {}) {
  return {
    label: "Window",
    startsOn: "2026-01-01",
    endsOn: "2026-02-01",
    domain: "career",
    interpretation: "interp",
    source: "python_transit" as const,
    confidence: "strong" as const,
    tags: ["A"],
    metadata: { x: 1 },
    ...overrides,
  };
}

describe("getPythonTimingWindows", () => {
  it("disabled adapter returns ok true, skipped true, windows []", async () => {
    await expect(getPythonTimingWindows({ question: "q", domain: "career", enabled: false })).resolves.toMatchObject({ ok: true, skipped: true, windows: [] });
  });

  it("enabled with no adapter returns skipped true", async () => {
    await expect(getPythonTimingWindows({ question: "q", domain: "career", enabled: true })).resolves.toMatchObject({ ok: true, skipped: true, windows: [] });
  });

  it("enabled adapter returns valid python_transit windows", async () => {
    const adapter = vi.fn(async () => [pythonWindow()]);
    const result = await getPythonTimingWindows({ question: "q", domain: "career", enabled: true, adapter });
    expect(result).toMatchObject({ ok: true, skipped: false, windows: [{ source: "python_transit", confidence: "strong", startsOn: "2026-01-01" }] });
  });

  it("adapter throw returns ok false and error", async () => {
    const result = await getPythonTimingWindows({ question: "q", domain: "career", enabled: true, adapter: vi.fn(async () => { throw new Error("boom"); }) as never });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("boom");
  });

  it("adapter timeout returns ok false and error includes timeout", async () => {
    const result = await getPythonTimingWindows({ question: "q", domain: "career", enabled: true, timeoutMs: 20, adapter: vi.fn(async () => new Promise(() => {})) as never });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("timeout");
  });

  it("invalid source is normalized to python_transit only", async () => {
    const result = await getPythonTimingWindows({ question: "q", domain: "career", enabled: true, adapter: vi.fn(async () => [{ ...pythonWindow(), source: "bad" as never }]) as never });
    expect(result.ok).toBe(true);
    expect(result.windows[0].source).toBe("python_transit");
  });

  it("invalid date window rejected", async () => {
    const result = await getPythonTimingWindows({ question: "q", domain: "career", enabled: true, adapter: vi.fn(async () => [{ ...pythonWindow(), startsOn: "2026-1-1" } as never]) as never });
    expect(result.ok).toBe(false);
  });

  it("endsOn before startsOn rejected", async () => {
    const result = await getPythonTimingWindows({ question: "q", domain: "career", enabled: true, adapter: vi.fn(async () => [{ ...pythonWindow(), startsOn: "2026-02-01", endsOn: "2026-01-01" }]) as never });
    expect(result.ok).toBe(false);
  });

  it("confidence invalid becomes partial", async () => {
    const result = await getPythonTimingWindows({ question: "q", domain: "career", enabled: true, adapter: vi.fn(async () => [{ ...pythonWindow(), confidence: "nope" as never }]) as never });
    expect(result.windows[0].confidence).toBe("partial");
  });

  it("tags normalized and deduped", async () => {
    const result = await getPythonTimingWindows({ question: "q", domain: "career", enabled: true, adapter: vi.fn(async () => [{ ...pythonWindow({ tags: ["Career", "career", "  timing "] }) }]) as never });
    expect(result.windows[0].tags).toEqual(["career", "timing"]);
  });

  it("missing interpretation rejected", async () => {
    const result = await getPythonTimingWindows({ question: "q", domain: "career", enabled: true, adapter: vi.fn(async () => [{ label: "Window", domain: "career", source: "python_transit" as const, confidence: "strong" as const, tags: [], metadata: {} } as never]) as never });
    expect(result.ok).toBe(false);
  });

  it("never throws on malformed adapter output", async () => {
    await expect(getPythonTimingWindows({ question: "q", domain: "career", enabled: true, adapter: vi.fn(async () => ({ bad: true } as never)) })).resolves.toMatchObject({ ok: false, skipped: false });
  });
});
