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
    lagna: { sign: "Leo" },
    planets: {
      Moon: { sign: "Gemini", house: 11, nakshatra: "Mrigashira", nakshatra_pada: 4 },
    },
    public_facts: {
      lagna: { sign: "Leo" },
      moon: { sign: "Gemini", house: 11, nakshatra: "Mrigashira", nakshatra_pada: 4 },
    },
  };
}

describe("astro_public_facts_requires_ayanamsa_metadata", () => {
  it("allows Lahiri sidereal nakshatra facts", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", ayanamsa: "lahiri", house_system: "whole_sign" }) });
    expect(facts.nakshatra).toBe("Mrigashira");
    expect(facts.nakshatraPada).toBe(4);
  });

  it("refuses missing ayanamsa", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "sidereal", house_system: "whole_sign" }) });
    expect(facts.nakshatra).toBeUndefined();
    expect(facts.unavailableFacts?.moonNakshatra?.reason).toBe("missing_ayanamsa");
    expect(facts.factWarnings).toContain("nakshatra_unavailable_missing_ayanamsa");
  });

  it("refuses tropical zodiac", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ zodiac_type: "tropical", ayanamsa: "lahiri", house_system: "whole_sign" }) });
    expect(facts.nakshatra).toBeUndefined();
    expect(facts.unavailableFacts?.moonNakshatra?.reason).toBe("incompatible_zodiac");
  });

  it("refuses missing zodiac", () => {
    const facts = buildPublicChartFacts({ profileId: "p", chartVersionId: "cv", chartJson: makeChart({ ayanamsa: "lahiri", house_system: "whole_sign" }) });
    expect(facts.nakshatra).toBeUndefined();
    expect(facts.unavailableFacts?.moonNakshatra?.reason).toBe("missing_zodiac");
  });

  it("reads settings from alternate paths", () => {
    const facts = buildPublicChartFacts({
      profileId: "p",
      chartVersionId: "cv",
      chartJson: {
        metadata: { settings_snapshot: { zodiac_type: "sidereal", ayanamsa: "lahiri", house_system: "whole_sign" }, schema_version: "test" },
        settings_snapshot: { zodiac_type: "sidereal", ayanamsa: "lahiri", house_system: "whole_sign" },
        lagna: { sign: "Leo" },
        planets: { Moon: { sign: "Gemini", house: 11, nakshatra: "Mrigashira", nakshatra_pada: 4 } },
        public_facts: { lagna: { sign: "Leo" }, moon: { sign: "Gemini", house: 11, nakshatra: "Mrigashira", nakshatra_pada: 4 } },
      },
    });
    expect(facts.nakshatra).toBe("Mrigashira");
    expect(facts.moonHouse).toBe(11);
  });
});
