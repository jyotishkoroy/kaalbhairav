/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

export function getSafeRelativeRedirect(input: unknown, fallback = "/astro"): string {
  if (typeof input !== "string") return fallback;

  const trimmed = input.trim();

  if (!trimmed) return fallback;
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return fallback;

  try {
    const decoded = decodeURIComponent(trimmed);
    if (!decoded.startsWith("/")) return fallback;
    if (decoded.startsWith("//")) return fallback;
    if (decoded.includes("\\")) return fallback;
    if (/[\u0000-\u001F\u007F]/.test(decoded)) return fallback;
  } catch {
    return fallback;
  }

  return trimmed;
}
