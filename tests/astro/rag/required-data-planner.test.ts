import { describe, expect, it } from "vitest";
import { buildDeterministicAnalyzerResult } from "../../../lib/astro/rag/analyzer-schema";
import { ragSafetyGate } from "../../../lib/astro/rag/safety-gate";
import { planRequiredData } from "../../../lib/astro/rag/required-data-planner";

function plan(question: string, analyzerOverrides: Partial<Parameters<typeof buildDeterministicAnalyzerResult>[0]> = {}, safetyAnswerType?: "exact_fact" | "interpretive" | "timing" | "remedy" | "unknown") {
  const analyzer = buildDeterministicAnalyzerResult({ question, ...analyzerOverrides });
  const requestedSafetyAnswerType =
    safetyAnswerType ??
    (analyzer.questionType === "general"
      ? "unknown"
      : analyzer.questionType === "unsafe"
        ? "unknown"
        : analyzer.questionType);
  const safety = ragSafetyGate({ question, answerType: requestedSafetyAnswerType });
  return planRequiredData({ analyzer, safety, question });
}

describe("required data planner", () => {
  describe("career", () => {
    it("plans career interpretive questions", () => {
      const result = plan("I am working hard and not getting promotion.", { topic: "career", questionType: "interpretive" });
      expect(result.domain).toBe("career");
      expect(result.answerType).toBe("interpretive");
    });

    it("includes the career matrix facts", () => {
      const result = plan("Why am I not getting recognition at work?", { topic: "career" });
      expect(result.requiredFacts).toEqual(expect.arrayContaining(["lagna", "house_10", "lord_10", "sun_placement", "house_11", "current_dasha"]));
    });

    it("includes career optional facts", () => {
      const result = plan("Will my salary improve?", { topic: "career" });
      expect(result.optionalFacts).toEqual(expect.arrayContaining(["varshaphal", "timing_windows", "career_benchmark_examples", "safe_remedies"]));
    });

    it("includes career retrieval tags", () => {
      const result = plan("I am working hard and not getting promotion.", { topic: "career" });
      expect(result.retrievalTags).toEqual(expect.arrayContaining(["career", "house_10", "dasha"]));
    });

    it("merges analyzer required facts without duplicates", () => {
      const result = plan("I am working hard and not getting promotion.", { requiredFacts: ["house_10", "moon_placement", "house_10"] });
      expect(result.requiredFacts.filter((item) => item === "house_10")).toHaveLength(1);
      expect(result.requiredFacts).toEqual(expect.arrayContaining(["moon_placement"]));
    });

    it("requires timing source when timing is requested", () => {
      const result = plan("When will promotion happen?", { questionType: "timing", needsTiming: true });
      expect(result.needsTiming).toBe(true);
      expect(result.requiresTimingSource).toBe(true);
      expect(result.requiredFacts).toContain("timing_source");
    });
  });

  describe("sleep", () => {
    it("plans remedy sleep questions", () => {
      const result = plan("Give me remedy for bad sleep.", { topic: "sleep", questionType: "remedy", needsRemedy: true });
      expect(result.domain).toBe("sleep");
      expect(result.answerType).toBe("remedy");
    });

    it("includes sleep required facts", () => {
      const result = plan("I cannot sleep at night, what should I do?", { topic: "sleep", questionType: "remedy", needsRemedy: true });
      expect(result.requiredFacts).toEqual(expect.arrayContaining(["house_12", "moon_placement", "house_6", "safe_remedy_rules"]));
    });

    it("marks needsRemedy", () => {
      const result = plan("Is there a mantra for peaceful sleep?", { topic: "sleep", questionType: "remedy", needsRemedy: true });
      expect(result.needsRemedy).toBe(true);
    });

    it("allows remedies when safety allows", () => {
      const result = plan("Give me remedy for bad sleep.", { topic: "sleep", questionType: "remedy", needsRemedy: true });
      expect(result.remedyAllowed).toBe(true);
    });

    it("blocks medical diagnosis sleep questions", () => {
      const result = plan("Do I have insomnia disease from chart?", { topic: "health", questionType: "unsafe", needsRemedy: false });
      expect(result.blockedBySafety).toBe(true);
    });

    it("preserves safe remedy restrictions", () => {
      const result = plan("Give me remedy for bad sleep.", { topic: "sleep", questionType: "remedy", needsRemedy: true });
      expect(result.safetyRestrictions.join(" ")).toContain("low-cost");
    });
  });

  describe("marriage", () => {
    it("plans marriage timing questions", () => {
      const result = plan("When will I get married?", { topic: "marriage", questionType: "timing", needsTiming: true });
      expect(result.domain).toBe("marriage");
      expect(result.needsTiming).toBe(true);
    });

    it("includes marriage required facts", () => {
      const result = plan("What does my 7th house show?", { topic: "marriage" });
      expect(result.requiredFacts).toEqual(expect.arrayContaining(["house_7", "lord_7", "venus_placement", "current_dasha"]));
    });

    it("requires timing source when timing requested", () => {
      const result = plan("Exact date of marriage?", { topic: "marriage", questionType: "timing", needsTiming: true });
      expect(result.requiresTimingSource).toBe(true);
      expect(result.requiredFacts).toContain("timing_source");
    });

    it("respects timing claims safety metadata", () => {
      const analyzer = buildDeterministicAnalyzerResult({ question: "When will I get married?", topic: "marriage", questionType: "timing", needsTiming: true });
      const safety = ragSafetyGate({ question: "When will I get married?", answerType: "timing" });
      const result = planRequiredData({ analyzer, safety: { ...safety, metadata: { ...safety.metadata, timingClaimsAllowed: false } } });
      expect(result.timingAllowed).toBe(false);
    });

    it("includes timing windows and varshaphal optionally", () => {
      const result = plan("Will love marriage happen?", { topic: "marriage", questionType: "timing", needsTiming: true });
      expect(result.optionalFacts).toEqual(expect.arrayContaining(["timing_windows", "varshaphal"]));
    });
  });

  describe("money", () => {
    it("plans money questions interpretively", () => {
      const result = plan("Will my income improve?", { topic: "money", questionType: "interpretive" });
      expect(result.domain).toBe("money");
      expect(result.answerType).toBe("interpretive");
    });

    it("includes money required facts", () => {
      const result = plan("Will my income improve?", { topic: "money" });
      expect(result.requiredFacts).toEqual(expect.arrayContaining(["house_2", "lord_2", "house_11", "lord_11", "current_dasha"]));
    });

    it("blocks financial guarantees", () => {
      const result = plan("Which stock will guarantee profit?", { topic: "money", questionType: "unsafe" });
      expect(result.blockedBySafety).toBe(true);
    });

    it("blocked financial plans have no chart facts", () => {
      const result = plan("Which stock will guarantee profit?", { topic: "money", questionType: "unsafe" });
      expect(result.requiredFacts).toEqual([]);
    });

    it("preserves financial restrictions", () => {
      const result = plan("Which stock will guarantee profit?", { topic: "money", questionType: "unsafe" });
      expect(result.safetyRestrictions.join(" ")).toMatch(/financial/i);
    });
  });

  describe("exact facts", () => {
    it("keeps exact fact answers narrow", () => {
      const result = plan("What is my Lagna?", { topic: "general", questionType: "exact_fact", requiredFacts: ["lagna"] }, "exact_fact");
      expect(result.answerType).toBe("exact_fact");
    });

    it("uses analyzer required facts only", () => {
      const result = plan("What is my Lagna?", { topic: "general", questionType: "exact_fact", requiredFacts: ["lagna"] }, "exact_fact");
      expect(result.requiredFacts).toEqual(["lagna"]);
    });

    it("does not allow timing", () => {
      const result = plan("What is my Lagna?", { topic: "general", questionType: "exact_fact", requiredFacts: ["lagna"] }, "exact_fact");
      expect(result.timingAllowed).toBe(false);
    });

    it("does not allow remedies", () => {
      const result = plan("What is my Lagna?", { topic: "general", questionType: "exact_fact", requiredFacts: ["lagna"] }, "exact_fact");
      expect(result.remedyAllowed).toBe(false);
    });

    it("does not add matrix career facts", () => {
      const result = plan("What is my Lagna?", { topic: "general", questionType: "exact_fact", requiredFacts: ["lagna"] }, "exact_fact");
      expect(result.requiredFacts).not.toContain("house_10");
    });
  });

  describe("general", () => {
    it("keeps vague questions general", () => {
      const result = plan("What will happen?");
      expect(result.domain).toBe("general");
      expect(result.answerType).toBe("general");
    });

    it("adds follow-up warnings when analyzer asks for follow-up", () => {
      const result = plan("What will happen?", { shouldAskFollowup: true });
      expect(result.missingPlanningWarnings).toContain("Analyzer requested follow-up before retrieval.");
    });

    it("includes general required facts", () => {
      const result = plan("What will happen?");
      expect(result.requiredFacts).toEqual(expect.arrayContaining(["lagna", "moon_placement"]));
    });

    it("does not require timing source unless needed", () => {
      const result = plan("What will happen?");
      expect(result.requiredFacts).not.toContain("timing_source");
    });

    it("includes general retrieval tags", () => {
      const result = plan("What will happen?");
      expect(result.retrievalTags).toEqual(expect.arrayContaining(["general"]));
    });
  });

  describe("safety blocks", () => {
    it("blocks death questions", () => {
      const result = plan("Can my chart tell when I will die?", { topic: "safety", questionType: "unsafe" });
      expect(result.blockedBySafety).toBe(true);
      expect(result.domain).toBe("safety");
      expect(result.answerType).toBe("safety");
    });

    it("blocks medical diagnosis", () => {
      const result = plan("Do I have cancer according to chart?", { topic: "health", questionType: "unsafe" });
      expect(result.blockedBySafety).toBe(true);
    });

    it("blocks self-harm questions", () => {
      const result = plan("I want to die.", { topic: "safety", questionType: "unsafe" });
      expect(result.blockedBySafety).toBe(true);
    });

    it("blocks legal guarantee questions", () => {
      const result = plan("Will I win my court case?", { topic: "legal", questionType: "unsafe" });
      expect(result.blockedBySafety).toBe(true);
    });

    it("does not allow llm when safety blocks", () => {
      const result = plan("Will I win my court case?", { topic: "legal", questionType: "unsafe" });
      expect(result.metadata.llmAllowed).toBe(false);
    });
  });

  describe("alias normalization", () => {
    it("dedupes planet placement aliases", () => {
      const result = plan("Where is Sun placed?", { topic: "general", questionType: "exact_fact", requiredFacts: ["planet_placement:sun", "sun_placement"] }, "exact_fact");
      expect(result.requiredFacts).toEqual(["sun_placement"]);
    });

    it("normalizes lord aliases", () => {
      const result = plan("Which planet rules 10th house?", { topic: "general", questionType: "exact_fact", requiredFacts: ["lord:10"] }, "exact_fact");
      expect(result.requiredFacts).toContain("lord_10");
    });

    it("normalizes house aliases", () => {
      const result = plan("Which planet rules 10th house?", { topic: "general", questionType: "exact_fact", requiredFacts: ["house:10"] }, "exact_fact");
      expect(result.requiredFacts).toContain("house_10");
    });
  });

  it("supports no-arg compatibility", () => {
    const result = planRequiredData();
    expect(result.domain).toBe("general");
    expect(result.requiredFacts).toEqual([]);
  });
});
