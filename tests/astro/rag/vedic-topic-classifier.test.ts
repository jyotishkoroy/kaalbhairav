/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { classifyVedicTopic } from "@/lib/astro/rag/vedic-topic-classifier";

describe("classifyVedicTopic", () => {
  it("classifies representative VedicQA questions", () => {
    expect(classifyVedicTopic("What is my Nakshatra?")).toBe("exact_fact");
    expect(classifyVedicTopic("Which Mahadasha am I running now?")).toBe("exact_fact");
    expect(classifyVedicTopic("What does Sun in the 10th house mean for career?")).toBe("career");
    expect(classifyVedicTopic("What does Mercury in Gemini in the 11th mean?")).toBe("exact_fact");
    expect(classifyVedicTopic("Why do I overthink?")).toBe("mind");
    expect(classifyVedicTopic("What kind of partner suits me?")).toBe("relationship");
    expect(classifyVedicTopic("What is my finance pattern?")).toBe("finance");
    expect(classifyVedicTopic("What should I do during Jupiter-Ketu?")).toBe("timing");
    expect(classifyVedicTopic("What can Jupiter-Venus bring after mid-2026?")).toBe("timing");
    expect(classifyVedicTopic("What should the app answer if I ask for guaranteed stock tips?")).toBe("safety_financial");
  });
});
