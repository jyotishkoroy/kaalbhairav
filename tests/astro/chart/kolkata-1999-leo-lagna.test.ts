/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect } from "vitest";
import { buildPublicChartFacts, computeWholeSignHouse } from "@/lib/astro/public-chart-facts";

// ── Whole-sign house derivation ────────────────────────────────────────────

describe("computeWholeSignHouse (Leo Lagna)", () => {
  it("Taurus → 10th from Leo", () => {
    expect(computeWholeSignHouse("Leo", "Taurus")).toBe(10);
  });
  it("Gemini → 11th from Leo", () => {
    expect(computeWholeSignHouse("Leo", "Gemini")).toBe(11);
  });
  it("Aries → 9th from Leo", () => {
    expect(computeWholeSignHouse("Leo", "Aries")).toBe(9);
  });
  it("Cancer → 12th from Leo", () => {
    expect(computeWholeSignHouse("Leo", "Cancer")).toBe(12);
  });
  it("Libra → 3rd from Leo", () => {
    expect(computeWholeSignHouse("Leo", "Libra")).toBe(3);
  });
  it("Capricorn → 6th from Leo", () => {
    expect(computeWholeSignHouse("Leo", "Capricorn")).toBe(6);
  });
  it("Leo → 1st from Leo (lagna itself)", () => {
    expect(computeWholeSignHouse("Leo", "Leo")).toBe(1);
  });
});

// ── buildPublicChartFacts with complete mock data ─────────────────────────

const mockChartJson = {
  public_facts: {
    lagna_sign: "Leo",
    moon_sign: "Gemini",
    sun_sign: "Taurus",
    moon_house: 11,
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

describe("buildPublicChartFacts – Leo/Gemini/Taurus chart", () => {
  const facts = buildPublicChartFacts({
    profileId: "test-profile",
    chartVersionId: "v1",
    chartJson: mockChartJson,
  });

  it("extracts lagnaSign = Leo", () => {
    expect(facts.lagnaSign).toBe("Leo");
  });
  it("extracts moonSign = Gemini", () => {
    expect(facts.moonSign).toBe("Gemini");
  });
  it("extracts sunSign = Taurus", () => {
    expect(facts.sunSign).toBe("Taurus");
  });
  it("extracts moonHouse = 11", () => {
    expect(facts.moonHouse).toBe(11);
  });
  it("extracts sunHouse = 10", () => {
    expect(facts.sunHouse).toBe(10);
  });
  it("extracts nakshatra matching Mrigasira/Mrigashira", () => {
    expect(facts.nakshatra).toMatch(/Mrigasira|Mrigashira/i);
  });
  it("extracts nakshatraPada = 4", () => {
    expect(facts.nakshatraPada).toBe(4);
  });
  it("extracts mahadasha = Jupiter", () => {
    expect(facts.mahadasha).toBe("Jupiter");
  });
});

// ── buildPublicChartFacts with wrong (stale Virgo) data ──────────────────

const wrongChartJson = {
  public_facts: {
    lagna_sign: "Virgo",
    moon_sign: "Gemini",
    moon_house: 10,  // wrong house with Virgo lagna
    sun_sign: "Taurus",
    sun_house: 9,    // wrong house with Virgo lagna
  },
};

describe("buildPublicChartFacts – wrong Virgo chart (stale)", () => {
  const wrongFacts = buildPublicChartFacts({
    profileId: "test",
    chartVersionId: "v1",
    chartJson: wrongChartJson,
  });

  it("returns Virgo as lagnaSign (whatever data says)", () => {
    expect(wrongFacts.lagnaSign).toBe("Virgo");
  });
  it("returns moon_house=10 (wrong house per wrong data)", () => {
    expect(wrongFacts.moonHouse).toBe(10);
  });
  it("returns sun_house=9 (wrong house per wrong data)", () => {
    expect(wrongFacts.sunHouse).toBe(9);
  });
  // The key is the route/finalizer should catch this mismatch
  it("has no nakshatra (not in wrong chart)", () => {
    expect(wrongFacts.nakshatra).toBeUndefined();
  });
});

// ── buildPublicChartFacts derives house when house is missing ──────────────

const chartWithoutHouse = {
  public_facts: {
    lagna_sign: "Leo",
    moon_sign: "Gemini",
    sun_sign: "Taurus",
    // no moon_house or sun_house
  },
};

describe("buildPublicChartFacts – derives houses via whole-sign when absent", () => {
  const facts = buildPublicChartFacts({
    profileId: "test",
    chartVersionId: "v1",
    chartJson: chartWithoutHouse,
  });

  it("derives moonHouse = 11 from Leo+Gemini", () => {
    expect(facts.moonHouse).toBe(11);
  });
  it("derives sunHouse = 10 from Leo+Taurus", () => {
    expect(facts.sunHouse).toBe(10);
  });
});
