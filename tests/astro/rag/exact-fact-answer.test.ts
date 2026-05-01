/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildDashaExactFactAnswer, formatExactFactAnswer, unavailableExactFactAnswer } from "../../../lib/astro/rag/exact-fact-answer";

describe("exact fact answer formatting", () => {
  it("formats answered facts", () => {
    const formatted = formatExactFactAnswer({
      directAnswer: "Your Lagna is Leo.",
      derivation: "This is directly read from lagna lagna in the structured chart data.",
      accuracy: "totally_accurate",
      suggestedFollowUp: "You can ask which planet rules your Lagna.",
      factKeys: ["lagna"],
    });

    expect(formatted).toContain("Direct answer: Your Lagna is Leo.");
    expect(formatted).toContain("This is a deterministic chart fact read from the chart data.");
    expect(formatted).not.toContain("How this is derived:");
    expect(formatted).not.toContain("Accuracy:");
    expect(formatted).not.toContain("Suggested follow-up:");
  });

  it("formats unavailable facts", () => {
    const formatted = formatExactFactAnswer(unavailableExactFactAnswer("planet_placement:mars"));

    expect(formatted).toContain("Direct answer: I do not have that exact chart fact available in the structured chart data yet. Missing: planet_placement:mars.");
    expect(formatted).toContain("Unavailable — this exact fact is not available from the current structured data.");
    expect(formatted).not.toContain("How this is derived:");
    expect(formatted).not.toContain("Accuracy:");
  });

  it("keeps unavailable wording deterministic", () => {
    const answer = unavailableExactFactAnswer("house_4");
    expect(answer.accuracy).toBe("unavailable");
    expect(answer.factKeys).toEqual(["house_4"]);
    expect(answer.derivation).toContain("deterministic router");
  });

  it("does not require markdown tables", () => {
    const formatted = formatExactFactAnswer({
      directAnswer: "A",
      derivation: "B",
      accuracy: "totally_accurate",
      suggestedFollowUp: "C",
      factKeys: [],
    });
    expect(formatted).not.toContain("|");
  });

  it("builds deterministic dasha answers", () => {
    const maha = buildDashaExactFactAnswer("Which Mahadasha am I running now?");
    expect(maha?.directAnswer).toContain("Jupiter Mahadasha");
    expect(maha?.directAnswer).toContain("22 Aug 2018");
    expect(maha?.directAnswer).toContain("22 Aug 2034");

    const antardasha2026 = buildDashaExactFactAnswer("Which Antardasha should be active around 2026 according to my report?");
    expect(antardasha2026?.directAnswer).toContain("Jupiter/Ketu");
    expect(antardasha2026?.directAnswer).toContain("28 Jul 2025");
    expect(antardasha2026?.directAnswer).toContain("04 Jul 2026");
    expect(antardasha2026?.directAnswer).toContain("Jupiter/Venus");
    expect(antardasha2026?.directAnswer).toContain("04 Mar 2029");
  });
});
