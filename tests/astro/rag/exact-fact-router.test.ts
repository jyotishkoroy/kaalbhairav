import { describe, expect, it } from "vitest";
import { answerExactFactIfPossible, detectExactFactIntent } from "../../../lib/astro/rag/exact-fact-router";

const baseFacts = [
  { factType: "lagna", factKey: "lagna", factValue: "Leo", sign: "Leo", source: "chart_json", confidence: "deterministic", tags: ["lagna"], metadata: {} },
  { factType: "rasi", factKey: "moon_sign", factValue: "Gemini", sign: "Gemini", source: "chart_json", confidence: "deterministic", tags: ["moon"], metadata: {} },
  { factType: "nakshatra", factKey: "moon_nakshatra", factValue: "Mrigasira", source: "chart_json", confidence: "deterministic", tags: ["moon", "nakshatra"], metadata: {} },
  { factType: "nakshatra", factKey: "moon_nakshatra_pada", factValue: "2", source: "chart_json", confidence: "deterministic", tags: ["moon", "nakshatra"], metadata: {} },
  { factType: "planet_placement", factKey: "sun", factValue: "Sun in Taurus 28-51-52, Mrigasira pada 2, house 10", planet: "Sun", house: 10, sign: "Taurus", degreeNumeric: 28.86, source: "chart_json", confidence: "deterministic", tags: ["sun", "house_10"], metadata: {} },
  { factType: "planet_placement", factKey: "moon", factValue: "Moon in Gemini house 11", planet: "Moon", house: 11, sign: "Gemini", source: "chart_json", confidence: "deterministic", tags: ["moon", "house_11"], metadata: {} },
  { factType: "planet_placement", factKey: "mercury", factValue: "Mercury in Gemini house 11", planet: "Mercury", house: 11, sign: "Gemini", source: "chart_json", confidence: "deterministic", tags: ["mercury", "house_11"], metadata: {} },
  { factType: "planet_placement", factKey: "venus", factValue: "Venus in Cancer house 12", planet: "Venus", house: 12, sign: "Cancer", source: "chart_json", confidence: "deterministic", tags: ["venus", "house_12"], metadata: {} },
  { factType: "planet_placement", factKey: "jupiter", factValue: "Jupiter in Sagittarius house 5", planet: "Jupiter", house: 5, sign: "Sagittarius", source: "chart_json", confidence: "deterministic", tags: ["jupiter", "house_5"], metadata: {} },
  { factType: "house", factKey: "house_1", factValue: "Leo", sign: "Leo", house: 1, source: "chart_json", confidence: "deterministic", tags: ["house_1"], metadata: {} },
  { factType: "house", factKey: "house_7", factValue: "Aquarius", sign: "Aquarius", house: 7, source: "chart_json", confidence: "deterministic", tags: ["house_7"], metadata: {} },
  { factType: "house", factKey: "house_10", factValue: "Taurus", sign: "Taurus", house: 10, source: "chart_json", confidence: "deterministic", tags: ["house_10"], metadata: {} },
  { factType: "house", factKey: "house_11", factValue: "Gemini", sign: "Gemini", house: 11, source: "chart_json", confidence: "deterministic", tags: ["house_11"], metadata: {} },
  { factType: "house", factKey: "house_12", factValue: "Cancer", sign: "Cancer", house: 12, source: "chart_json", confidence: "deterministic", tags: ["house_12"], metadata: {} },
  { factType: "house_lord", factKey: "lord_10", factValue: "Venus", planet: "Venus", sign: "Taurus", house: 10, source: "chart_json", confidence: "deterministic", tags: ["lord_10"], metadata: {} },
  { factType: "dasha", factKey: "current_mahadasha", factValue: "Jupiter Mahadasha 2020-2036", planet: "Jupiter", source: "chart_json", confidence: "deterministic", tags: ["dasha"], metadata: {} },
  { factType: "dasha", factKey: "current_antardasha", factValue: "Venus Antardasha 2025-2027", planet: "Venus", source: "chart_json", confidence: "deterministic", tags: ["dasha"], metadata: {} },
  { factType: "sav", factKey: "sav_aries", factValue: "28", sign: "Aries", degreeNumeric: 28, source: "chart_json", confidence: "deterministic", tags: ["sav"], metadata: {} },
  { factType: "sav", factKey: "sav_taurus", factValue: "32", sign: "Taurus", degreeNumeric: 32, source: "chart_json", confidence: "deterministic", tags: ["sav"], metadata: {} },
  { factType: "co_presence", factKey: "co_presence_moon_mercury_house_11", factValue: "Moon and Mercury together in house 11", source: "chart_json", confidence: "deterministic", tags: ["co_presence"], metadata: {} },
  { factType: "aspect", factKey: "aspect_saturn_moon", factValue: "Saturn aspects Moon", source: "chart_json", confidence: "deterministic", tags: ["aspect"], metadata: {} },
] as const;

function answer(question: string, facts = baseFacts as never) {
  return answerExactFactIfPossible({ question, facts: facts as never });
}

function text(result: ReturnType<typeof answer>) {
  return result.answer ?? "";
}

describe("exact fact router", () => {
  it("detects exact fact intents deterministically", () => {
    expect(detectExactFactIntent("What is my Lagna?")).toBe("lagna");
    expect(detectExactFactIntent("Where is Sun placed?")).toBe("planet_placement");
    expect(detectExactFactIntent("Which planet rules the 10th house?")).toBe("house_lord");
    expect(detectExactFactIntent("Compare Aries and Taurus SAV.")).toBe("sav_compare");
  });

  it("supports direct exact facts and placement facts", () => {
    const cases = [
      ["What is my Lagna?", "Leo", "lagna"],
      ["What is my ascendant?", "Leo", "lagna"],
      ["Where is Sun placed?", "Taurus", "planet_placement"],
      ["Tell me Sun placement.", "Taurus", "planet_placement"],
      ["Where is Venus placed?", "Cancer", "planet_placement"],
      ["What is my Moon sign?", "Gemini", "moon_sign"],
      ["What is my Rasi?", "Gemini", "moon_sign"],
      ["Which sign is in the 10th house?", "Taurus", "house_sign"],
      ["Which sign is in tenth house?", "Taurus", "house_sign"],
    ] as const;
    for (const [question, expected, intent] of cases) {
      const result = answer(question);
      expect(result.answered).toBe(true);
      expect(result.intent).toBe(intent);
      expect(text(result)).toContain(expected);
      expect(result.llmUsed).toBe(false);
      expect(result.groqUsed).toBe(false);
      expect(result.ollamaUsed).toBe(false);
    }
  });

  it("answers exact chart fact request without guesswork", () => {
    const result = answer("Tell me one exact chart fact you can safely verify.");
    expect(result.answered).toBe(true);
    expect(result.intent).toBe("lagna");
    expect(text(result)).toContain("Leo");
  });

  it("answers ascendant sign exactly as lagna", () => {
    const result = answer("What is my Ascendant sign exactly?");
    expect(result.intent).toBe("lagna");
    expect(text(result)).toContain("Leo");
  });

  it("answers career house deterministically", () => {
    const result = answer("Which house is connected to my career?");
    expect(result.answered).toBe(true);
    expect(result.intent).toBe("career_house");
    expect(text(result)).toContain("10th house");
  });

  it("exact fact route is deterministic and does not use Groq or Ollama", () => {
    const result = answer("Can you answer one exact fact without using AI guesswork?");
    expect(result.answered).toBe(true);
    expect(result.source).toBe("deterministic");
    expect(result.groqUsed).toBe(false);
    expect(result.ollamaUsed).toBe(false);
  });

  it("answers chart fact without interpretation as exact fact", () => {
    const result = answer("Tell me a chart fact without interpretation.");
    expect(result.intent).toBe("lagna");
    expect(result.answered).toBe(true);
  });

  it("answers house lords and fallback derivation", () => {
    const direct = answer("Which planet rules the 10th house?");
    expect(direct.intent).toBe("house_lord");
    expect(text(direct)).toContain("Venus");
    expect(text(direct)).toContain("Taurus");

    const fallbackFacts = baseFacts.filter((fact) => fact.factKey !== "lord_10");
    const derived = answerExactFactIfPossible({ question: "Who is the ruler of 10th house?", facts: fallbackFacts as never });
    expect(derived.answered).toBe(true);
    expect(text(derived)).toContain("Venus");
    expect(text(derived)).toContain("Taurus");
    expect(text(derived)).toContain("This is a deterministic chart fact read from the chart data.");
    expect(derived.factKeys).toContain("house_10");
  });

  it("answers current dasha facts and rejects invented periods", () => {
    expect(text(answer("What is my current Mahadasha?"))).toContain("Jupiter Mahadasha 2020-2036");
    expect(text(answer("What is my Jupiter Mahadasha?"))).toContain("Jupiter Mahadasha 2020-2036");
    expect(text(answer("What is my current Antardasha?"))).toContain("Venus Antardasha 2025-2027");
    expect(answer("What is my Saturn Mahadasha?").answered).toBe(true);
    expect(text(answer("What is my Saturn Mahadasha?"))).toContain("Unavailable");
    expect(answer("What dasha am I running?").answered).toBe(true);
  });

  it("compares SAV numerically", () => {
    const a = answer("Compare Aries and Taurus SAV.");
    const b = answer("Compare Taurus and Aries sarvashtakavarga.");
    expect(text(a)).toContain("Aries SAV is 28");
    expect(text(a)).toContain("Taurus SAV is 32");
    expect(text(a)).toContain("Taurus is higher by 4");
    expect(text(b)).toContain("Taurus SAV is 32");
    expect(text(b)).toContain("Aries SAV is 28");
  });

  it("lists planets in a house and handles missing occupancy data safely", () => {
    const known = answer("Which planets are in the 11th house?");
    expect(text(known)).toContain("Moon");
    expect(text(known)).toContain("Mercury");
    const knownAlt = answer("Which planets are in eleventh house?");
    expect(text(knownAlt)).toContain("Moon");
    expect(text(knownAlt)).toContain("Mercury");
    const missing = answer("Which planets are in the 6th house?");
    expect(missing.answered).toBe(true);
    expect(text(missing)).toContain("Unavailable");
    expect(text(missing)).not.toContain("none");
  });

  it("answers co-presence deterministically", () => {
    expect(text(answer("Is Moon with Mercury?"))).toContain("Yes");
    expect(text(answer("Is Sun with Mercury?"))).toContain("No");
  });

  it("answers nakshatra facts", () => {
    expect(text(answer("What is my Moon nakshatra?"))).toContain("Mrigasira");
    expect(text(answer("What is my nakshatra pada?"))).toContain("2");
  });

  it("answers sign-to-house and planet-in-house yes/no", () => {
    expect(text(answer("Which house is Taurus?"))).toContain("10th house");
    expect(text(answer("Is Sun in the 10th house?"))).toContain("Yes");
    expect(text(answer("Is Venus in the 10th house?"))).toContain("No");
  });

  it("returns unavailable for missing facts without hallucinating", () => {
    const result = answer("Where is Mars placed?");
    expect(result.answered).toBe(true);
    expect(text(result)).toContain("I do not have that exact chart fact");
    expect(result.factKeys).toEqual(["planet_placement:mars"]);

    const missingHouse = answer("Which sign is in the 4th house?");
    expect(text(missingHouse)).toContain("I do not have that exact chart fact");
  });

  it("unsupported exact fact stays bounded", () => {
    const result = answerExactFactIfPossible({ question: "What is my exact strongest planet without data?", facts: [] as never });
    expect(result.answered).toBe(true);
    expect(text(result)).toContain("Unavailable");
  });

  it("returns unknown for interpretive questions", () => {
    const result = answer("Will I get promoted?");
    expect(result.answered).toBe(false);
    expect(result.intent).toBe("unknown");
    expect(result.answer).toBeNull();
  });

  it("supports compatibility string-only calls", () => {
    expect(() => answerExactFactIfPossible("What is my Lagna?")).not.toThrow();
  });

  it("covers the remaining prompt variants", () => {
    const prompts = [
      "Tell me one exact chart fact you can safely verify.",
      "What is my Ascendant sign exactly?",
      "Tell me a chart fact without interpretation.",
      "Can you answer one exact fact without using AI guesswork?",
      "Is my Sun in the 10th house?",
      "Which planet rules the 10th house?",
      "Who is the ruler of 10th house?",
      "Compare Aries and Taurus SAV.",
      "Compare Taurus and Aries sarvashtakavarga.",
      "What is my current Mahadasha?",
      "What is my Jupiter Mahadasha?",
      "What is my current Antardasha?",
      "Which planets are in the 11th house?",
      "Is Moon with Mercury?",
      "What is my Moon nakshatra?",
      "What is my nakshatra pada?",
      "Which house is Taurus?",
      "Is Sun in the 10th house?",
      "Is Venus in the 10th house?",
    ];
    for (const prompt of prompts) {
      const result = answer(prompt);
      expect(result.source).toBe("deterministic");
      expect(result.groqUsed).toBe(false);
      expect(result.ollamaUsed).toBe(false);
    }
  });
});
