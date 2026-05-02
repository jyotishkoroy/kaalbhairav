import { describe, expect, it } from "vitest";
import { normalizeDumpRecord } from "../../../scripts/ingest-astro-dump";

describe("structured rule normalization", () => {
  it("maps shukra to Venus", () => {
    const result = normalizeDumpRecord({
      record_type: "rule",
      rule_id: "r1",
      source_text: "text",
      source_reference: "ref",
      source_reliability: "primary_classical",
      retrieval_keywords: [],
      life_area_tags: [],
      condition_tags: [],
      structured_rule: { condition: { planet: "shukra" }, interpretation: {} },
    });
    expect(result?.row.primary_planet).toBe("Venus");
  });

  it("extracts house 7 from string", () => {
    const result = normalizeDumpRecord({
      record_type: "rule",
      rule_id: "r2",
      source_text: "text",
      source_reference: "ref",
      source_reliability: "primary_classical",
      retrieval_keywords: [],
      life_area_tags: [],
      condition_tags: [],
      structured_rule: { condition: { house: "7th house" }, interpretation: {} },
    });
    expect(result?.row.house).toBe(7);
  });

  it("maps Mesha to Aries", () => {
    const result = normalizeDumpRecord({
      record_type: "rule",
      rule_id: "r3",
      source_text: "text",
      source_reference: "ref",
      source_reliability: "primary_classical",
      retrieval_keywords: [],
      life_area_tags: [],
      condition_tags: [],
      structured_rule: { condition: { sign: "Mesha" }, interpretation: {} },
    });
    expect(result?.row.sign).toBe("Aries");
  });

  it("normalizes empty strings to null", () => {
    const result = normalizeDumpRecord({
      record_type: "rule",
      rule_id: "r4",
      source_text: " ",
      source_reference: " ",
      source_reliability: " ",
      retrieval_keywords: [],
      life_area_tags: [],
      condition_tags: [],
      structured_rule: { condition: { planet: "" }, interpretation: {} },
    });
    expect(result?.row.normalized_source_text).toBeNull();
  });

  it("does not crash without structured_rule", () => {
    const result = normalizeDumpRecord({
      record_type: "rule",
      rule_id: "r5",
      source_text: "text",
      source_reference: "ref",
      source_reliability: "primary_classical",
    });
    expect(result?.row.normalized_condition).toEqual({});
    expect(result?.row.normalized_interpretation).toEqual({});
  });
});
