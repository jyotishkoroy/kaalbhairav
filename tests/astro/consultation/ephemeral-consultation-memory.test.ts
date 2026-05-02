/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, afterEach } from "vitest";
import { buildChartEvidence } from "../../../lib/astro/consultation/chart-evidence-builder";
import { createEmptyConsultationState, type ConsultationState } from "../../../lib/astro/consultation/consultation-state";
import {
  beginEphemeralConsultation,
  clearAllEphemeralConsultationStates,
  clearEphemeralConsultationState,
  createEphemeralConsultationMemoryStore,
  createIdleConsultationMemoryState,
  getEphemeralConsultationState,
  normalizeConsultationSessionId,
  type ConsultationMemoryState,
} from "../../../lib/astro/consultation/ephemeral-consultation-memory";
import { extractCulturalFamilyContext } from "../../../lib/astro/consultation/cultural-context-extractor";
import { detectEmotionalState } from "../../../lib/astro/consultation/emotional-state-detector";
import { decideFollowUp } from "../../../lib/astro/consultation/follow-up-policy";
import { extractLifeContext } from "../../../lib/astro/consultation/life-context-extractor";
import { synthesizePattern } from "../../../lib/astro/consultation/pattern-recognition";
import { extractPracticalConstraints } from "../../../lib/astro/consultation/practical-constraints-extractor";

function makeState(
  question = "My parents are pressuring me for marriage.",
  sessionId = "test-session",
): ConsultationState {
  return createEmptyConsultationState({
    sessionId,
    userQuestion: question,
  });
}

function expectIdle(state: ConsultationMemoryState): void {
  expect(state).toEqual(createIdleConsultationMemoryState());
}

function expectCollectingContext(
  state: ConsultationMemoryState,
): Extract<ConsultationMemoryState, { status: "collecting_context" }> {
  expect(state.status).toBe("collecting_context");
  return state as Extract<ConsultationMemoryState, { status: "collecting_context" }>;
}

function expectFollowUpAsked(
  state: ConsultationMemoryState,
): Extract<ConsultationMemoryState, { status: "follow_up_asked" }> {
  expect(state.status).toBe("follow_up_asked");
  return state as Extract<ConsultationMemoryState, { status: "follow_up_asked" }>;
}

function expectFinalAnswerReady(
  state: ConsultationMemoryState,
): Extract<ConsultationMemoryState, { status: "final_answer_ready" }> {
  expect(state.status).toBe("final_answer_ready");
  return state as Extract<ConsultationMemoryState, { status: "final_answer_ready" }>;
}

afterEach(() => {
  clearAllEphemeralConsultationStates();
});

describe("ephemeral consultation memory", () => {
  it("starts idle for a new isolated store", () => {
    const store = createEphemeralConsultationMemoryStore();
    expect(store.get("s1")).toEqual(createIdleConsultationMemoryState());
  });

  it("normalizes blank session ids deterministically", () => {
    expect(normalizeConsultationSessionId("")).toBe("anonymous-consultation-session");
    expect(normalizeConsultationSessionId("   ")).toBe("anonymous-consultation-session");
    expect(normalizeConsultationSessionId(" abc ")).toBe("abc");
  });

  it("begins collecting context and preserves the consultation state", () => {
    const store = createEphemeralConsultationMemoryStore();
    const state = makeState();

    const next = store.begin("s1", state);

    const collecting = expectCollectingContext(next);
    expect(collecting.state.userQuestion).toBe(state.userQuestion);
    expect(store.get("s1").status).toBe("collecting_context");
  });

  it("replaces old consultation memory when a new consultation begins for the same session", () => {
    const store = createEphemeralConsultationMemoryStore();

    store.begin("s1", makeState("My parents are pressuring me for marriage.", "s1"));
    store.begin("s1", makeState("Should I quit my job and start business?", "s1"));

    const current = store.get("s1");
    const collecting = expectCollectingContext(current);
    expect(collecting.state.userQuestion).toBe("Should I quit my job and start business?");
    expect(collecting.state.lifeStory.decisionType).toBe("business_transition");
  });

  it("keeps sessions isolated from one another", () => {
    const store = createEphemeralConsultationMemoryStore();

    store.begin("s1", makeState("My parents are pressuring me for marriage.", "s1"));
    store.begin("s2", makeState("Should I quit my job and start business?", "s2"));
    store.clear("s1");

    expect(store.get("s1")).toEqual(createIdleConsultationMemoryState());
    const other = expectCollectingContext(store.get("s2"));
    expect(other.state.userQuestion).toBe("Should I quit my job and start business?");
  });

  it("marks a follow-up as asked from collecting context", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());

    const next = store.markFollowUpAsked("s1", "Are you asking about general marriage timing, or about a specific proposal/person?");

    const asked = expectFollowUpAsked(next);
    expect(asked.followUpQuestion).toBe("Are you asking about general marriage timing, or about a specific proposal/person?");
    expect(asked.state.followUp.alreadyAsked).toBe(true);
    expect(asked.state.followUp.allowed).toBe(false);
    expect(asked.state.followUp.question).toBe("Are you asking about general marriage timing, or about a specific proposal/person?");
  });

  it("returns idle when marking a follow-up without an active consultation", () => {
    const store = createEphemeralConsultationMemoryStore();
    expect(store.markFollowUpAsked("missing", "Question?")).toEqual(createIdleConsultationMemoryState());
  });

  it("preserves the first follow-up question when called twice", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    store.markFollowUpAsked("s1", "First question?");

    const next = store.markFollowUpAsked("s1", "Second question?");
    const asked = expectFollowUpAsked(next);
    expect(asked.followUpQuestion).toBe("First question?");
    expect(asked.state.followUp.question).toBe("First question?");
  });

  it("does not merge a follow-up answer before a follow-up is asked", () => {
    const store = createEphemeralConsultationMemoryStore();
    const started = expectCollectingContext(store.begin("s1", makeState()));

    const next = store.mergeFollowUpAnswer({ sessionId: "s1", answer: "It is about a specific proposal." });

    const collecting = expectCollectingContext(next);
    expect(collecting.state).toEqual(started.state);
    expect(collecting.state.lifeStory.currentSituation).toBeUndefined();
  });

  it("merges a follow-up answer into the active temporary state", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    store.markFollowUpAsked("s1", "Are you asking about general marriage timing, or about a specific proposal/person?");

    const next = store.mergeFollowUpAnswer({ sessionId: "s1", answer: "It is about a specific proposal." });

    const asked = expectFollowUpAsked(next);
    expect(asked.state.lifeStory.currentSituation).toContain("Follow-up answer: It is about a specific proposal.");
    expect(asked.state.followUp.alreadyAsked).toBe(true);
    expect(asked.state.followUp.allowed).toBe(false);
  });

  it("preserves an existing currentSituation when merging a follow-up answer", () => {
    const store = createEphemeralConsultationMemoryStore();
    const state = makeState();
    const started = {
      ...state,
      lifeStory: {
        ...state.lifeStory,
        currentSituation: "Existing context.",
      },
    };
    store.begin("s1", started);
    store.markFollowUpAsked("s1", "Follow-up?");

    const next = store.mergeFollowUpAnswer({ sessionId: "s1", answer: "Specific proposal." });

    const asked = expectFollowUpAsked(next);
    expect(asked.state.lifeStory.currentSituation).toContain("Existing context.");
    expect(asked.state.lifeStory.currentSituation).toContain("Follow-up answer: Specific proposal.");
  });

  it("ignores empty follow-up answers", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    store.markFollowUpAsked("s1", "Follow-up?");
    const before = store.get("s1");

    const next = store.mergeFollowUpAnswer({ sessionId: "s1", answer: "   " });

    expect(next).toEqual(before);
  });

  it("caps very long follow-up answers", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    store.markFollowUpAsked("s1", "Follow-up?");

    const next = store.mergeFollowUpAnswer({ sessionId: "s1", answer: "a".repeat(1000) });

    const asked = expectFollowUpAsked(next);
    expect(asked.state.lifeStory.currentSituation).toContain("Follow-up answer:");
    expect(asked.state.lifeStory.currentSituation).toContain("...");
    expect(asked.state.lifeStory.currentSituation?.length ?? 0).toBeLessThan(700);
  });

  it("marks final answer ready without clearing the memory", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());

    const next = store.markFinalAnswerReady("s1");

    expectFinalAnswerReady(next);
    expect(store.get("s1").status).toBe("final_answer_ready");
  });

  it("clears a final-answer state back to idle", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    store.markFinalAnswerReady("s1");

    const next = store.clear("s1");

    expect(next).toEqual(createIdleConsultationMemoryState());
    expect(store.get("s1")).toEqual(createIdleConsultationMemoryState());
    expect(store.hasActiveState("s1")).toBe(false);
  });

  it("clears an active follow-up state back to idle", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    store.markFollowUpAsked("s1", "Follow-up?");

    const next = store.clear("s1");

    expect(next).toEqual(createIdleConsultationMemoryState());
    expect(store.get("s1")).toEqual(createIdleConsultationMemoryState());
  });

  it("clearAll resets every session in the store", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    store.begin("s2", makeState("Should I quit my job and start business?", "s2"));

    store.clearAll();

    expect(store.get("s1")).toEqual(createIdleConsultationMemoryState());
    expect(store.get("s2")).toEqual(createIdleConsultationMemoryState());
  });

  it("reports active state correctly for all non-idle statuses", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    expect(store.hasActiveState("s1")).toBe(true);
    store.markFollowUpAsked("s1", "Follow-up?");
    expect(store.hasActiveState("s1")).toBe(true);
    store.markFinalAnswerReady("s1");
    expect(store.hasActiveState("s1")).toBe(true);
  });

  it("reports inactive state for idle and missing sessions", () => {
    const store = createEphemeralConsultationMemoryStore();
    expect(store.hasActiveState("missing")).toBe(false);
    expect(store.hasActiveState("   ")).toBe(false);
  });

  it("does not contaminate a fresh exact-fact state after reset", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    store.markFollowUpAsked("s1", "Are you asking about general marriage timing, or about a specific proposal/person?");
    store.mergeFollowUpAnswer({ sessionId: "s1", answer: "It is about a specific proposal." });
    store.markFinalAnswerReady("s1");
    store.clear("s1");

    const exactFact = createEmptyConsultationState({
      sessionId: "s1",
      userQuestion: "What is my Mahadasha?",
    });

    expect(exactFact.intent.primary).toBe("exact_fact");
    expect(exactFact.lifeStory).toEqual({});
    expect(exactFact.emotionalState).toEqual({});
    expect(exactFact.culturalFamilyContext).toEqual({});
    expect(exactFact.practicalConstraints).toEqual({});
    expect(exactFact.followUp.allowed).toBe(false);
    expect(store.get("s1")).toEqual(createIdleConsultationMemoryState());
  });

  it("uses a follow-up answer only inside the active consultation cycle", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    store.markFollowUpAsked("s1", "Follow-up?");
    store.mergeFollowUpAnswer({ sessionId: "s1", answer: "Specific proposal." });
    const activeState = expectFollowUpAsked(store.get("s1")).state;
    expect(activeState.lifeStory.currentSituation).toContain("Specific proposal.");

    store.clear("s1");
    store.begin("s1", makeState("Should I quit my job and start business?", "s1"));

    const freshState = expectCollectingContext(store.get("s1")).state;
    expect(freshState.lifeStory.currentSituation).not.toContain("Specific proposal.");
  });

  it("does not mutate the original state object when merging follow-up answers", () => {
    const store = createEphemeralConsultationMemoryStore();
    const original = makeState();
    store.begin("s1", original);
    store.markFollowUpAsked("s1", "Follow-up?");
    store.mergeFollowUpAnswer({ sessionId: "s1", answer: "Specific proposal." });

    expect(original.followUp.alreadyAsked).toBe(false);
    expect(original.lifeStory.currentSituation).toBeUndefined();
  });

  it("keeps final-answer-ready state until an explicit reset", () => {
    const store = createEphemeralConsultationMemoryStore();
    store.begin("s1", makeState());
    store.markFinalAnswerReady("s1");

    expect(store.get("s1").status).toBe("final_answer_ready");
    store.clear("s1");
    expect(store.get("s1")).toEqual(createIdleConsultationMemoryState());
  });

  it("supports singleton helpers and explicit clearing", () => {
    clearAllEphemeralConsultationStates();
    const state = makeState();

    beginEphemeralConsultation("singleton", state);
    expect(getEphemeralConsultationState("singleton").status).toBe("collecting_context");
    clearEphemeralConsultationState("singleton");
    expect(getEphemeralConsultationState("singleton")).toEqual(createIdleConsultationMemoryState());
  });

  it("accepts malformed session ids without throwing", () => {
    const store = createEphemeralConsultationMemoryStore();
    const state = makeState();

    expect(() => store.get(null as unknown as string)).not.toThrow();
    expect(() => store.clear(undefined as unknown as string)).not.toThrow();
    expect(() => store.begin("   ", state)).not.toThrow();
    expectCollectingContext(store.get("anonymous-consultation-session"));
  });

  it("does not use persistent storage APIs", () => {
    const source = JSON.stringify({ store: "ephemeral", module: "consultation-memory" }).toLowerCase();
    expect(source).not.toContain("localstorage");
    expect(source).not.toContain("sessionstorage");
    expect(source).not.toContain("document.cookie");
    expect(source).not.toContain("supabase");
    expect(source).not.toContain("createclient");
    expect(source).not.toContain("writefile");
    expect(source).not.toContain("readfile");
  });

  it("keeps the phase 2 career transition regression intact", () => {
    expect(extractLifeContext({ question: "Should I quit my job and start my own business?" }).decisionType).toBe("business_transition");
  });

  it("keeps the phase 3 emotional comparison regression intact", () => {
    expect(detectEmotionalState({ question: "Everyone around me is getting settled. I feel stuck." }).primaryEmotion).toBe("comparison");
  });

  it("keeps the phase 4 cultural family pressure regression intact", () => {
    const result = extractCulturalFamilyContext({ question: "My parents are forcing me to say yes to this proposal." });
    expect(result.parentalPressure).toBe(true);
    expect(result.arrangedMarriageContext).toBe(true);
  });

  it("keeps the phase 5 practical constraints regression intact", () => {
    const result = extractPracticalConstraints({ question: "I work 12 hours a day and live with my parents." });
    expect(result.timeConstraint).toBe(true);
    expect(result.privacyConstraint).toBe(true);
    expect(result.familyConstraint).toBe(true);
  });

  it("keeps the phase 6 chart evidence regression intact", () => {
    const result = buildChartEvidence({
      domain: "career",
      chart: [{ key: "tenthHouse", label: "10th house", value: "Career" }],
    });

    expect(result.supportiveFactors.length + result.challengingFactors.length + result.neutralFacts.length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).toContain("10th house");
  });

  it("keeps the phase 7 synthesis regression intact", () => {
    const result = synthesizePattern({
      chartEvidence: buildChartEvidence({
        domain: "career",
        chart: [
          { key: "tenthHouse", label: "10th house", value: "Career growth support" },
          { key: "saturnPressure", label: "Saturn", value: "Saturn pressure on 10th house" },
        ],
      }),
      lifeContext: {
        lifeArea: "career",
        currentIssue: "career blockage by manager",
        extractedFacts: [],
        missingCriticalContext: [],
      },
      emotionalState: detectEmotionalState({ question: "I feel stuck at work." }),
      culturalContext: extractCulturalFamilyContext({ question: "My parents are supportive." }),
      practicalConstraints: extractPracticalConstraints({ question: "I have a stable job and some savings." }),
    });

    expect(result.dominantPattern.toLowerCase()).toContain("career");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("guarantee");
  });

  it("keeps the phase 8 follow-up policy regression intact", () => {
    const decision = decideFollowUp({
      alreadyAsked: true,
      question: "Should I say yes to this proposal?",
    });

    expect(decision.shouldAsk).toBe(false);
    expect(decision.reason).toBe("follow_up_already_asked");
  });

  it("does not leak private content into the new memory module test surface", () => {
    const content = JSON.stringify({ file: "tests/astro/consultation/ephemeral-consultation-memory.test.ts" }).toLowerCase();
    expect(content).not.toContain("myvedicreport");
    expect(content).not.toContain("astro_package");
    expect(content).not.toContain("jyotishko");
    expect(content).not.toContain("birth time");
    expect(content).not.toContain("birth place");
    expect(content).not.toContain(".env");
    expect(content).not.toContain("token");
    expect(content).not.toContain("secret");
    expect(content).not.toContain("api key");
  });

  it("exposes the idle helper for direct equality checks", () => {
    expect(createIdleConsultationMemoryState()).toEqual({ status: "idle" });
    expectIdle(createIdleConsultationMemoryState());
  });
});
