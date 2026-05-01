/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

export type ConnectorStatus =
  | "called:pass"
  | "called:fail"
  | "skipped:not_required"
  | "skipped:disabled"
  | "skipped:exact_fact"
  | "skipped:safety_gate"
  | "unavailable"
  | "fallback"
  | "unknown";

export type ConnectorName =
  | "api_route"
  | "question_frame"
  | "structured_router"
  | "supabase"
  | "oracle_python"
  | "exact_fact_engine"
  | "groq"
  | "ollama_analyzer"
  | "ollama_critic"
  | "safety"
  | "remedy_engine"
  | "premium_gate"
  | "fallback"
  | "final_composer"
  | "final_validator";

export type ConnectorEvent = {
  connector: ConnectorName;
  status: ConnectorStatus;
  called: boolean;
  succeeded: boolean;
  skipped: boolean;
  disabled: boolean;
  failed: boolean;
  fallbackUsed: boolean;
  reason?: string;
  notes: string[];
};

export type ConnectorCaseReport = {
  number: number;
  id: string;
  prompt: string;
  category: string;
  result: "pass" | "fail" | "warning" | "known_excluded";
  failures: string[];
  warnings: string[];
  knownExcluded: boolean;
  httpStatus: number | null;
  finalAnswer: string;
  answerSummary: string;
  connectors: Record<ConnectorName, ConnectorEvent>;
};

export type ConnectorRunReport = {
  baseUrl: string;
  createdAt: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    knownExcluded: number;
    networkBlocked: number;
    authRequired: number;
  };
  connectorMatrix: Record<ConnectorName, {
    called: number;
    succeeded: number;
    skipped: number;
    disabled: number;
    failed: number;
    fallbackUsed: number;
    notes: string[];
  }>;
  cases: ConnectorCaseReport[];
};

const CONNECTOR_NAMES: ConnectorName[] = [
  "api_route",
  "question_frame",
  "structured_router",
  "supabase",
  "oracle_python",
  "exact_fact_engine",
  "groq",
  "ollama_analyzer",
  "ollama_critic",
  "safety",
  "remedy_engine",
  "premium_gate",
  "fallback",
  "final_composer",
  "final_validator",
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asBool(value: unknown): boolean {
  return value === true;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function event(input: {
  connector: ConnectorName;
  status: ConnectorStatus;
  called?: boolean;
  succeeded?: boolean;
  skipped?: boolean;
  disabled?: boolean;
  failed?: boolean;
  fallbackUsed?: boolean;
  reason?: string;
  notes?: string[];
}): ConnectorEvent {
  return {
    connector: input.connector,
    status: input.status,
    called: input.called ?? false,
    succeeded: input.succeeded ?? false,
    skipped: input.skipped ?? false,
    disabled: input.disabled ?? false,
    failed: input.failed ?? false,
    fallbackUsed: input.fallbackUsed ?? false,
    reason: input.reason,
    notes: input.notes ?? [],
  };
}

export function summarizeAnswer(answer: string): string {
  const compact = answer.replace(/\s+/g, " ").trim();
  return compact.length <= 260 ? compact : `${compact.slice(0, 257)}...`;
}

export function buildConnectorEventsFromTrace(input: {
  trace: unknown;
  httpStatus: number | null;
  answer: string;
  category: string;
  knownExcluded?: boolean;
}): Record<ConnectorName, ConnectorEvent> {
  const trace = asRecord(input.trace);
  const questionFrame = asRecord(trace.questionFrame);
  const structuredIntent = asRecord(trace.structuredIntent);
  const supabase = asRecord(trace.supabase);
  const oracle = asRecord(trace.oracle);
  const exactFacts = asRecord(trace.exactFacts);
  const providers = asRecord(trace.providers);
  const groq = asRecord(providers.groq);
  const ollama = asRecord(providers.ollama);
  const fallbackTrace = asRecord(trace.fallback);
  const safety = asRecord(trace.safety);
  const finalComposer = asRecord(trace.finalComposer);
  const finalValidator = asRecord(trace.finalValidator);

  const answer = input.answer;
  const isPremiumGate = answer.includes("Guru of guru (premium version) needed for predictions more than 3years");
  const isRemedyCase = input.category === "remedy" || input.category === "health_sleep" || /\bremedy\b/i.test(answer);

  const apiSucceeded = input.httpStatus !== null && input.httpStatus >= 200 && input.httpStatus < 300;
  const qfAttempted = asBool(questionFrame.attempted);
  const qfUsed = asBool(questionFrame.used);
  const routerAttempted = asBool(structuredIntent.attempted);
  const routerUsed = asBool(structuredIntent.used);
  const supabaseCalled = asBool(supabase.attempted) || asBool(supabase.chartProfileLookupAttempted);
  const supabaseLoaded = asBool(supabase.chartProfileLoaded);
  const supabaseSource = asString(supabase.chartProfileSource);
  const oracleRequired = asBool(oracle.required);
  const oracleCalled = asBool(oracle.called);
  const oracleSucceeded = asBool(oracle.succeeded);
  const exactAttempted = asBool(exactFacts.attempted);
  const exactAnswered = asBool(exactFacts.answered);
  const exactLlmUsed = asBool(exactFacts.llmUsed);
  const groqCalled = asBool(groq.called);
  const groqAllowed = asBool(groq.allowed);
  const groqFallback = asBool(groq.fallbackUsed);
  const ollamaEnabled = asBool(ollama.enabled);
  const ollamaCalled = asBool(ollama.called);
  const ollamaReachable = asBool(ollama.reachable);
  const fallbackUsed = asBool(fallbackTrace.used);
  const fallbackReason = asString(fallbackTrace.reason);
  const safetyAttempted = asBool(safety.attempted);
  const safetyRan = asBool(safety.ran);
  const composerAttempted = asBool(finalComposer.attempted);
  const composerRan = asBool(finalComposer.ran);
  const validatorAttempted = asBool(finalValidator.attempted);
  const validatorRan = asBool(finalValidator.ran);
  const validatorPassed = asBool(finalValidator.passed);

  return {
    api_route: event({
      connector: "api_route",
      status: apiSucceeded ? "called:pass" : "called:fail",
      called: input.httpStatus !== null,
      succeeded: apiSucceeded,
      failed: !apiSucceeded,
      reason: input.httpStatus === null ? "no_http_status" : `http_${input.httpStatus}`,
    }),

    question_frame: event({
      connector: "question_frame",
      status: qfUsed ? "called:pass" : qfAttempted ? "called:fail" : "unknown",
      called: qfAttempted,
      succeeded: qfUsed,
      failed: qfAttempted && !qfUsed,
      skipped: !qfAttempted,
      reason: qfAttempted ? undefined : "not_observed_in_trace",
    }),

    structured_router: event({
      connector: "structured_router",
      status: routerUsed ? "called:pass" : routerAttempted ? "called:fail" : "unknown",
      called: routerAttempted,
      succeeded: routerUsed,
      failed: routerAttempted && !routerUsed,
      skipped: !routerAttempted,
      reason: routerAttempted ? undefined : "not_observed_in_trace",
    }),

    supabase: event({
      connector: "supabase",
      status: supabaseLoaded ? "called:pass" : supabaseCalled ? "called:fail" : "unknown",
      called: supabaseCalled,
      succeeded: supabaseLoaded,
      failed: supabaseCalled && !supabaseLoaded,
      skipped: !supabaseCalled,
      fallbackUsed: supabaseSource === "fallback",
      reason: asString(supabase.errorCode) ?? supabaseSource,
    }),

    oracle_python: event({
      connector: "oracle_python",
      status: oracleCalled && oracleSucceeded
        ? "called:pass"
        : oracleRequired && oracleCalled && !oracleSucceeded
          ? "called:fail"
          : oracleRequired && !oracleCalled
            ? "unavailable"
            : "skipped:not_required",
      called: oracleCalled,
      succeeded: oracleSucceeded,
      failed: oracleRequired && (!oracleCalled || !oracleSucceeded),
      skipped: !oracleRequired,
      reason: asString(oracle.skippedReason) ?? asString(oracle.errorCode) ?? (oracleRequired ? undefined : "not_required"),
    }),

    exact_fact_engine: event({
      connector: "exact_fact_engine",
      status: exactAnswered && !exactLlmUsed
        ? "called:pass"
        : exactAttempted && !exactAnswered
          ? "called:fail"
          : "skipped:not_required",
      called: exactAttempted,
      succeeded: exactAnswered && !exactLlmUsed,
      failed: exactAttempted && (!exactAnswered || exactLlmUsed),
      skipped: !exactAttempted,
      reason: asString(exactFacts.source),
      notes: exactLlmUsed ? ["exact_fact_used_llm"] : [],
    }),

    groq: event({
      connector: "groq",
      status: groqCalled && !groqFallback
        ? "called:pass"
        : groqFallback
          ? "fallback"
          : asString(groq.skippedReason) === "exact_fact_deterministic"
            ? "skipped:exact_fact"
            : "skipped:not_required",
      called: groqCalled,
      succeeded: groqCalled && !groqFallback,
      failed: false,
      skipped: !groqCalled,
      fallbackUsed: groqFallback,
      reason: asString(groq.skippedReason) ?? (groqAllowed ? undefined : "not_allowed_or_not_required"),
    }),

    ollama_analyzer: event({
      connector: "ollama_analyzer",
      status: !ollamaEnabled
        ? "skipped:disabled"
        : ollamaCalled
          ? "called:pass"
          : ollamaReachable === false
            ? "unavailable"
            : "skipped:not_required",
      called: ollamaCalled,
      succeeded: ollamaCalled,
      skipped: !ollamaCalled,
      disabled: !ollamaEnabled,
      failed: ollamaEnabled && !ollamaCalled && ollamaReachable === false,
      reason: asString(ollama.skippedReason) ?? (!ollamaEnabled ? "disabled" : undefined),
    }),

    ollama_critic: event({
      connector: "ollama_critic",
      status: !ollamaEnabled
        ? "skipped:disabled"
        : ollamaCalled
          ? "called:pass"
          : ollamaReachable === false
            ? "unavailable"
            : "skipped:not_required",
      called: ollamaCalled,
      succeeded: ollamaCalled,
      skipped: !ollamaCalled,
      disabled: !ollamaEnabled,
      failed: ollamaEnabled && !ollamaCalled && ollamaReachable === false,
      reason: asString(ollama.skippedReason) ?? (!ollamaEnabled ? "disabled" : undefined),
    }),

    safety: event({
      connector: "safety",
      status: safetyRan ? "called:pass" : safetyAttempted ? "called:fail" : "unknown",
      called: safetyAttempted || safetyRan,
      succeeded: safetyRan,
      failed: safetyAttempted && !safetyRan,
      skipped: !(safetyAttempted || safetyRan),
      reason: asString(safety.action),
    }),

    remedy_engine: event({
      connector: "remedy_engine",
      status: isRemedyCase ? "called:pass" : "skipped:not_required",
      called: isRemedyCase,
      succeeded: isRemedyCase,
      skipped: !isRemedyCase,
      reason: isRemedyCase ? "remedy_or_sleep_case" : "not_required",
    }),

    premium_gate: event({
      connector: "premium_gate",
      status: isPremiumGate ? "called:pass" : "skipped:not_required",
      called: isPremiumGate,
      succeeded: isPremiumGate,
      skipped: !isPremiumGate,
      reason: isPremiumGate ? "long_horizon_prediction_gate" : "not_required",
    }),

    fallback: event({
      connector: "fallback",
      status: fallbackUsed ? "fallback" : "skipped:not_required",
      called: fallbackUsed,
      succeeded: fallbackUsed,
      skipped: !fallbackUsed,
      fallbackUsed,
      reason: fallbackReason ?? (fallbackUsed ? "missing_fallback_reason" : "not_required"),
      failed: fallbackUsed && !fallbackReason,
    }),

    final_composer: event({
      connector: "final_composer",
      status: composerRan ? "called:pass" : composerAttempted ? "called:fail" : "unknown",
      called: composerAttempted || composerRan,
      succeeded: composerRan,
      failed: composerAttempted && !composerRan,
      skipped: !(composerAttempted || composerRan),
      reason: asString(finalComposer.gateReason),
    }),

    final_validator: event({
      connector: "final_validator",
      status: validatorRan && validatorPassed
        ? "called:pass"
        : validatorRan && !validatorPassed
          ? "called:fail"
          : validatorAttempted
            ? "called:fail"
            : "unknown",
      called: validatorAttempted || validatorRan,
      succeeded: validatorRan && validatorPassed,
      failed: (validatorAttempted || validatorRan) && !validatorPassed,
      skipped: !(validatorAttempted || validatorRan),
    }),
  };
}

export function buildConnectorMatrix(cases: ConnectorCaseReport[]): ConnectorRunReport["connectorMatrix"] {
  const matrix = Object.fromEntries(
    CONNECTOR_NAMES.map((connector) => [
      connector,
      {
        called: 0,
        succeeded: 0,
        skipped: 0,
        disabled: 0,
        failed: 0,
        fallbackUsed: 0,
        notes: [] as string[],
      },
    ]),
  ) as ConnectorRunReport["connectorMatrix"];

  for (const caseReport of cases) {
    for (const connector of CONNECTOR_NAMES) {
      const current = caseReport.connectors[connector];
      const aggregate = matrix[connector];

      if (current.called) aggregate.called += 1;
      if (current.succeeded) aggregate.succeeded += 1;
      if (current.skipped) aggregate.skipped += 1;
      if (current.disabled) aggregate.disabled += 1;
      if (current.failed) aggregate.failed += 1;
      if (current.fallbackUsed) aggregate.fallbackUsed += 1;
      if (current.reason) aggregate.notes.push(`${caseReport.id}: ${current.reason}`);
    }
  }

  return matrix;
}

export function connectorNames(): ConnectorName[] {
  return [...CONNECTOR_NAMES];
}
