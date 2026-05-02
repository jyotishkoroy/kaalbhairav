/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import type { ConsultationState } from "./consultation-state";

export type ConsultationMemoryStatus =
  | "idle"
  | "collecting_context"
  | "follow_up_asked"
  | "final_answer_ready";

export type ConsultationMemoryState =
  | {
      readonly status: "idle";
    }
  | {
      readonly status: "collecting_context";
      readonly state: ConsultationState;
    }
  | {
      readonly status: "follow_up_asked";
      readonly state: ConsultationState;
      readonly followUpQuestion: string;
    }
  | {
      readonly status: "final_answer_ready";
      readonly state: ConsultationState;
    };

export type FollowUpMergeInput = {
  readonly sessionId: string;
  readonly answer: string;
};

export type EphemeralConsultationMemoryStore = {
  readonly get: (sessionId: string) => ConsultationMemoryState;
  readonly begin: (sessionId: string, state: ConsultationState) => ConsultationMemoryState;
  readonly markFollowUpAsked: (sessionId: string, followUpQuestion: string) => ConsultationMemoryState;
  readonly mergeFollowUpAnswer: (input: FollowUpMergeInput) => ConsultationMemoryState;
  readonly markFinalAnswerReady: (sessionId: string) => ConsultationMemoryState;
  readonly clear: (sessionId: string) => ConsultationMemoryState;
  readonly clearAll: () => void;
  readonly hasActiveState: (sessionId: string) => boolean;
};

const DEFAULT_SESSION_ID = "anonymous-consultation-session";
const MAX_FOLLOW_UP_ANSWER_CHARS = 600;

export function normalizeConsultationSessionId(sessionId: string | undefined | null): string {
  const normalized = String(sessionId ?? "").trim();
  return normalized.length > 0 ? normalized : DEFAULT_SESSION_ID;
}

export function createIdleConsultationMemoryState(): ConsultationMemoryState {
  return { status: "idle" };
}

export function createEphemeralConsultationMemoryStore(): EphemeralConsultationMemoryStore {
  const memory = new Map<string, ConsultationMemoryState>();

  return {
    get(sessionId: string): ConsultationMemoryState {
      return memory.get(normalizeConsultationSessionId(sessionId)) ?? createIdleConsultationMemoryState();
    },
    begin(sessionId: string, state: ConsultationState): ConsultationMemoryState {
      const normalizedSessionId = normalizeConsultationSessionId(sessionId);
      const storedState = cloneStateForSession(state);
      const nextState: ConsultationMemoryState = {
        status: "collecting_context",
        state: storedState,
      };
      memory.set(normalizedSessionId, nextState);
      return nextState;
    },
    markFollowUpAsked(sessionId: string, followUpQuestion: string): ConsultationMemoryState {
      const normalizedSessionId = normalizeConsultationSessionId(sessionId);
      const current = memory.get(normalizedSessionId);
      if (!current || current.status === "idle") {
        return createIdleConsultationMemoryState();
      }
      if (current.status === "follow_up_asked") {
        return current;
      }

      const nextState: ConsultationMemoryState = {
        status: "follow_up_asked",
        state: withFollowUpAsked(current.state, followUpQuestion),
        followUpQuestion,
      };
      memory.set(normalizedSessionId, nextState);
      return nextState;
    },
    mergeFollowUpAnswer(input: FollowUpMergeInput): ConsultationMemoryState {
      const normalizedSessionId = normalizeConsultationSessionId(input.sessionId);
      const current = memory.get(normalizedSessionId);
      if (!current || current.status !== "follow_up_asked") {
        return current ?? createIdleConsultationMemoryState();
      }

      const normalizedAnswer = normalizeAnswer(input.answer);
      if (normalizedAnswer.length === 0) {
        return current;
      }

      const nextState: ConsultationMemoryState = {
        status: "follow_up_asked",
        followUpQuestion: current.followUpQuestion,
        state: mergeFollowUpAnswerIntoState(current.state, normalizedAnswer),
      };
      memory.set(normalizedSessionId, nextState);
      return nextState;
    },
    markFinalAnswerReady(sessionId: string): ConsultationMemoryState {
      const normalizedSessionId = normalizeConsultationSessionId(sessionId);
      const current = memory.get(normalizedSessionId);
      if (!current || current.status === "idle") {
        return createIdleConsultationMemoryState();
      }

      const nextState: ConsultationMemoryState = {
        status: "final_answer_ready",
        state: current.state,
      };
      memory.set(normalizedSessionId, nextState);
      return nextState;
    },
    clear(sessionId: string): ConsultationMemoryState {
      const normalizedSessionId = normalizeConsultationSessionId(sessionId);
      memory.delete(normalizedSessionId);
      return createIdleConsultationMemoryState();
    },
    clearAll(): void {
      memory.clear();
    },
    hasActiveState(sessionId: string): boolean {
      const current = memory.get(normalizeConsultationSessionId(sessionId));
      return current?.status === "collecting_context" || current?.status === "follow_up_asked" || current?.status === "final_answer_ready";
    },
  };
}

const defaultEphemeralConsultationMemoryStore = createEphemeralConsultationMemoryStore();

export function getEphemeralConsultationState(sessionId: string): ConsultationMemoryState {
  return defaultEphemeralConsultationMemoryStore.get(sessionId);
}

export function beginEphemeralConsultation(
  sessionId: string,
  state: ConsultationState,
): ConsultationMemoryState {
  return defaultEphemeralConsultationMemoryStore.begin(sessionId, state);
}

export function markEphemeralFollowUpAsked(
  sessionId: string,
  followUpQuestion: string,
): ConsultationMemoryState {
  return defaultEphemeralConsultationMemoryStore.markFollowUpAsked(sessionId, followUpQuestion);
}

export function mergeEphemeralFollowUpAnswer(input: FollowUpMergeInput): ConsultationMemoryState {
  return defaultEphemeralConsultationMemoryStore.mergeFollowUpAnswer(input);
}

export function markEphemeralFinalAnswerReady(sessionId: string): ConsultationMemoryState {
  return defaultEphemeralConsultationMemoryStore.markFinalAnswerReady(sessionId);
}

export function clearEphemeralConsultationState(sessionId: string): ConsultationMemoryState {
  return defaultEphemeralConsultationMemoryStore.clear(sessionId);
}

export function clearAllEphemeralConsultationStates(): void {
  defaultEphemeralConsultationMemoryStore.clearAll();
}

function cloneStateForSession(state: ConsultationState): ConsultationState {
  return {
    ...state,
    intent: {
      ...state.intent,
      secondary: [...state.intent.secondary],
    },
    chartFacts: state.chartFacts
      ? {
          ...state.chartFacts,
          facts: [...state.chartFacts.facts],
        }
      : state.chartFacts,
    lifeStory: { ...state.lifeStory },
    emotionalState: { ...state.emotionalState },
    culturalFamilyContext: { ...state.culturalFamilyContext },
    practicalConstraints: { ...state.practicalConstraints },
    followUp: { ...state.followUp },
    patternRecognition: state.patternRecognition ? { ...state.patternRecognition } : state.patternRecognition,
    timingJudgement: state.timingJudgement ? { ...state.timingJudgement } : state.timingJudgement,
    remedyPlan: state.remedyPlan
      ? {
          ...state.remedyPlan,
          remedies: [...state.remedyPlan.remedies],
          avoid: [...state.remedyPlan.avoid],
        }
      : state.remedyPlan,
    responsePlan: state.responsePlan ? { ...state.responsePlan } : state.responsePlan,
  };
}

function withFollowUpAsked(state: ConsultationState, followUpQuestion: string): ConsultationState {
  const followUp = state.followUp;
  return {
    ...state,
    followUp: {
      ...followUp,
      allowed: false,
      alreadyAsked: true,
      question: followUp.question ?? followUpQuestion,
      reason: followUp.reason ?? "follow_up_asked",
    },
  };
}

function mergeFollowUpAnswerIntoState(state: ConsultationState, answer: string): ConsultationState {
  return {
    ...state,
    lifeStory: {
      ...state.lifeStory,
      currentSituation: buildMergedCurrentSituation(state.lifeStory.currentSituation, answer),
    },
    followUp: {
      ...state.followUp,
      allowed: false,
      alreadyAsked: true,
    },
  };
}

function buildMergedCurrentSituation(existing: string | undefined, answer: string): string {
  const normalizedAnswer = normalizeAnswer(answer);
  const answerText = normalizedAnswer.length > MAX_FOLLOW_UP_ANSWER_CHARS
    ? `${normalizedAnswer.slice(0, MAX_FOLLOW_UP_ANSWER_CHARS)}...`
    : normalizedAnswer;
  const followUpText = `Follow-up answer: ${answerText}`;
  const normalizedExisting = normalizeAnswer(existing ?? "");
  if (normalizedExisting.length === 0) return followUpText;
  return `${normalizedExisting} ${followUpText}`.trim();
}

function normalizeAnswer(answer: string): string {
  return String(answer ?? "").trim().replace(/\s+/g, " ");
}
