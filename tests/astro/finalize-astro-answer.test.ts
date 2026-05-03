/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, it, expect } from "vitest";
import { finalizeAstroAnswer } from "@/lib/astro/finalize-astro-answer";
import { buildPublicChartFacts } from "@/lib/astro/public-chart-facts";

const leoFacts = buildPublicChartFacts({
  profileId: "test-profile",
  chartVersionId: "test-v1",
  chartJson: {
    public_facts: {
      lagna_sign: "Leo",
      moon_sign: "Gemini",
      moon_house: 11,
      sun_sign: "Taurus",
      sun_house: 10,
      moon_nakshatra: "Mrigasira",
      moon_pada: 4,
      mahadasha: "Jupiter",
      mangal_dosha: false,
      kalsarpa_yoga: false,
    },
  },
});

const FORBIDDEN_PATTERNS = [
  /profile_id\s*[:=]/i,
  /chart_version_id\s*[:=]/i,
  /user_id\s*[:=]/i,
  /\bfact:\s*/i,
  /\bchart_fact:\s*/i,
  /\bprovider\s*[:=]/i,
  /\bmodel\s*[:=]/i,
  /\bserver\s*[:=]/i,
  /\bmetadata\s*[:=]/i,
  /\bdebugTrace\b/i,
  /Retrieval cue:/i,
];

const WRONG_CHART_PATTERNS = [
  /Virgo Lagna/i,
  /Gemini Moon in the 10th house/i,
  /Taurus Sun in the 9th house/i,
  /Saturn Mahadasha/i,
];

// ── 1. Passes correct answer through ──────────────────────────────────────

describe("finalizeAstroAnswer – clean answer", () => {
  const cleanAnswer = "aadesh: Your Lagna is Leo. Leo Lagna gives warmth and presence.";
  const result = finalizeAstroAnswer({ answer: cleanAnswer, facts: leoFacts });

  it("ok = true for clean answer", () => expect(result.ok).toBe(true));
  it("no violations for clean answer", () => expect(result.violations).toHaveLength(0));
  it("starts with aadesh:", () => expect(result.answer.toLowerCase()).toMatch(/^aadesh:/));
  it("contains Leo", () => expect(result.answer).toContain("Leo"));
});

// ── 2. Detects and repairs Virgo Lagna ───────────────────────────────────

describe("finalizeAstroAnswer – wrong Virgo Lagna", () => {
  const wrongAnswer = "aadesh: Your Lagna is Virgo. Virgo Lagna is analytical.";
  const result = finalizeAstroAnswer({ answer: wrongAnswer, facts: leoFacts });

  it("violations include wrong_lagna", () => expect(result.violations).toContain("wrong_lagna"));
  it("repaired answer does not contain Virgo Lagna", () => {
    expect(result.answer).not.toMatch(/Virgo Lagna/i);
  });
  it("answer starts with aadesh:", () => expect(result.answer.toLowerCase()).toMatch(/^aadesh:/));
});

// ── 3. Detects metadata leaks: profile_id ────────────────────────────────

describe("finalizeAstroAnswer – profile_id leak", () => {
  const leakyAnswer = "aadesh: Your chart is Leo. profile_id=abc123 fact: chart grounded.";
  const result = finalizeAstroAnswer({ answer: leakyAnswer, facts: leoFacts });

  it("ok = false for leak", () => expect(result.ok).toBe(false));
  it("violations mention leak_profile_id", () => expect(result.violations.some((v) => v.includes("profile_id"))).toBe(true));
  it("sanitized answer does not contain profile_id=", () => {
    expect(result.answer).not.toMatch(/profile_id\s*[:=]/i);
  });
});

// ── 4. Detects metadata leaks: Retrieval cue ─────────────────────────────

describe("finalizeAstroAnswer – Retrieval cue leak", () => {
  const leakyAnswer = "aadesh: Your Lagna is Leo.\nRetrieval cue: internal retrieval key here.";
  const result = finalizeAstroAnswer({ answer: leakyAnswer, facts: leoFacts });

  it("ok = false (has leak)", () => expect(result.ok).toBe(false));
  it("violations include retrieval cue", () => {
    expect(result.violations.some((v) => v.toLowerCase().includes("retrieval"))).toBe(true);
  });
  it("sanitized answer does not contain Retrieval cue:", () => {
    expect(result.answer).not.toContain("Retrieval cue:");
  });
});

// ── 5. Correct answer → no violations, ok=true ───────────────────────────

describe("finalizeAstroAnswer – correct aadesh answer", () => {
  const goodAnswer = "aadesh: Leo Lagna supports leadership and authority. Your Jupiter Mahadasha is currently running.";
  const result = finalizeAstroAnswer({ answer: goodAnswer, facts: leoFacts });

  it("ok = true", () => expect(result.ok).toBe(true));
  it("no violations", () => expect(result.violations).toHaveLength(0));
  it("answer unchanged (or cleaned only for aadesh prefix)", () => {
    expect(result.answer).toContain("Leo Lagna");
    expect(result.answer).toContain("Jupiter Mahadasha");
  });
});

// ── 6. No-leak: forbidden patterns not in clean answer ───────────────────

describe("finalizeAstroAnswer – no forbidden patterns in clean answer", () => {
  const cleanAnswer = "aadesh: Your Lagna is Leo. Jupiter Mahadasha supports growth.";
  const result = finalizeAstroAnswer({ answer: cleanAnswer, facts: leoFacts });

  for (const pattern of FORBIDDEN_PATTERNS) {
    it(`answer does not match ${pattern.source}`, () => {
      expect(result.answer).not.toMatch(pattern);
    });
  }
});

// ── 7. No-wrong-chart for Leo fixture ────────────────────────────────────

describe("finalizeAstroAnswer – no wrong chart facts after repair", () => {
  const cleanAnswer = "aadesh: Leo Lagna, Gemini Moon in the 11th house, Taurus Sun in the 10th.";
  const result = finalizeAstroAnswer({ answer: cleanAnswer, facts: leoFacts });

  for (const pattern of WRONG_CHART_PATTERNS) {
    it(`clean Leo answer does not match wrong pattern ${pattern.source}`, () => {
      expect(result.answer).not.toMatch(pattern);
    });
  }
});

// ── 8. Ensures aadesh: prefix is added ───────────────────────────────────

describe("finalizeAstroAnswer – adds aadesh: prefix", () => {
  it("adds prefix when missing", () => {
    const result = finalizeAstroAnswer({ answer: "Your Lagna is Leo.", facts: leoFacts });
    expect(result.answer.toLowerCase()).toMatch(/^aadesh:/);
  });
  it("preserves existing prefix", () => {
    const result = finalizeAstroAnswer({ answer: "aadesh: Your Lagna is Leo.", facts: leoFacts });
    expect(result.answer.toLowerCase()).toMatch(/^aadesh:/);
  });
});

// ── 9. ok=false for answer with leaks ────────────────────────────────────

describe("finalizeAstroAnswer – ok flag", () => {
  it("ok=false for UUID in answer", () => {
    const result = finalizeAstroAnswer({
      answer: "aadesh: Your profile 550e8400-e29b-41d4-a716-446655440000 chart is Leo.",
      facts: leoFacts,
    });
    expect(result.ok).toBe(false);
  });

  it("ok=false for wrong facts (Virgo in Leo chart)", () => {
    const result = finalizeAstroAnswer({
      answer: "aadesh: Your Virgo Lagna is analytical and precise.",
      facts: leoFacts,
    });
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
