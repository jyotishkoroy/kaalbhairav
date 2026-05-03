/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildAstroChartContext } from "@/lib/astro/chart-context";

const baseInput = {
  profileId: "profile-1",
  chartVersionId: "chart-1",
};

describe("buildAstroChartContext", () => {
  it("extracts Lagna from ascendant.sign", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: { ascendant: { sign: "Leo" } },
    });
    expect(context.ready).toBe(true);
    if (context.ready) expect(context.publicFacts.lagnaSign).toBe("Leo");
  });

  it("extracts Lagna from lagna.sign", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: { lagna: { sign: "Virgo" } },
    });
    expect(context.ready).toBe(true);
    if (context.ready) expect(context.publicFacts.lagnaSign).toBe("Virgo");
  });

  it("extracts Lagna from public_facts.lagna_sign", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: { public_facts: { lagna_sign: "Gemini" } },
    });
    expect(context.ready).toBe(true);
    if (context.ready) expect(context.publicFacts.lagnaSign).toBe("Gemini");
  });

  it("prefers public_facts.lagna_sign over generic ascendant fields", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: {
        public_facts: { lagna_sign: "Leo" },
        ascendant: { sign: "Virgo" },
      },
    });
    expect(context.ready).toBe(true);
    if (context.ready) {
      expect(context.publicFacts.lagnaSign).toBe("Leo");
      expect(context.basisLine).toContain("Leo Lagna");
    }
  });

  it("prefers d1.lagna.sign over generic ascendant fields", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: {
        d1: { lagna: { sign: "Leo" } },
        ascendant: { sign: "Virgo" },
      },
    });
    expect(context.ready).toBe(true);
    if (context.ready) expect(context.publicFacts.lagnaSign).toBe("Leo");
  });

  it("does not read navamsa ascendant as Lagna", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: {
        navamsa: { ascendant: { sign: "Virgo" } },
        ascendant: { sign: "Leo" },
      },
    });
    expect(context.ready).toBe(true);
    if (context.ready) expect(context.publicFacts.lagnaSign).toBe("Leo");
  });

  it("extracts Moon sign and house when present", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: { planets: { Moon: { sign: "Taurus", house: 10 } } },
    });
    expect(context.ready).toBe(true);
    if (context.ready) {
      expect(context.publicFacts.moonSign).toBe("Taurus");
      expect(context.publicFacts.moonHouse).toBe(10);
    }
  });

  it("handles missing Moon without inventing", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: { ascendant: { sign: "Leo" } },
    });
    expect(context.ready).toBe(true);
    if (context.ready) {
      expect(context.publicFacts.moonSign).toBeUndefined();
      expect(context.basisLine).toContain("Chart basis:");
    }
  });

  it("returns not-ready for empty chart JSON", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: {},
    });
    expect(context.ready).toBe(false);
  });

  it("does not expose private birth data or user fields", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: {
        ascendant: { sign: "Leo" },
        user_id: "user-1",
        email: "secret@example.com",
        normalized_input: { birth_date_iso: "1999-06-14" },
      },
    });
    expect(context.ready).toBe(true);
    if (context.ready) {
      expect(JSON.stringify(context.publicFacts)).not.toContain("secret@example.com");
      expect(JSON.stringify(context.publicFacts)).not.toContain("1999-06-14");
      expect(JSON.stringify(context.publicFacts)).not.toContain("user-1");
    }
  });

  it("builds compactPromptContext and basisLine from deterministic facts only", () => {
    const context = buildAstroChartContext({
      ...baseInput,
      chartJson: {
        ascendant: { sign: "Leo" },
        planets: { Moon: { sign: "Taurus", house: 10 } },
        normalized_input: { birth_date_iso: "1999-06-14" },
      },
      predictionSummary: {
        summary: "High-level summary",
        current_timing_summary: "Jupiter Mahadasha",
      },
    });
    expect(context.ready).toBe(true);
    if (context.ready) {
      expect(context.basisLine).toContain("Chart basis:");
      expect(context.compactPromptContext).toContain("chart_fact: Lagna (Ascendant): Leo");
      expect(context.compactPromptContext).not.toContain("profile_id=");
      expect(context.compactPromptContext).not.toContain("chart_version_id=");
      expect(context.compactPromptContext).not.toContain("\nfact:");
      expect(context.compactPromptContext).not.toContain("1999-06-14");
    }
  });
});
