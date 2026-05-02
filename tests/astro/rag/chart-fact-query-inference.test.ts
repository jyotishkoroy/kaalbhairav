import { describe, expect, it } from "vitest";
import { buildStructuredRuleRankingContext, inferHousesFromQuestion, inferLifeAreaTagsFromQuestion, inferPlanetsFromQuestion } from "../../../lib/astro/rag/chart-fact-extractor";

describe("chart fact query inference", () => {
  it("infers marriage and relationship tags", () => {
    expect(inferLifeAreaTagsFromQuestion("Will I have marriage and spouse happiness?")).toEqual(expect.arrayContaining(["marriage", "relationship"]));
  });

  it("infers career tags", () => {
    expect(inferLifeAreaTagsFromQuestion("career job work status")).toEqual(expect.arrayContaining(["career"]));
  });

  it("infers planets and houses from question", () => {
    expect(inferPlanetsFromQuestion("What about Venus in 7th house?")).toContain("Venus");
    expect(inferHousesFromQuestion("What about Venus in 7th house?")).toContain(7);
  });

  it("returns empty hints for malformed question", () => {
    expect(inferLifeAreaTagsFromQuestion("")).toEqual([]);
    expect(inferPlanetsFromQuestion("")).toEqual([]);
    expect(inferHousesFromQuestion("")).toEqual([]);
  });

  it("keeps inferred hints separate from chart facts", () => {
    const context = buildStructuredRuleRankingContext({ userQuestion: "Venus in 7th house?", chartFacts: [] });
    expect(context.planets).toContain("Venus");
    expect(context.houses).toContain(7);
    expect(context.chartFactTags).toEqual([]);
  });
});
