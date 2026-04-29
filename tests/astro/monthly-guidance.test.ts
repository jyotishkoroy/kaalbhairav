/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { describe, expect, it } from "vitest";
import {
  generateMonthlyGuidance,
  getAllMonthlyThemes,
  getMonthlyActionSet,
  renderMonthlyGuidance,
} from "@/lib/astro/monthly";

describe("Monthly guidance engine", () => {
  it("returns all monthly guidance fields", () => {
    const guidance = generateMonthlyGuidance({
      month: "January 2026",
      topic: "career",
      dasha: {
        mahadasha: "Saturn",
      },
    });

    expect(guidance.month).toBe("January 2026");
    expect(guidance.mainTheme).toBeTruthy();
    expect(guidance.emotionalTheme).toBeTruthy();
    expect(guidance.careerFocus).toBeTruthy();
    expect(guidance.relationshipFocus).toBeTruthy();
    expect(guidance.avoid.length).toBeGreaterThan(0);
    expect(guidance.doMoreOf.length).toBeGreaterThan(0);
    expect(guidance.remedy).toBeTruthy();
  });

  it("uses discipline theme for Saturn career month", () => {
    const guidance = generateMonthlyGuidance({
      month: "January 2026",
      topic: "career",
      dasha: {
        mahadasha: "Saturn",
      },
    });

    expect(guidance.mainTheme.toLowerCase()).toContain("discipline");
  });

  it("uses financial stability for money topic", () => {
    const guidance = generateMonthlyGuidance({
      month: "January 2026",
      topic: "money",
    });

    expect(guidance.mainTheme.toLowerCase()).toMatch(/money|financial|stability/);
  });

  it("uses relationship balance for relationship topic", () => {
    const guidance = generateMonthlyGuidance({
      month: "January 2026",
      topic: "relationship",
    });

    expect(guidance.mainTheme.toLowerCase()).toContain("balance");
  });

  it("works without complete transit data", () => {
    const guidance = generateMonthlyGuidance();

    expect(guidance.month).toBeTruthy();
    expect(guidance.mainTheme).toBeTruthy();
  });

  it("does not include scary or deterministic predictions", () => {
    const guidance = generateMonthlyGuidance({
      topic: "health",
    });
    const serialized = JSON.stringify(guidance).toLowerCase();

    expect(serialized).not.toContain("guaranteed");
    expect(serialized).not.toContain("death date");
    expect(serialized).not.toContain("you will die");
    expect(serialized).not.toContain("never marry");
    expect(serialized).not.toContain("cursed");
    expect(serialized).not.toContain("do not see a doctor");
  });

  it("renders monthly guidance text", () => {
    const guidance = generateMonthlyGuidance({
      month: "January 2026",
      topic: "career",
      dasha: {
        mahadasha: "Saturn",
      },
    });
    const rendered = renderMonthlyGuidance(guidance);

    expect(rendered).toContain("Monthly guidance for January 2026");
    expect(rendered).toContain("Career focus:");
    expect(rendered).toContain("Relationship focus:");
    expect(rendered).toContain("Avoid:");
    expect(rendered).toContain("Do more of:");
    expect(rendered).toContain("Practical note:");
  });

  it("exposes all monthly themes", () => {
    expect(getAllMonthlyThemes()).toContain("discipline");
    expect(getMonthlyActionSet("general").mainTheme).toBeTruthy();
  });
});
