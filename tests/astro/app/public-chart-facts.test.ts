/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect } from "vitest";
import {
  buildPublicChartFacts,
  validatePublicChartFacts,
  formatPublicChartBasis,
  computeWholeSignHouse,
  sanitizeVisibleAstroAnswer,
  extractDeterministicDashaFacts,
} from "@/lib/astro/public-chart-facts";

const leoChartJson = {
  public_facts: {
    lagna_sign: "Leo",
    moon_sign: "Gemini",
    moon_house: 11,
    sun_sign: "Taurus",
    sun_house: 10,
    moon_nakshatra: "Mrigasira",
    moon_pada: 4,
    mahadasha: "Jupiter",
    mahadasha_start: "22 Aug 2018",
    mahadasha_end: "22 Aug 2034",
    antardasha_now: "Jupiter-Ketu",
    mangal_dosha: false,
    kalsarpa_yoga: false,
  },
};

// ── 1. Build complete Leo/Gemini/Taurus facts from chartJson.public_facts ──

describe("buildPublicChartFacts from chartJson.public_facts", () => {
  const facts = buildPublicChartFacts({
    profileId: "p1",
    chartVersionId: "cv1",
    chartJson: leoChartJson,
  });

  it("lagnaSign = Leo", () => expect(facts.lagnaSign).toBe("Leo"));
  it("moonSign = Gemini", () => expect(facts.moonSign).toBe("Gemini"));
  it("sunSign = Taurus", () => expect(facts.sunSign).toBe("Taurus"));
  it("moonHouse = 11", () => expect(facts.moonHouse).toBe(11));
  it("sunHouse = 10", () => expect(facts.sunHouse).toBe(10));
  it("nakshatra matches Mrigasira", () => expect(facts.nakshatra).toMatch(/Mrigasira|Mrigashira/i));
  it("nakshatraPada = 4", () => expect(facts.nakshatraPada).toBe(4));
  it("mahadasha = Jupiter", () => expect(facts.mahadasha).toBe("Jupiter"));
  it("mangalDosha = false", () => expect(facts.mangalDosha).toBe(false));
  it("kalsarpaYoga = false", () => expect(facts.kalsarpaYoga).toBe(false));
});

// ── 2. Build facts from predictionSummary.public_facts ──────────────────

describe("buildPublicChartFacts from predictionSummary.public_facts", () => {
  const facts = buildPublicChartFacts({
    profileId: "p2",
    chartVersionId: "cv2",
    chartJson: {},
    predictionSummary: {
      public_facts: {
        lagna_sign: "Leo",
        moon_sign: "Gemini",
        moon_house: 11,
        sun_sign: "Taurus",
        sun_house: 10,
        mahadasha: "Jupiter",
      },
    },
  });

  it("extracts lagnaSign from predictionSummary", () => expect(facts.lagnaSign).toBe("Leo"));
  it("extracts moonSign from predictionSummary", () => expect(facts.moonSign).toBe("Gemini"));
  it("extracts mahadasha from predictionSummary", () => expect(facts.mahadasha).toBe("Jupiter"));
});

describe("buildPublicChartFacts from dasha-shaped sources", () => {
  it("extracts mahadasha from nested dasha/current shapes", () => {
    const facts = buildPublicChartFacts({
      profileId: "p4",
      chartVersionId: "cv4",
      chartJson: {
        lagna: { sign: "Leo" },
        planets: { Moon: { sign: "Gemini", house: 11 }, Sun: { sign: "Taurus", house: 10 } },
        dasha: { current: { mahadasha: "Jupiter", antardasha: "Ketu" } },
        nakshatra: "Mrigashira",
        nakshatraPada: 4,
      },
    });
    expect(facts.mahadasha).toBe("Jupiter");
    expect(facts.antardashaNow).toBe("Ketu");
  });

  it("extracts mahadasha from prediction_ready_summaries current_timing_summary", () => {
    const dasha = extractDeterministicDashaFacts({
      predictionSummary: { current_timing_summary: "Mahadasha: Jupiter. Antardasha: Ketu" },
    });
    expect(dasha.mahadasha).toBe("Jupiter");
    expect(dasha.source).toBe("predictionSummary");
  });
});

// ── 3. Merges chartJson and predictionSummary without losing facts ────────

describe("buildPublicChartFacts merges sources", () => {
  const facts = buildPublicChartFacts({
    profileId: "p3",
    chartVersionId: "cv3",
    chartJson: {
      public_facts: {
        lagna_sign: "Leo",
        moon_sign: "Gemini",
        moon_house: 11,
        sun_sign: "Taurus",
        sun_house: 10,
        moon_nakshatra: "Mrigasira",
        moon_pada: 4,
      },
    },
    predictionSummary: {
      public_facts: {
        lagna_sign: "Leo",
        mahadasha: "Jupiter",
        mahadasha_start: "22 Aug 2018",
        mahadasha_end: "22 Aug 2034",
      },
    },
  });

  it("keeps lagna from chartJson", () => expect(facts.lagnaSign).toBe("Leo"));
  it("keeps nakshatra from chartJson", () => expect(facts.nakshatra).toMatch(/Mrigasira|Mrigashira/i));
  it("keeps mahadasha from predictionSummary", () => expect(facts.mahadasha).toBe("Jupiter"));
  it("keeps moonHouse = 11", () => expect(facts.moonHouse).toBe(11));
});

// ── 4-5. computeWholeSignHouse ────────────────────────────────────────────

describe("computeWholeSignHouse", () => {
  it("Taurus → 10th from Leo", () => expect(computeWholeSignHouse("Leo", "Taurus")).toBe(10));
  it("Gemini → 11th from Leo", () => expect(computeWholeSignHouse("Leo", "Gemini")).toBe(11));
  it("Aries → 9th from Leo", () => expect(computeWholeSignHouse("Leo", "Aries")).toBe(9));
  it("Cancer → 12th from Leo", () => expect(computeWholeSignHouse("Leo", "Cancer")).toBe(12));
  it("returns undefined for unknown sign", () => expect(computeWholeSignHouse("Leo", "Unknown")).toBeUndefined());
});

// ── 6. validatePublicChartFacts: missing Lagna → invalid ─────────────────

describe("validatePublicChartFacts", () => {
  it("missing lagnaSign → ok=false", () => {
    const facts = buildPublicChartFacts({ profileId: "t", chartVersionId: "v", chartJson: {} });
    const result = validatePublicChartFacts(facts);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("lagnaSign");
  });

  it("complete Leo chart → ok=true", () => {
    const facts = buildPublicChartFacts({ profileId: "t", chartVersionId: "v", chartJson: leoChartJson });
    const result = validatePublicChartFacts(facts);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.contradictions).toEqual([]);
  });

  it("missing Moon → missing contains moonSign", () => {
    const facts = buildPublicChartFacts({
      profileId: "t",
      chartVersionId: "v",
      chartJson: { public_facts: { lagna_sign: "Leo" } },
    });
    const result = validatePublicChartFacts(facts);
    expect(result.missing).toContain("moonSign");
  });

  it("Leo/Gemini/Taurus fixture passes validation", () => {
    const facts = buildPublicChartFacts({ profileId: "t", chartVersionId: "v", chartJson: leoChartJson });
    const result = validatePublicChartFacts(facts);
    expect(result.ok).toBe(true);
  });
});

// ── 8. formatPublicChartBasis: outputs correct format without internals ───

describe("formatPublicChartBasis", () => {
  it("contains Leo Lagna", () => {
    const facts = buildPublicChartFacts({ profileId: "t", chartVersionId: "v", chartJson: leoChartJson });
    const basis = formatPublicChartBasis(facts);
    expect(basis).toContain("Leo Lagna");
  });
  it("contains Gemini Moon in the 11th", () => {
    const facts = buildPublicChartFacts({ profileId: "t", chartVersionId: "v", chartJson: leoChartJson });
    const basis = formatPublicChartBasis(facts);
    expect(basis).toContain("Gemini Moon");
    expect(basis).toContain("11th");
  });
  it("contains Taurus Sun in the 10th", () => {
    const facts = buildPublicChartFacts({ profileId: "t", chartVersionId: "v", chartJson: leoChartJson });
    const basis = formatPublicChartBasis(facts);
    expect(basis).toContain("Taurus Sun");
    expect(basis).toContain("10th");
  });
  it("does not contain profileId or chartVersionId", () => {
    const facts = buildPublicChartFacts({ profileId: "secret-id", chartVersionId: "secret-cv", chartJson: leoChartJson });
    const basis = formatPublicChartBasis(facts);
    expect(basis).not.toContain("secret-id");
    expect(basis).not.toContain("secret-cv");
  });
});

// ── 9. sanitizeVisibleAstroAnswer removes forbidden fields ────────────────

describe("sanitizeVisibleAstroAnswer", () => {
  it("removes profile_id", () => {
    const result = sanitizeVisibleAstroAnswer("aadesh: Your chart. profile_id=abc123 is here.");
    expect(result).not.toMatch(/profile_id\s*[:=]/i);
  });
  it("removes chart_version_id", () => {
    const result = sanitizeVisibleAstroAnswer("aadesh: chart_version_id=xyz hello.");
    expect(result).not.toMatch(/chart_version_id\s*[:=]/i);
  });
  it("removes fact: prefix", () => {
    const result = sanitizeVisibleAstroAnswer("aadesh: fact: Leo Lagna is grounded.");
    expect(result).not.toMatch(/\bfact:\s/i);
  });
  it("removes Retrieval cue:", () => {
    const result = sanitizeVisibleAstroAnswer("aadesh: Leo Lagna.\nRetrieval cue: secret data here.");
    expect(result).not.toContain("Retrieval cue:");
  });
  it("removes provider:", () => {
    const result = sanitizeVisibleAstroAnswer("aadesh: provider=groq answer here.");
    expect(result).not.toMatch(/\bprovider\s*[:=]/i);
  });
  it("removes model:", () => {
    const result = sanitizeVisibleAstroAnswer("aadesh: model=llama3 answer here.");
    expect(result).not.toMatch(/\bmodel\s*[:=]/i);
  });
  it("removes UUIDs", () => {
    const result = sanitizeVisibleAstroAnswer("aadesh: abc 550e8400-e29b-41d4-a716-446655440000 is here.");
    expect(result).not.toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  });

  // ── 10. sanitizeVisibleAstroAnswer ensures aadesh: prefix ───────────────
  it("adds aadesh: prefix when missing", () => {
    const result = sanitizeVisibleAstroAnswer("Your Lagna is Leo.");
    expect(result.toLowerCase()).toMatch(/^aadesh:/);
  });
  it("preserves existing aadesh: prefix", () => {
    const result = sanitizeVisibleAstroAnswer("aadesh: Your Lagna is Leo.");
    expect(result.toLowerCase()).toMatch(/^aadesh:/);
    expect(result).toContain("Leo");
  });
});
