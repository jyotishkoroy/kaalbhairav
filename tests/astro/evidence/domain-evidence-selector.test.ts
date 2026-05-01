/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { afterEach, describe, expect, it } from "vitest";
import { routeStructuredIntent } from "../../../lib/astro/rag/structured-intent-router";
import { selectDomainEvidence } from "../../../lib/astro/evidence/domain-evidence-selector";
import type { DomainEvidenceAnchor } from "../../../lib/astro/evidence/evidence-domain-types";
import { buildReadingPlan } from "../../../lib/astro/synthesis";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function intentFor(question: string) {
  return routeStructuredIntent({ rawQuestion: question });
}

function anchor(id: string, domain: DomainEvidenceAnchor["domain"], relevanceScore = 10, deterministic = true): DomainEvidenceAnchor {
  return { id, domain, text: id, deterministic, relevanceScore, source: "chart" };
}

describe("domain evidence selector", () => {
  it("defaults to old behavior when the flag is off", () => {
    delete process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED;
    const selection = selectDomainEvidence({ intent: intentFor("Why do I feel anxious about money?"), availableAnchors: [anchor("career", "career"), anchor("money", "money")] });
    expect(selection.primaryDomain).toBe("general");
    expect(selection.weakEvidence).toBe(false);
    expect(selection.selectedAnchors.map((item) => item.id)).toEqual(["career", "money"]);
  });

  it("Lagna exact fact maps to identity domain", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("What is my Lagna?"), availableAnchors: [anchor("lagna", "identity"), anchor("sun", "planetary_placement")] });
    expect(selection.primaryDomain).toBe("identity");
    expect(selection.allowedDomains).toContain("identity");
    expect(selection.selectedAnchors.map((item) => item.id)).toEqual(["lagna"]);
  });

  it("Sun placement exact fact maps to planetary placement domain", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Where is Sun placed?"), availableAnchors: [anchor("sun", "planetary_placement")] });
    expect(selection.allowedDomains).toEqual(expect.arrayContaining(["identity", "planetary_placement"]));
    expect(selection.selectedAnchors.map((item) => item.id)).toEqual(["sun"]);
  });

  it("career stagnation selects career evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    expect(selectDomainEvidence({ intent: intentFor("Why does my career feel stuck?"), availableAnchors: [anchor("career", "career"), anchor("money", "money")] }).selectedAnchors.map((item) => item.id)).toEqual(["career"]);
  });

  it("promotion prompt selects career evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    expect(selectDomainEvidence({ intent: intentFor("I am working hard but not getting promoted."), availableAnchors: [anchor("career", "career")] }).selectedAnchors.map((item) => item.id)).toEqual(["career"]);
  });

  it("job business study choice includes career and business education secondary where available", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Should I focus on job, business, or study?"), availableAnchors: [anchor("career", "career"), anchor("business", "business"), anchor("education", "education")] });
    expect(selection.allowedDomains).toEqual(expect.arrayContaining(["career"]));
    expect(selection.selectedAnchors.map((item) => item.domain)).toEqual(expect.arrayContaining(["career", "business", "education"]));
  });

  it("money anxiety selects money evidence, not career-only evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Why do I feel anxious about money?"), availableAnchors: [anchor("career", "career"), anchor("money", "money")] });
    expect(selection.selectedAnchors.map((item) => item.domain)).toEqual(["money"]);
  });

  it("money anxiety with no money evidence returns weak evidence instead of career fallback", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Why do I feel anxious about money?"), availableAnchors: [anchor("career", "career")] });
    expect(selection.weakEvidence).toBe(true);
    expect(selection.selectedAnchors).toEqual([]);
  });

  it("money prompt explicitly about salary job may allow career income evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Why do I feel anxious about money?"), availableAnchors: [anchor("salary", "money", 5), anchor("job", "career", 9)] });
    expect(selection.selectedAnchors.map((item) => item.domain)).toEqual(["money"]);
  });

  it("business profit guarantee selects business money safety", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Can astrology guarantee business profit?"), availableAnchors: [anchor("business", "business"), anchor("money", "money"), anchor("safety", "safety"), anchor("career", "career")] });
    expect(selection.allowedDomains).toEqual(expect.arrayContaining(["business", "money", "safety"]));
    expect(selection.selectedAnchors.map((item) => item.domain)).toEqual(expect.arrayContaining(["business", "money", "safety"]));
  });

  it("risky investment prompt selects money safety", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Should I invest all my savings now?"), availableAnchors: [anchor("money", "money"), anchor("safety", "safety")] });
    expect(selection.selectedAnchors.map((item) => item.domain)).toEqual(expect.arrayContaining(["money", "safety"]));
  });

  it("relationship pattern selects relationship evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    expect(selectDomainEvidence({ intent: intentFor("What relationship pattern should I reflect on?"), availableAnchors: [anchor("relationship", "relationship"), anchor("career", "career")] }).selectedAnchors.map((item) => item.domain)).toEqual(["relationship"]);
  });

  it("relationship stability does not select career only evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("What relationship pattern should I reflect on?"), availableAnchors: [anchor("career", "career")] });
    expect(selection.weakEvidence).toBe(true);
    expect(selection.selectedAnchors).toEqual([]);
  });

  it("marriage delay selects marriage relationship evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Why is my marriage getting delayed?"), availableAnchors: [anchor("marriage", "marriage"), anchor("relationship", "relationship"), anchor("career", "career")] });
    expect(selection.allowedDomains).toEqual(expect.arrayContaining(["marriage", "relationship"]));
  });

  it("family pressure selects family evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    expect(selectDomainEvidence({ intent: intentFor("Why do I feel responsible for everyone at home?"), availableAnchors: [anchor("family", "family"), anchor("career", "career")] }).selectedAnchors.map((item) => item.domain)).toEqual(["family"]);
  });

  it("education choice selects education evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Should I continue education or start working?"), availableAnchors: [anchor("education", "education"), anchor("career", "career")] });
    expect(selection.allowedDomains).toEqual(expect.arrayContaining(["education", "career"]));
  });

  it("foreign settlement selects foreign settlement evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    expect(selectDomainEvidence({ intent: intentFor("Will I go abroad?"), availableAnchors: [anchor("foreign", "foreign_settlement"), anchor("career", "career")] }).selectedAnchors.map((item) => item.domain)).toEqual(["foreign_settlement"]);
  });

  it("sleep remedy selects remedy health adjacent evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Give me remedy for bad sleep."), availableAnchors: [anchor("remedy", "remedy"), anchor("health", "health_adjacent"), anchor("money", "money")] });
    expect(selection.allowedDomains).toEqual(expect.arrayContaining(["remedy", "health_adjacent"]));
  });

  it("remedy without spending money selects remedy and not financial risk only", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("What remedy can I do without spending money?"), availableAnchors: [anchor("remedy", "remedy"), anchor("money", "money")] });
    expect(selection.selectedAnchors.map((item) => item.domain)).toEqual(["remedy"]);
  });

  it("health diagnosis prompt selects health adjacent safety", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Can astrology diagnose my disease?"), availableAnchors: [anchor("health", "health_adjacent"), anchor("safety", "safety")] });
    expect(selection.allowedDomains).toEqual(expect.arrayContaining(["health_adjacent", "safety"]));
  });

  it("stop medical treatment mantra only selects health adjacent safety", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    expect(selectDomainEvidence({ intent: intentFor("Should I stop medical treatment and use mantra only?"), availableAnchors: [anchor("health", "health_adjacent"), anchor("safety", "safety")] }).selectedAnchors.map((item) => item.domain)).toEqual(expect.arrayContaining(["health_adjacent", "safety"]));
  });

  it("death timing selects safety", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    expect(selectDomainEvidence({ intent: intentFor("Can my chart tell when I will die?"), availableAnchors: [anchor("safety", "safety"), anchor("career", "career")] }).selectedAnchors.map((item) => item.domain)).toEqual(["safety"]);
  });

  it("lifespan question selects safety", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    expect(selectDomainEvidence({ intent: intentFor("How long will I live?"), availableAnchors: [anchor("safety", "safety")] }).primaryDomain).toBe("safety");
  });

  it("legal court prompt selects safety", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    expect(selectDomainEvidence({ intent: intentFor("Will I win my court case?"), availableAnchors: [anchor("legal", "safety"), anchor("career", "career")] }).selectedAnchors.map((item) => item.domain)).toEqual(["safety"]);
  });

  it("vague prompt selects general follow up evidence", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("What will happen?"), availableAnchors: [anchor("general", "general")] });
    expect(selection.primaryDomain).toBe("general");
  });

  it("no relevant evidence returns weak evidence true", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Why do I feel anxious about money?"), availableAnchors: [anchor("career", "career")] });
    expect(selection.weakEvidence).toBe(true);
  });

  it("max anchors is respected", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Why does my career feel stuck?"), availableAnchors: [anchor("a", "career", 9), anchor("b", "career", 8), anchor("c", "career", 7)], maxAnchors: 2 });
    expect(selection.selectedAnchors).toHaveLength(2);
  });

  it("deterministic exact fact request filters out non-deterministic anchors", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("What is my Lagna?"), availableAnchors: [anchor("lagna", "identity", 10, true), anchor("noise", "identity", 20, false)] });
    expect(selection.selectedAnchors.map((item) => item.id)).toEqual(["lagna"]);
  });

  it("relevance score sorting works", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Why does my career feel stuck?"), availableAnchors: [anchor("low", "career", 1), anchor("high", "career", 9)] });
    expect(selection.selectedAnchors.map((item) => item.id)).toEqual(["high", "low"]);
  });

  it("secondary intents refine but do not override primary domain", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: { ...intentFor("Why do I feel anxious about money?"), primaryIntent: "money", secondaryIntents: ["career"], mode: "interpretive", confidence: "high", routedFrom: "core_question" }, availableAnchors: [anchor("money", "money"), anchor("career", "career")] });
    expect(selection.primaryDomain).toBe("money");
    expect(selection.selectedAnchors.map((item) => item.domain)).toEqual(["money"]);
  });

  it("selected anchors include only allowed domains unless explicitly cross-domain relevant", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const selection = selectDomainEvidence({ intent: intentFor("Why is my marriage getting delayed?"), availableAnchors: [anchor("marriage", "marriage"), anchor("relationship", "relationship"), anchor("career", "career")] });
    expect(selection.selectedAnchors.map((item) => item.domain)).not.toContain("career");
  });

  it("builder preserves old evidence path when flag is false", () => {
    delete process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED;
    const plan = buildReadingPlan({
      question: "Why do I feel anxious about money?",
      structuredIntent: intentFor("Why do I feel anxious about money?"),
      chartAnchors: ["money anchor", "career anchor"],
    });
    expect(plan.chartTruth.chartAnchors).toEqual(["money anchor", "career anchor"]);
  });

  it("builder applies domain-aware selection when flag is true", () => {
    process.env.ASTRO_DOMAIN_AWARE_EVIDENCE_ENABLED = "true";
    const plan = buildReadingPlan({
      question: "Why do I feel anxious about money?",
      structuredIntent: intentFor("Why do I feel anxious about money?"),
      chartAnchors: ["money anchor", "career anchor"],
    });
    expect(plan.chartTruth.chartAnchors).toEqual(["money anchor"]);
  });
});
