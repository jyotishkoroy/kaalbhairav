/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { buildVedicRetrievalQuery } from "@/lib/astro/rag/vedic-retrieval-query";

describe("buildVedicRetrievalQuery", () => {
  const facts = { lagnaSign: "Leo", moonSign: "Gemini", moonHouse: 11, sunSign: "Taurus", sunHouse: 10 };
  it("adds career anchors", () => expect(buildVedicRetrievalQuery({ question: "career?", topic: "career", chartFacts: facts })).toContain("10th house"));
  it("adds relationship anchors", () => expect(buildVedicRetrievalQuery({ question: "relationship?", topic: "relationship", chartFacts: facts })).toContain("7th house"));
  it("adds finance anchors", () => expect(buildVedicRetrievalQuery({ question: "finance?", topic: "finance", chartFacts: facts })).toContain("2nd house"));
  it("does not invent missing chart facts", () => expect(buildVedicRetrievalQuery({ question: "career?", topic: "career", chartFacts: {} })).not.toContain("Leo"));
  it("stays concise", () => expect(buildVedicRetrievalQuery({ question: "career?", topic: "career", chartFacts: facts }).length).toBeLessThan(400));
});
