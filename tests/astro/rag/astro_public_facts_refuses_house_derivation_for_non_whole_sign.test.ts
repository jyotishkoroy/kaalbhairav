/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildPublicChartFacts } from "@/lib/astro/public-chart-facts";

function makeChart(settings: Record<string, unknown>) {
  return {
    metadata: {
      calculation_settings: settings,
      settings,
      schema_version: "test",
    },
    lagna: { sign: "Leo", sign_name: "Leo", sign_index: 4, house: 1 },
    planets: {
      Moon: { name: "Moon", sign: "Gemini", sign_name: "Gemini", sign_index: 2, house: 11, nakshatra: "Mrigashira", nakshatra_pada: 4 },
      Sun: { name: "Sun", sign: "Taurus", sign_name: "Taurus", sign_index: 1, house: 10 },
    },
    public_facts: {
      lagna: { sign: "Leo" },
      moon: { sign: "Gemini", house: 11, nakshatra: "Mrigashira", nakshatra_pada: 4 },
      sun: { sign: "Taurus", house: 10 },
    },
  };
}

describe("astro_public_facts_refuses_house_derivation_for_non_whole_sign", () => {
  it("allows whole sign and exposes moon house", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", ayanamsa: "lahiri", house_system: "whole_sign" }) });
    expect(facts.moonHouse).toBe(11);
    expect(facts.unavailableFacts?.moonHouse).toBeUndefined();
  });

  it("refuses placidus and marks moon house unavailable", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", ayanamsa: "lahiri", house_system: "placidus" }) });
    expect(facts.moonHouse).toBeUndefined();
    expect(facts.unavailableFacts?.moonHouse?.reason).toBe("incompatible_house_system");
    expect(facts.factWarnings).toContain("house_unavailable_incompatible_house_system");
  });

  it("refuses missing house system", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", ayanamsa: "lahiri" }) });
    expect(facts.moonHouse).toBeUndefined();
    expect(facts.unavailableFacts?.moonHouse?.reason).toBe("missing_house_system");
    expect(facts.factWarnings).toContain("house_unavailable_missing_house_system");
  });

  it("accepts weird casing for whole sign", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", ayanamsa: "lahiri", house_system: "Whole Sign" }) });
    expect(facts.moonHouse).toBe(11);
  });

  it("fails closed for malformed settings object", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: { metadata: { settings: 123 }, lagna: { sign: "Leo" }, planets: { Moon: { sign: "Gemini" } } } });
    expect(facts.moonHouse).toBeUndefined();
    expect(facts.unavailableFacts?.moonHouse?.reason).toBe("missing_house_system");
  });
});
