/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { parseQuestionFrame } from "../../../lib/astro/rag/question-frame-parser";
import { routeStructuredIntent } from "../../../lib/astro/rag/structured-intent-router";

function route(rawQuestion: string) {
  return routeStructuredIntent({ rawQuestion });
}

function routeFromFrame(rawQuestion: string) {
  const questionFrame = parseQuestionFrame(rawQuestion);
  return routeStructuredIntent({ rawQuestion, questionFrame });
}

describe("structured intent router", () => {
  it("routes lagna exact fact", () => expect(route("What is my Lagna?")).toMatchObject({ primaryIntent: "exact_fact", mode: "exact_fact", confidence: "medium" }));
  it("routes lagna exact fact with safety suffix", () => expect(route("What is my Lagna? Please answer without medical, legal, or financial certainty.")).toMatchObject({ primaryIntent: "exact_fact", mode: "exact_fact", routedFrom: "core_question" }));
  it("routes sun placement exact fact", () => expect(route("Where is Sun placed?")).toMatchObject({ primaryIntent: "exact_fact", mode: "exact_fact" }));
  it("routes moon placement exact fact", () => expect(route("Where is Moon placed?")).toMatchObject({ primaryIntent: "exact_fact", mode: "exact_fact" }));
  it("routes exact chart fact prompt", () => expect(route("Tell me one exact chart fact you can verify.")).toMatchObject({ primaryIntent: "exact_fact", mode: "exact_fact" }));
  it("routes rising sign prompt to exact fact", () => expect(route("What is my rising sign?")).toMatchObject({ primaryIntent: "exact_fact", mode: "exact_fact" }));
  it("routes ascendant prompt to exact fact", () => expect(route("Which sign is my ascendant?")).toMatchObject({ primaryIntent: "exact_fact", mode: "exact_fact" }));
  it("routes without guessing prompt", () => expect(route("Can you answer one chart fact without guessing?")).toMatchObject({ primaryIntent: "exact_fact", mode: "exact_fact" }));
  it("routes money anxiety to money", () => expect(route("Why do I feel anxious about money?")).toMatchObject({ primaryIntent: "money", mode: "interpretive" }));
  it("keeps money anxiety on money with suffix", () => expect(route("Why do I feel anxious about money? Please answer without making guarantees.")).toMatchObject({ primaryIntent: "money", mode: "interpretive" }));
  it("routes business profit guarantee to business safety", () => expect(route("Can astrology guarantee business profit?")).toMatchObject({ primaryIntent: "business", mode: "safety" }));
  it("routes business profit year to business safety", () => expect(route("Can you guarantee business profit this year?")).toMatchObject({ primaryIntent: "business", mode: "safety" }));
  it("routes investment risk to financial risk safety", () => expect(route("Should I invest all my savings now?")).toMatchObject({ primaryIntent: "financial_risk", mode: "safety" }));
  it("routes risky opportunity to financial risk safety", () => expect(route("Should I take a risky financial opportunity?")).toMatchObject({ primaryIntent: "financial_risk", mode: "safety" }));
  it("routes career stuck to career", () => expect(route("Why does my career feel stuck?")).toMatchObject({ primaryIntent: "career", mode: "interpretive" }));
  it("routes no promotion to career", () => expect(route("I am working hard but not getting promoted.")).toMatchObject({ primaryIntent: "career", mode: "interpretive" }));
  it("routes job business study choice to mixed with secondary intents", () => expect(route("Should I focus on job, business, or study?")).toMatchObject({ primaryIntent: "mixed", secondaryIntents: ["job", "business", "study"] }));
  it("routes relationship pattern to relationship", () => expect(route("What relationship pattern should I reflect on?")).toMatchObject({ primaryIntent: "relationship", mode: "interpretive" }));
  it("routes relationship breaking to relationship", () => expect(route("Why do my relationships keep breaking?")).toMatchObject({ primaryIntent: "relationship", mode: "interpretive" }));
  it("routes marriage delay to marriage", () => expect(route("Why is my marriage getting delayed?")).toMatchObject({ primaryIntent: "marriage", mode: "interpretive" }));
  it("routes definite marriage soon to marriage safety", () => expect(route("Will I definitely get married soon?")).toMatchObject({ primaryIntent: "marriage", mode: "safety" }));
  it("routes marriage with family pressure", () => expect(route("Should I marry someone just because family is pressuring me?")).toMatchObject({ primaryIntent: "marriage" }));
  it("routes family pressure to family", () => expect(route("Why do I feel responsible for everyone at home?")).toMatchObject({ primaryIntent: "family", mode: "interpretive" }));
  it("routes family guilt to family", () => expect(route("Why do I carry guilt for everyone?")).toMatchObject({ primaryIntent: "family", mode: "interpretive" }));
  it("routes education versus work to education", () => expect(route("Should I continue education or start working?")).toMatchObject({ primaryIntent: "education" }));
  it("routes study next to education", () => expect(route("What should I study next?")).toMatchObject({ primaryIntent: "education", mode: "interpretive" }));
  it("routes go abroad to foreign", () => expect(route("Will I go abroad?")).toMatchObject({ primaryIntent: "foreign" }));
  it("routes foreign settlement guaranteed to safety", () => expect(route("Is foreign settlement guaranteed?")).toMatchObject({ primaryIntent: "foreign", mode: "safety" }));
  it("routes bad sleep remedy to remedy", () => expect(route("Give me remedy for bad sleep.")).toMatchObject({ primaryIntent: "remedy", mode: "remedy" }));
  it("routes remedy without spending money to remedy", () => expect(route("What remedy can I do without spending money?")).toMatchObject({ primaryIntent: "remedy", mode: "remedy" }));
  it("routes foreign settlement to foreign", () => expect(route("Is foreign settlement guaranteed?")).toMatchObject({ primaryIntent: "foreign", mode: "safety" }));
  it("routes leave india to foreign", () => expect(route("Should I leave India immediately for success?")).toMatchObject({ primaryIntent: "foreign", mode: "safety" }));
  it("routes mixed work-choice to mixed", () => expect(route("I am confused between job, business, and study.")).toMatchObject({ primaryIntent: "mixed", mode: "follow_up" }));
  it("routes stop medical treatment to health adjacent safety", () => expect(route("Should I stop medical treatment and use mantra only?")).toMatchObject({ primaryIntent: "health_adjacent", mode: "safety" }));
  it("routes disease diagnosis to health adjacent safety", () => expect(route("Can astrology diagnose my disease?")).toMatchObject({ primaryIntent: "health_adjacent", mode: "safety" }));
  it("routes death timing to death lifespan safety", () => expect(route("Can my chart tell when I will die?")).toMatchObject({ primaryIntent: "death_lifespan", mode: "safety" }));
  it("routes accident prediction to death lifespan safety", () => expect(route("Can astrology predict accidents exactly?")).toMatchObject({ primaryIntent: "death_lifespan", mode: "safety" }));
  it("routes health danger to death lifespan or health adjacent safety", () => expect(route("Is this year dangerous for my health?")).toMatchObject({ primaryIntent: "death_lifespan", mode: "safety" }));
  it("routes lifespan to death lifespan safety", () => expect(route("How long will I live?")).toMatchObject({ primaryIntent: "death_lifespan", mode: "safety" }));
  it("routes court case to legal safety", () => expect(route("Will I win my court case?")).toMatchObject({ primaryIntent: "legal", mode: "safety" }));
  it("keeps legal guarantee suffix on legal safety", () => expect(route("Can astrology guarantee my court case result? Please answer without making guarantees.")).toMatchObject({ primaryIntent: "legal", mode: "safety" }));
  it("routes vague future prompt to vague follow up", () => expect(route("What will happen?")).toMatchObject({ primaryIntent: "vague", mode: "follow_up" }));
  it("routes empty input to general low confidence", () => expect(route("   ")).toMatchObject({ primaryIntent: "general", confidence: "low", routedFrom: "fallback_raw_question" }));
  it("routes suffix only prompt to general safely", () => expect(route("Please answer without medical, legal, or financial certainty.")).toMatchObject({ primaryIntent: "general" }));
  it("ignores suffix pollution for career", () => expect(route("Why do I feel anxious about money? Please answer without making guarantees.")).not.toMatchObject({ primaryIntent: "career" }));
  it("ignores suffix pollution for relationship", () => expect(route("What relationship pattern should I reflect on? Please answer without fear-based language.")).not.toMatchObject({ primaryIntent: "career" }));
  it("ignores suffix pollution for remedy", () => expect(route("Give me remedy for bad sleep. Please answer without expensive remedies.")).not.toMatchObject({ primaryIntent: "financial_risk" }));
  it("keeps death routing with compassionate exact timing suffix", () => expect(route("Can my chart tell when I will die? Please answer compassionately, without exact timing.")).toMatchObject({ primaryIntent: "death_lifespan", mode: "safety" }));
  it("routes from supplied frame core question", () => expect(routeFromFrame("What is my Lagna? Please answer without medical, legal, or financial certainty.")).toMatchObject({ primaryIntent: "exact_fact", routedFrom: "core_question" }));
});
