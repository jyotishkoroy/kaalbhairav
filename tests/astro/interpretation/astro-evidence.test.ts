/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { describe, expect, it } from "vitest";
import { classifyUserConcern } from "@/lib/astro/reading/concern-classifier";
import {
  buildAstroEvidence,
  interpretCareer,
  interpretHealth,
  interpretMarriage,
  interpretMoney,
  interpretRelationship,
  interpretRemedies,
  interpretTiming,
} from "@/lib/astro/interpretation";
import type { AstroInterpretationContext } from "@/lib/astro/interpretation";

function makeContext(
  question: string,
  overrides: Partial<AstroInterpretationContext> = {},
): AstroInterpretationContext {
  return {
    concern: classifyUserConcern(question),
    chart: {
      lagna: "Leo",
      moonSign: "Gemini",
      nakshatra: "Mrigasira",
    },
    dasha: {
      mahadasha: "Saturn",
      antardasha: "Mercury",
    },
    transits: {},
    ...overrides,
  };
}

describe("AstroEvidence engine", () => {
  it("creates Saturn career evidence during Saturn Mahadasha", () => {
    const evidence = interpretCareer(
      makeContext("When will I get a job?", {
        dasha: {
          mahadasha: "Saturn",
        },
      }),
    );

    expect(evidence.some((item) => item.id === "career-saturn-mahadasha")).toBe(
      true,
    );
  });

  it("creates Jupiter career evidence during Jupiter Mahadasha", () => {
    const evidence = interpretCareer(
      makeContext("Will my career improve?", {
        dasha: {
          mahadasha: "Jupiter",
        },
      }),
    );

    expect(evidence.some((item) => item.id === "career-jupiter-mahadasha")).toBe(
      true,
    );
  });

  it("creates Mercury career evidence during Mercury Antardasha", () => {
    const evidence = interpretCareer(
      makeContext("When will I get promotion?", {
        dasha: {
          mahadasha: "Saturn",
          antardasha: "Mercury",
        },
      }),
    );

    expect(
      evidence.some((item) => item.id === "career-mercury-antardasha"),
    ).toBe(true);
  });

  it("creates marriage delay evidence for Saturn influence", () => {
    const evidence = interpretMarriage(
      makeContext("I am tired of waiting for marriage", {
        dasha: {
          mahadasha: "Saturn",
        },
      }),
    );

    expect(evidence.some((item) => item.id === "marriage-saturn-delay")).toBe(
      true,
    );
  });

  it("creates relationship evidence for Venus Antardasha", () => {
    const evidence = interpretRelationship(
      makeContext("I am confused about my relationship", {
        dasha: {
          antardasha: "Venus",
        },
      }),
    );

    expect(
      evidence.some((item) => item.id === "relationship-venus-sensitivity"),
    ).toBe(true);
  });

  it("creates relationship overthinking evidence for Gemini Moon", () => {
    const evidence = interpretRelationship(
      makeContext("Should I continue this relationship?", {
        chart: {
          moonSign: "Gemini",
        },
      }),
    );

    expect(
      evidence.some((item) => item.id === "relationship-gemini-moon-overthinking"),
    ).toBe(true);
  });

  it("creates Saturn money discipline evidence", () => {
    const evidence = interpretMoney(
      makeContext("Money pressure is increasing", {
        dasha: {
          mahadasha: "Saturn",
        },
      }),
    );

    expect(evidence.some((item) => item.id === "money-saturn-discipline")).toBe(
      true,
    );
  });

  it("creates health boundary evidence for health-sensitive questions", () => {
    const evidence = interpretHealth(
      makeContext("Do I have a serious disease according to my chart?"),
    );

    expect(evidence.some((item) => item.id === "health-responsible-boundary")).toBe(
      true,
    );
  });

  it("creates health boundary evidence for death questions", () => {
    const evidence = interpretHealth(
      makeContext("Can my chart tell when I will die?"),
    );

    expect(evidence.some((item) => item.id === "health-responsible-boundary")).toBe(
      true,
    );
  });

  it("creates timing evidence for timing questions", () => {
    const evidence = interpretTiming(makeContext("When will things improve?"));

    expect(
      evidence.some((item) => item.id === "timing-probability-boundary"),
    ).toBe(true);
  });

  it("creates safe remedy evidence for remedy questions", () => {
    const evidence = interpretRemedies(
      makeContext("What remedy should I do for career delay?", {
        dasha: {
          mahadasha: "Saturn",
        },
      }),
    );

    expect(
      evidence.some((item) => item.id === "remedy-saturn-safe"),
    ).toBe(true);
  });

  it("builds evidence for the classified topic only", () => {
    const evidence = buildAstroEvidence(
      makeContext("When will I get a job?", {
        dasha: {
          mahadasha: "Saturn",
          antardasha: "Mercury",
        },
      }),
    );

    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((item) => item.topic === "career")).toBe(true);
  });

  it("deduplicates evidence by id", () => {
    const evidence = buildAstroEvidence(
      makeContext("What remedy should I do for career delay?", {
        dasha: {
          mahadasha: "Saturn",
        },
      }),
    );

    const ids = evidence.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not return unrelated marriage evidence for career questions", () => {
    const evidence = buildAstroEvidence(makeContext("When will I get a job?"));

    expect(evidence.some((item) => item.topic === "marriage")).toBe(false);
  });

  it("keeps every evidence object user-safe and structured", () => {
    const evidence = buildAstroEvidence(
      makeContext("When will I get a job?", {
        dasha: {
          mahadasha: "Saturn",
          antardasha: "Mercury",
        },
      }),
    );

    for (const item of evidence) {
      expect(item.id).toBeTruthy();
      expect(item.factor).toBeTruthy();
      expect(item.humanMeaning).toBeTruthy();
      expect(item.likelyExperience).toBeTruthy();
      expect(item.guidance).toBeTruthy();
      expect(["low", "medium", "high"]).toContain(item.confidence);
      expect(typeof item.visibleToUser).toBe("boolean");
    }
  });
});
