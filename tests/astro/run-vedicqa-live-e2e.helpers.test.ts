import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

import fs from "node:fs";
import { assertNoSecretLeaks } from "../../lib/astro/benchmark/e2e-trace.ts";
import {
  findAstroPage,
  hasStorageState,
  isAstroUrl,
  resolveCdpFinalStatus,
  resolveCdpUrl,
  resolveLiveUrl,
  resolveStorageStatePath,
  shouldRequireStorageState,
  useCdpMode,
} from "../../scripts/astro/run-vedicqa-live-e2e.helpers.ts";

describe("run-vedicqa-live-e2e helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.VEDICQA_USE_CDP;
    delete process.env.VEDICQA_CDP_URL;
    delete process.env.VEDICQA_LIVE_URL;
    delete process.env.VEDICQA_E2E_STORAGE_STATE;
  });

  it("requires storage state only outside CDP mode", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(useCdpMode()).toBe(false);
    expect(shouldRequireStorageState()).toBe(true);
    expect(hasStorageState()).toBe(false);

    process.env.VEDICQA_USE_CDP = "true";
    expect(useCdpMode()).toBe(true);
    expect(shouldRequireStorageState()).toBe(false);
  });

  it("keeps default paths and overrides stable", () => {
    expect(resolveCdpUrl()).toBe("http://127.0.0.1:9222");
    expect(resolveLiveUrl()).toBe("https://www.tarayai.com/astro");
    expect(resolveStorageStatePath()).toBe("artifacts/auth/production-storage-state.json");

    process.env.VEDICQA_CDP_URL = "http://127.0.0.1:9333";
    process.env.VEDICQA_LIVE_URL = "https://example.com/astro";
    process.env.VEDICQA_E2E_STORAGE_STATE = "/tmp/state.json";
    expect(resolveCdpUrl()).toBe("http://127.0.0.1:9333");
    expect(resolveLiveUrl()).toBe("https://example.com/astro");
    expect(resolveStorageStatePath()).toBe("/tmp/state.json");
  });

  it("identifies astro pages in an existing browser context", () => {
    const context = {
      pages() {
        return [{ url: () => "https://example.com/" }, { url: () => "https://www.tarayai.com/astro" }];
      },
    };
    expect(findAstroPage(context as never)?.url()).toBe("https://www.tarayai.com/astro");
    expect(isAstroUrl("https://www.tarayai.com/astro?x=1")).toBe(true);
    expect(isAstroUrl("https://www.tarayai.com/sign-in")).toBe(false);
  });

  it("maps cdp final paths to the expected block reasons", () => {
    expect(resolveCdpFinalStatus("https://www.tarayai.com/sign-in")).toEqual({
      status: "blocked",
      reason: "auth_not_available_in_cdp_profile",
    });
    expect(resolveCdpFinalStatus("https://www.tarayai.com/other")).toEqual({
      status: "blocked",
      reason: "not_reached:/other",
    });
    expect(resolveCdpFinalStatus("https://www.tarayai.com/astro")).toBeNull();
  });

  it("keeps secret redaction strict", () => {
    expect(() =>
      assertNoSecretLeaks(JSON.stringify({ token: "sk-1234567890abcdef", nested: { url: "http://127.0.0.1:9222" } })),
    ).toThrow();
  });
});
