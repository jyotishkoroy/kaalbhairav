import fs from "node:fs";
import type { BrowserContext, Page } from "@playwright/test";

export const DEFAULT_CDP_URL = "http://127.0.0.1:9222";
export const DEFAULT_STORAGE_STATE_PATH = "artifacts/auth/production-storage-state.json";
export const DEFAULT_LIVE_URL = "https://www.tarayai.com/astro";

export function useCdpMode(): boolean {
  return process.env.VEDICQA_USE_CDP === "true";
}

export function resolveCdpUrl(): string {
  return process.env.VEDICQA_CDP_URL ?? DEFAULT_CDP_URL;
}

export function resolveLiveUrl(): string {
  return process.env.VEDICQA_LIVE_URL ?? DEFAULT_LIVE_URL;
}

export function resolveStorageStatePath(): string {
  return process.env.VEDICQA_E2E_STORAGE_STATE ?? DEFAULT_STORAGE_STATE_PATH;
}

export function hasStorageState(storageStatePath = resolveStorageStatePath()): boolean {
  return fs.existsSync(storageStatePath);
}

export function shouldRequireStorageState(): boolean {
  return !useCdpMode();
}

export function findAstroPage(context: BrowserContext): Page | undefined {
  return context.pages().find((page) => {
    try {
      const url = new URL(page.url());
      return url.hostname.includes("tarayai.com") && url.pathname === "/astro";
    } catch {
      return false;
    }
  });
}

export function isAstroUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("tarayai.com") && parsed.pathname === "/astro";
  } catch {
    return false;
  }
}

export function resolveCdpFinalStatus(url: string): { status: "blocked"; reason: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.pathname === "/sign-in") {
      return { status: "blocked", reason: "auth_not_available_in_cdp_profile" };
    }
    if (parsed.pathname !== "/astro") {
      return { status: "blocked", reason: `not_reached:${parsed.pathname}` };
    }
    return null;
  } catch {
    return { status: "blocked", reason: "invalid_url" };
  }
}
