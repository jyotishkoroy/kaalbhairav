import { describe, expect, it } from "vitest";
import { REQUIRED_DATA_MATRIX, getRequiredDataMatrixEntry, mapAnalyzerToRequiredDataDomain } from "../../../lib/astro/rag/required-data-matrix";

describe("required data matrix", () => {
  it("career entry includes core required facts", () => {
    const entry = getRequiredDataMatrixEntry("career");
    expect(entry.required.map((item) => item.key)).toEqual(expect.arrayContaining(["lagna", "house_10", "lord_10", "sun_placement", "house_11", "current_dasha"]));
  });

  it("career optional includes timing and remedies", () => {
    const entry = REQUIRED_DATA_MATRIX.career;
    expect(entry.optional.map((item) => item.key)).toEqual(expect.arrayContaining(["timing_windows", "safe_remedies"]));
  });

  it("sleep entry has the required remedy guardrails", () => {
    const entry = REQUIRED_DATA_MATRIX.sleep;
    expect(entry.required.map((item) => item.key)).toEqual(expect.arrayContaining(["house_12", "moon_placement", "house_6", "safe_remedy_rules"]));
  });

  it("marriage entry has partnership anchors", () => {
    const entry = REQUIRED_DATA_MATRIX.marriage;
    expect(entry.required.map((item) => item.key)).toEqual(expect.arrayContaining(["house_7", "lord_7", "venus_placement", "current_dasha"]));
  });

  it("money entry has income anchors", () => {
    const entry = REQUIRED_DATA_MATRIX.money;
    expect(entry.required.map((item) => item.key)).toEqual(expect.arrayContaining(["house_2", "lord_2", "house_11", "lord_11", "current_dasha"]));
  });

  it("foreign entry has foreign movement anchors", () => {
    const entry = REQUIRED_DATA_MATRIX.foreign;
    expect(entry.required.map((item) => item.key)).toEqual(expect.arrayContaining(["house_12", "lord_12", "rahu_placement", "current_dasha"]));
  });

  it("education entry has learning anchors", () => {
    const entry = REQUIRED_DATA_MATRIX.education;
    expect(entry.required.map((item) => item.key)).toEqual(expect.arrayContaining(["house_5", "house_9", "mercury_placement", "jupiter_placement"]));
  });

  it("timing entry requires timing source", () => {
    expect(REQUIRED_DATA_MATRIX.timing.required.map((item) => item.key)).toEqual(["timing_source"]);
  });

  it("safety entry requires no chart facts", () => {
    expect(REQUIRED_DATA_MATRIX.safety.required).toEqual([]);
  });

  it("exact fact entry is empty and safe", () => {
    expect(REQUIRED_DATA_MATRIX.exact_fact.required).toEqual([]);
    expect(REQUIRED_DATA_MATRIX.exact_fact.optional).toEqual([]);
  });

  it("maps career topic to career", () => {
    expect(mapAnalyzerToRequiredDataDomain({ topic: "career" })).toBe("career");
  });

  it("maps exact_fact question type to exact_fact", () => {
    expect(mapAnalyzerToRequiredDataDomain({ questionType: "exact_fact" })).toBe("exact_fact");
  });

  it("maps general needsTiming to timing", () => {
    expect(mapAnalyzerToRequiredDataDomain({ topic: "general", needsTiming: true })).toBe("timing");
  });

  it("maps retrieval tag sleep to sleep", () => {
    expect(mapAnalyzerToRequiredDataDomain({ topic: "general", retrievalTags: ["sleep"] })).toBe("sleep");
  });

  it("maps unknown input to general", () => {
    expect(mapAnalyzerToRequiredDataDomain({ topic: "unknown" })).toBe("general");
  });
});
