/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it } from "vitest";
import { createEmptyConsultationState } from "../../../lib/astro/consultation/consultation-state";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";

describe("extractLifeContext", () => {
  it("detects career blockage by manager", () => {
    const result = extractLifeContext({ question: "I feel stuck in my job. My manager keeps blocking me. Should I leave?" });
    expect(result.lifeArea).toBe("career");
    expect(result.currentIssue).toBe("career blockage by manager");
    expect(result.decisionType).toBe("job_switch_or_stay");
    expect(result.desiredOutcome).toBe("growth and recognition");
    expect(result.extractedFacts.map((fact) => fact.fact)).toContain("User feels blocked by manager");
    expect(result.missingCriticalContext).toEqual(expect.arrayContaining(["whether user has another offer", "financial runway"]));
  });

  it("detects promotion anxiety", () => {
    const result = extractLifeContext({ question: "I am not getting promoted even though I work hard." });
    expect(result.lifeArea).toBe("career");
    expect(result.currentIssue).toBe("career stagnation or promotion anxiety");
    expect(result.desiredOutcome).toBe("growth and recognition");
    expect(result.extractedFacts[0]?.fact).toContain("promotion anxiety");
  });

  it("detects business transition", () => {
    const result = extractLifeContext({ question: "Should I quit my job and start my own business?" });
    expect(result.lifeArea).toBe("career");
    expect(result.currentIssue).toBe("job versus business transition decision");
    expect(result.decisionType).toBe("business_transition");
    expect(result.missingCriticalContext).toEqual(expect.arrayContaining(["whether the business has been tested with real customers", "financial runway"]));
  });

  it("detects marriage pressure and unreadiness", () => {
    const result = extractLifeContext({ question: "My parents are pressuring me for marriage but I am not ready." });
    expect(result.lifeArea).toBe("marriage");
    expect(result.currentIssue).toBe("family pressure for marriage despite inner unreadiness");
    expect(result.decisionType).toBe("marriage_readiness");
    expect(result.desiredOutcome).toBe("clarity and reduced pressure");
    expect(result.extractedFacts.map((fact) => fact.fact)).toEqual(expect.arrayContaining([
      "Parents are pressuring user for marriage",
      "User does not feel ready for marriage",
    ]));
  });

  it("detects proposal confusion as marriage context without timing synthesis", () => {
    const result = extractLifeContext({ question: "My parents are forcing me to say yes to this proposal." });
    expect(result.lifeArea).toBe("marriage");
    expect(result.currentIssue).toBe("family pressure for marriage despite inner unreadiness");
    expect(result.decisionType).toBe("marriage_readiness");
  });

  it("detects relationship uncertainty", () => {
    const result = extractLifeContext({ question: "Should I continue this relationship or break up?" });
    expect(result.lifeArea).toBe("relationship");
    expect(result.currentIssue).toBe("relationship uncertainty");
    expect(result.decisionType).toBe("relationship_continue_or_end");
  });

  it("detects emotionally unavailable partner language as relationship context", () => {
    const result = extractLifeContext({ question: "Why do I keep attracting emotionally unavailable partners?" });
    expect(result.lifeArea).toBe("relationship");
    expect(result.currentIssue).toBe("relationship uncertainty");
    expect(result.decisionType).toBe("relationship_continue_or_end");
  });

  it("detects money stress", () => {
    const result = extractLifeContext({ question: "I have debt and money stress. I cannot save." });
    expect(result.lifeArea).toBe("money");
    expect(result.currentIssue).toBe("financial stress or money pressure");
    expect(result.decisionType).toBe("financial_stability_guidance");
    expect(result.desiredOutcome).toBe("financial stability and clarity");
  });

  it("detects family duty conflict", () => {
    const result = extractLifeContext({ question: "My family responsibilities are blocking my own life decisions." });
    expect(result.lifeArea).toBe("family");
    expect(result.currentIssue).toBe("family duty versus personal desire");
    expect(result.decisionType).toBe("family_responsibility_decision");
  });

  it("detects health anxiety", () => {
    const result = extractLifeContext({ question: "I am worried about my health and hospital reports." });
    expect(result.lifeArea).toBe("health");
    expect(result.currentIssue).toBe("health anxiety or health-related concern");
    expect(result.decisionType).toBe("health_reflection");
    expect(result.missingCriticalContext).toEqual(expect.arrayContaining(["whether user has already consulted a qualified medical professional"]));
    expect(result.extractedFacts.map((fact) => fact.fact)).toContain("User is worried about health");
  });

  it("detects spiritual confusion", () => {
    const result = extractLifeContext({ question: "I feel lost spiritually and my prayer is not working." });
    expect(result.lifeArea).toBe("spirituality");
    expect(result.currentIssue).toBe("spiritual confusion or loss of direction");
    expect(result.decisionType).toBe("spiritual_clarity");
    expect(result.desiredOutcome).toBe("inner clarity and steadiness");
  });

  it("handles empty input without throwing", () => {
    const result = extractLifeContext({ question: "     " });
    expect(result.extractedFacts).toEqual([]);
    expect(result.missingCriticalContext).toEqual(expect.arrayContaining(["user question"]));
  });

  it("keeps general ambiguity conservative", () => {
    const result = extractLifeContext({ question: "I feel stuck and confused." });
    expect(result.lifeArea).toBe("general");
    expect(result.extractedFacts.length).toBeGreaterThanOrEqual(0);
  });

  it("uses previous ephemeral context for short follow-up questions", () => {
    const previous = createEmptyConsultationState({ userQuestion: "I feel stuck in my job. My manager keeps blocking me." });
    const result = extractLifeContext({ question: "Should I leave?", previousEphemeralContext: previous });
    expect(result.lifeArea).toBe("career");
    expect(result.decisionType).toBe("job_switch_or_stay");
  });

  it("lets explicit new text override previous context", () => {
    const previous = createEmptyConsultationState({ userQuestion: "My parents are pressuring me for marriage." });
    const result = extractLifeContext({ question: "I have debt and money stress.", previousEphemeralContext: previous });
    expect(result.lifeArea).toBe("money");
  });
});
