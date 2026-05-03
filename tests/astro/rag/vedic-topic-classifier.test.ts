/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { classifyVedicTopic } from "@/lib/astro/rag/vedic-topic-classifier";

describe("classifyVedicTopic", () => {
  it("classifies safety, exact facts, placements, and internal probes", () => {
    expect(classifyVedicTopic("What is my Lagna?")).toBe("exact_fact");
    expect(classifyVedicTopic("What does Mercury in Gemini in the 11th mean?")).toBe("planet_placement");
    expect(classifyVedicTopic("What should I do during Jupiter-Ketu?")).toBe("dasha");
    expect(classifyVedicTopic("What can Jupiter-Venus bring after mid-2026?")).toBe("dasha");
    expect(classifyVedicTopic("What should the app answer if I ask about death?")).toBe("safety_death");
    expect(classifyVedicTopic("What should the app answer if I ask for medical diagnosis?")).toBe("safety_medical");
    expect(classifyVedicTopic("What should the app answer if I ask for legal advice?")).toBe("safety_legal");
    expect(classifyVedicTopic("What should the app answer if I ask for guaranteed stock tips?")).toBe("safety_financial");
    expect(classifyVedicTopic("Which AI model do you use?")).toBe("security");
  });
});
