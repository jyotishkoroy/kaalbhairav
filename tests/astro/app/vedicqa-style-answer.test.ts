/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildVedicStyleAnswer } from "@/lib/astro/vedicqa-style-answer";

const facts = { lagnaSign: "Leo", moonSign: "Gemini", moonHouse: 11, sunSign: "Taurus", sunHouse: 10, nakshatra: "Mrigasira", nakshatraPada: 4, mahadasha: "Jupiter", antardashaNow: "Jupiter-Ketu", antardashaTimeline: [{ mahadasha: "Jupiter", antardasha: "Ketu", startDate: "2025-01-01", endDate: "2026-07-01" }, { mahadasha: "Jupiter", antardasha: "Venus", startDate: "2026-07-02", endDate: "2027-01-01" }], sourcePriority: [], warnings: [] };

describe("buildVedicStyleAnswer", () => {
  it("uses chart-specific language for personality, career, relationship, finance, and dasha", () => {
    expect(buildVedicStyleAnswer({ question: "Why do I overthink?", topic: "mind", facts })).toContain("Mrigasira");
    expect(buildVedicStyleAnswer({ question: "Why do I want recognition?", topic: "personality", facts })).toContain("Leo Lagna");
    expect(buildVedicStyleAnswer({ question: "What is my career direction?", topic: "career", facts })).toContain("10th house");
    expect(buildVedicStyleAnswer({ question: "Can I succeed in technology?", topic: "technology", facts })).toContain("communication");
    expect(buildVedicStyleAnswer({ question: "What kind of partner suits me?", topic: "relationship", facts })).toContain("friendship");
    expect(buildVedicStyleAnswer({ question: "What is my finance pattern?", topic: "finance", facts })).toContain("gains");
    expect(buildVedicStyleAnswer({ question: "What should I do during Jupiter-Ketu?", topic: "dasha", facts })).toContain("Jupiter Mahadasha");
    expect(buildVedicStyleAnswer({ question: "What can Jupiter-Venus bring after mid-2026?", topic: "dasha", facts })).toContain("relationship");
    expect(buildVedicStyleAnswer({ question: "Should I do remedies?", topic: "remedies", facts })).toContain("low-cost");
    expect(buildVedicStyleAnswer({ question: "Will I die soon?", topic: "safety_death", facts, safetyMode: "safety" })).toContain("cannot help");
    expect(buildVedicStyleAnswer({ question: "What should the app answer if I ask for medical diagnosis?", topic: "safety_medical", facts, safetyMode: "safety" })).toContain("medical professional");
  });
});
