import { describe, expect, it } from "vitest";
import { extractChartFactsFromVersion } from "../../../lib/astro/rag/chart-fact-extractor";

function keys(facts: Array<{ factType: string; factKey: string }>): string[] {
  return facts.map((fact) => `${fact.factType}:${fact.factKey}`);
}

describe("extractChartFactsFromVersion", () => {
  it("extracts facts from a complete object chart", () => {
    const chart = {
      birth: { date: "1990-05-15", time: "14:30", place: "Kolkata", timezone: "Asia/Kolkata" },
      lagna: { sign: "Leo", degree: "12.5", nakshatra: "Magha", pada: 4 },
      planets: {
        Sun: { sign: "Taurus", degree: "28-51-52", house: 10, nakshatra: "Mrigasira", pada: 2 },
        Moon: { sign: "Gemini", degree: 13.2, house: 11, nakshatra: "Ardra", pada: 1 },
        Mercury: { sign: "Gemini", house: 11 },
        Rahu: { sign: "Cancer", house: 12 },
      },
      houses: {
        "1": { sign: "Leo" },
        "10": { sign: "Taurus" },
        "11": { sign: "Gemini" },
        "12": { sign: "Cancer" },
      },
      currentDasha: { mahadasha: "Jupiter", antardasha: "Venus", startsOn: "2024-01-01", endsOn: "2026-06-01" },
      sav: { Aries: 28, Taurus: 32, Gemini: 35 },
      conjunctions: [{ planets: ["Moon", "Mercury"], house: 11, sign: "Gemini" }],
    };
    const facts = extractChartFactsFromVersion(chart);
    expect(facts.find((fact) => fact.factType === "lagna" && fact.factKey === "lagna")?.sign).toBe("Leo");
    expect(facts.find((fact) => fact.factType === "planet_placement" && fact.factKey === "sun")?.house).toBe(10);
    expect(facts.find((fact) => fact.factType === "rasi" && fact.factKey === "moon_sign")?.sign).toBe("Gemini");
    expect(facts.find((fact) => fact.factType === "house" && fact.factKey === "house_10")?.sign).toBe("Taurus");
    expect(facts.find((fact) => fact.factType === "house_lord" && fact.factKey === "lord_10")?.planet).toBe("Venus");
    expect(facts.find((fact) => fact.factType === "dasha" && fact.factKey === "current_mahadasha")?.planet).toBe("Jupiter");
    expect(facts.find((fact) => fact.factType === "sav" && fact.factKey === "sav_aries")).toBeTruthy();
    expect(keys(facts).some((key) => key === "co_presence:co_presence_moon_mercury_house_11_gemini")).toBe(true);
    expect(new Set(keys(facts)).size).toBe(facts.length);
  });

  it("extracts facts from an array-based chart", () => {
    const chart = {
      input: { birthDate: "1988-01-02", birthTime: "06:15", birthPlace: "Delhi" },
      ascendant: "Virgo",
      planetaryPositions: [
        { name: "Sun", sign: "Capricorn", house: 5, degree: 18.4 },
        { name: "Moon", sign: "Pisces", house: 7, nakshatra: "Revati", pada: 3 },
        { planet: "Venus", sign: "Aquarius", house: 6, retrograde: true },
      ],
      houses: [
        { number: 1, sign: "Virgo" },
        { number: 7, sign: "Pisces" },
        { number: 10, sign: "Gemini" },
      ],
      vimshottariDasha: { current: { maha: "Saturn", antar: "Mercury" } },
    };
    const facts = extractChartFactsFromVersion(chart);
    expect(facts.some((fact) => fact.factKey === "birth_date")).toBe(true);
    expect(facts.some((fact) => fact.factKey === "birth_time")).toBe(true);
    expect(facts.find((fact) => fact.factType === "lagna" && fact.factKey === "lagna")?.sign).toBe("Virgo");
    expect(facts.find((fact) => fact.factType === "planet_placement" && fact.factKey === "sun")?.sign).toBe("Capricorn");
    expect(facts.find((fact) => fact.factType === "planet_placement" && fact.factKey === "moon")?.house).toBe(7);
    expect(facts.find((fact) => fact.factType === "planet_placement" && fact.factKey === "venus")?.metadata.retrograde).toBe(true);
    expect(facts.find((fact) => fact.factType === "house_lord" && fact.factKey === "lord_10")?.planet).toBe("Mercury");
    expect(facts.find((fact) => fact.factType === "dasha" && fact.factKey === "current_mahadasha")?.planet).toBe("Saturn");
    expect(facts.find((fact) => fact.factType === "dasha" && fact.factKey === "current_antardasha")?.planet).toBe("Mercury");
  });

  it("returns empty facts for malformed input", () => {
    expect(extractChartFactsFromVersion(null)).toEqual([]);
    expect(extractChartFactsFromVersion(undefined)).toEqual([]);
    expect(extractChartFactsFromVersion("not json object")).toEqual([]);
    expect(extractChartFactsFromVersion({ planets: "bad", houses: null })).toEqual([]);
  });

  it("recognizes nested and alternative casing", () => {
    const chart = {
      chart: {
        asc: { rashi: "Cancer", degrees: "4.2" },
        grahas: {
          sun: { rashi: "Libra", bhava: 4 },
          moon: { rashi: "Scorpio", bhava: 5, nakshatra: "Anuradha", pada: "2" },
        },
        bhavas: {
          "1": { rashi: "Cancer" },
          "4": { rashi: "Libra" },
          "5": { rashi: "Scorpio" },
          "10": { rashi: "Aries" },
        },
      },
      ashtakavarga: { sav: { Aries: "30", Scorpio: "22" } },
    };
    const facts = extractChartFactsFromVersion(chart);
    expect(facts.find((fact) => fact.factType === "lagna" && fact.factKey === "lagna")?.sign).toBe("Cancer");
    expect(facts.find((fact) => fact.factType === "planet_placement" && fact.factKey === "sun")?.sign).toBe("Libra");
    expect(facts.find((fact) => fact.factType === "planet_placement" && fact.factKey === "moon")?.house).toBe(5);
    expect(facts.find((fact) => fact.factType === "house" && fact.factKey === "house_10")?.sign).toBe("Aries");
    expect(facts.find((fact) => fact.factType === "house_lord" && fact.factKey === "lord_10")?.planet).toBe("Mars");
    expect(facts.find((fact) => fact.factType === "sav" && fact.factKey === "sav_scorpio")?.factValue).toBe("22");
  });

  it("extracts timing and explicit relations", () => {
    const chart = {
      moonSign: "Sagittarius",
      moonNakshatra: "Mula",
      moonNakshatraPada: 1,
      dashas: [
        { planet: "Jupiter", type: "mahadasha", startsOn: "2020-01-01", endsOn: "2036-01-01" },
        { planet: "Saturn", type: "antardasha", startsOn: "2025-01-01", endsOn: "2027-01-01" },
      ],
      varshaphal: {
        year: 2026,
        lord: "Venus",
        periods: [{ label: "Muntha focus", startsOn: "2026-05-01", endsOn: "2026-07-01" }],
      },
      aspects: [{ from: "Saturn", to: "Moon", type: "drishti", description: "Saturn aspects Moon" }],
    };
    const facts = extractChartFactsFromVersion(chart);
    expect(facts.find((fact) => fact.factType === "rasi" && fact.factKey === "moon_sign")?.sign).toBe("Sagittarius");
    expect(facts.find((fact) => fact.factType === "nakshatra" && fact.factKey === "moon_nakshatra")?.factValue).toBe("Mula");
    expect(facts.some((fact) => fact.factType === "dasha" && fact.factKey.includes("jupiter"))).toBe(true);
    expect(facts.some((fact) => fact.factType === "dasha" && fact.factKey.includes("saturn"))).toBe(true);
    expect(facts.find((fact) => fact.factType === "varshaphal" && fact.factKey === "current_varshaphal")).toBeTruthy();
    expect(facts.some((fact) => fact.factType === "aspect" && fact.factKey.includes("saturn") && fact.factKey.includes("moon"))).toBe(true);
    expect(facts.some((fact) => fact.tags.includes("timing"))).toBe(true);
  });
});
