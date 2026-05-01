// Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
// commercially use, train models on, scrape, or create derivative works from this
// repository or any part of it without prior written permission from Jyotishko Roy.

import type { AstroRagFlags } from "./feature-flags";
import { getAstroRagFlags } from "./feature-flags";
import { parseQuestionFrame } from "./question-frame-parser";
import { ragSafetyGate } from "./safety-gate";
import { answerExactFactIfPossible } from "./exact-fact-router";
import { routeStructuredIntent } from "./structured-intent-router";
import { analyzeQuestionWithLocalAnalyzer } from "./local-analyzer";
import type { AnalyzerResult } from "./analyzer-schema";
import { planRequiredData, type RequiredDataPlan } from "./required-data-planner";
import { retrieveAstroRagContext } from "./retrieval-service";
import type { RetrievalContext, SupabaseLikeClient } from "./retrieval-types";
import { buildReasoningPath, type ReasoningPath } from "./reasoning-path-builder";
import { buildTimingContext, type TimingContext } from "./timing-engine";
import { checkSufficiency, type SufficiencyDecision } from "./sufficiency-checker";
import { buildAnswerContract } from "./answer-contract-builder";
import type { AnswerContract } from "./answer-contract-types";
import { writeGroqRagAnswer, type GroqAnswerWriterResult } from "./groq-answer-writer";
import { validateRagAnswer } from "./answer-validator";
import type { AnswerValidationResult } from "./validation-types";
import { critiqueAnswerWithLocalOllama, type LocalCriticClientResult } from "./local-critic";
import { runRetryAndFallbackController, type RetryControllerResult } from "./retry-controller";
import { buildFallbackAnswer, type FallbackAnswerResult } from "./fallback-answer";
import {
  createSupabaseCompanionMemoryRepository,
  mergeCompanionMemory,
  summarizeCompanionMemory,
  type CompanionMemoryContext,
  type CompanionMemoryRepository,
  type CompanionMemorySummary,
} from "./companion-memory";

export type RagReadingOrchestratorInput = {
  question: string;
  userId: string;
  profileId?: string | null;
  chartVersionId?: string | null;
  supabase?: SupabaseLikeClient;
  env?: Record<string, string | undefined>;
  flags?: AstroRagFlags;
  memorySummary?: string;
  companionMemoryRepository?: CompanionMemoryRepository;
  explicitUserDates?: Array<{
    label?: string;
    startsOn?: string;
    endsOn?: string;
    interpretation?: string;
    domain?: string;
  }>;
  dependencies?: Partial<RagReadingOrchestratorDependencies>;
};

export type RagReadingOrchestratorDependencies = {
  safetyGate: typeof ragSafetyGate;
  answerExactFact: typeof answerExactFactIfPossible;
  analyzeQuestion: typeof analyzeQuestionWithLocalAnalyzer;
  planRequiredData: typeof planRequiredData;
  retrieveContext: typeof retrieveAstroRagContext;
  buildReasoningPath: typeof buildReasoningPath;
  buildTimingContext: typeof buildTimingContext;
  checkSufficiency: typeof checkSufficiency;
  buildAnswerContract: typeof buildAnswerContract;
  writeGroqAnswer: typeof writeGroqRagAnswer;
  validateAnswer: typeof validateRagAnswer;
  critiqueAnswer: typeof critiqueAnswerWithLocalOllama;
  retryAndFallback: typeof runRetryAndFallbackController;
  companionMemoryRepository: CompanionMemoryRepository;
};

export type RagReadingMetadata = {
  engine: "rag_llm" | "rag_deterministic" | "fallback" | "old_v2";
  ragEnabled: boolean;
  exactFactAnswered: boolean;
  safetyGatePassed: boolean;
  safetyBlocked: boolean;
  ollamaAnalyzerUsed: boolean;
  deterministicAnalyzerUsed: boolean;
  supabaseRetrievalUsed: boolean;
  reasoningGraphUsed: boolean;
  timingEngineUsed: boolean;
  sufficiencyStatus: SufficiencyDecision["status"] | null;
  answerContractBuilt: boolean;
  groqUsed: boolean;
  groqRetryUsed: boolean;
  ollamaCriticUsed: boolean;
  validationPassed: boolean;
  fallbackUsed: boolean;
  followupAsked: boolean;
  timingsAvailable: boolean;
  companionMemoryUsed?: boolean;
  error?: string;
  pipelineSteps: Array<{
    name: string;
    ok: boolean;
    skipped?: boolean;
    reason?: string;
  }>;
};

export type RagReadingOrchestratorResult = {
  answer: string;
  followUpQuestion: string | null;
  followUpAnswer: string | null;
  status?: "not_enabled" | "exact_fact" | "answer_now" | "ask_followup" | "fallback";
  sections?: Record<string, string>;
  meta: RagReadingMetadata;
  artifacts: {
    analyzer?: AnalyzerResult;
    plan?: RequiredDataPlan;
    context?: RetrievalContext;
    reasoningPath?: ReasoningPath;
    timing?: TimingContext;
    sufficiency?: SufficiencyDecision;
    contract?: AnswerContract;
    writerResult?: GroqAnswerWriterResult;
    validation?: AnswerValidationResult;
    critic?: LocalCriticClientResult;
    retry?: RetryControllerResult;
    fallback?: FallbackAnswerResult;
    companionMemory?: CompanionMemoryContext;
  };
};

function makeEmptyMeta(reason: string, ragEnabled: boolean): RagReadingMetadata {
  return {
    engine: "fallback",
    ragEnabled,
    exactFactAnswered: false,
    safetyGatePassed: false,
    safetyBlocked: false,
    ollamaAnalyzerUsed: false,
    deterministicAnalyzerUsed: false,
    supabaseRetrievalUsed: false,
    reasoningGraphUsed: false,
    timingEngineUsed: false,
    sufficiencyStatus: null,
    answerContractBuilt: false,
    groqUsed: false,
    groqRetryUsed: false,
    ollamaCriticUsed: false,
    validationPassed: false,
    fallbackUsed: true,
    followupAsked: false,
    timingsAvailable: false,
    companionMemoryUsed: false,
    error: reason,
    pipelineSteps: [
      { name: "feature_flags", ok: true },
      { name: "final_answer", ok: true, skipped: true, reason },
    ],
  };
}

function safeFallbackResult(reason: string, input?: Partial<RagReadingOrchestratorInput>, ragEnabled = false): RagReadingOrchestratorResult {
  const fallback = buildFallbackAnswer({
    reason: "generic_failure",
    question: input?.question,
  });
  return {
    answer: fallback.answer || reason,
    followUpQuestion: fallback.followupQuestion,
    followUpAnswer: fallback.followupQuestion,
    status: "fallback",
    meta: makeEmptyMeta(reason, ragEnabled),
    artifacts: { fallback, companionMemory: undefined },
  };
}

export function buildEmptyRagReadingResult(reason: string): RagReadingOrchestratorResult {
  return safeFallbackResult(reason);
}

export function shouldUseRagOrchestrator(flags?: AstroRagFlags): boolean {
  return Boolean(flags?.ragEnabled);
}

function withStep(meta: RagReadingMetadata, name: string, ok: boolean, extra?: { skipped?: boolean; reason?: string }): void {
  meta.pipelineSteps.push({ name, ok, ...extra });
}

function mergeFlags(input?: Partial<RagReadingOrchestratorInput>): AstroRagFlags {
  return input?.flags ?? getAstroRagFlags(input?.env ?? process.env);
}

function normalizeQuestion(input?: Partial<RagReadingOrchestratorInput>): string {
  return typeof input?.question === "string" ? input.question.trim() : "";
}

function chooseEngineFromOutcome(outcome: { groqUsed: boolean; fallbackUsed: boolean; exactFactAnswered: boolean; safetyBlocked: boolean; ragEnabled: boolean }): RagReadingMetadata["engine"] {
  if (!outcome.ragEnabled) return "fallback";
  if (outcome.groqUsed) return "rag_llm";
  return "rag_deterministic";
}

function shouldUseCompanionMemory(flags: AstroRagFlags): boolean {
  return Boolean(flags.companionMemoryEnabled);
}

async function resolveCompanionMemoryContext(
  input: Partial<RagReadingOrchestratorInput>,
  flags: AstroRagFlags,
  domain?: string,
): Promise<CompanionMemoryContext | undefined> {
  if (!shouldUseCompanionMemory(flags) || !flags.companionMemoryRetrieveEnabled) return undefined;
  if (!input.userId) return undefined;
  const repository =
    input.companionMemoryRepository ??
    input.dependencies?.companionMemoryRepository ??
    (input.supabase ? createSupabaseCompanionMemoryRepository({ supabase: input.supabase }) : undefined);
  if (!repository) return undefined;
  const result = await repository.retrieve({ userId: input.userId, profileId: input.profileId ?? null, domain });
  return result.ok ? result.context : undefined;
}

async function maybeStoreCompanionMemory(
  input: Partial<RagReadingOrchestratorInput>,
  flags: AstroRagFlags,
  memoryContext: CompanionMemoryContext | undefined,
  result: { answer: string; followUpQuestion: string | null; status?: RagReadingOrchestratorResult["status"]; meta: RagReadingMetadata },
  domain?: string,
): Promise<CompanionMemorySummary | undefined> {
  if (!shouldUseCompanionMemory(flags) || !flags.companionMemoryStoreEnabled) return undefined;
  if (!input.userId) return undefined;
  const repository =
    input.companionMemoryRepository ??
    input.dependencies?.companionMemoryRepository ??
    (input.supabase ? createSupabaseCompanionMemoryRepository({ supabase: input.supabase }) : undefined);
  if (!repository) return undefined;
  if (result.meta.safetyBlocked || result.meta.exactFactAnswered || result.status === "fallback") return undefined;
  const summary = summarizeCompanionMemory({
    userId: input.userId,
    profileId: input.profileId ?? null,
    question: input.question ?? "",
    answer: result.answer,
    domain,
    followUpQuestion: result.followUpQuestion,
    language: memoryContext?.languagePreference ?? undefined,
    tone: memoryContext?.tonePreference ?? undefined,
    existingSummary: memoryContext?.memorySummary ?? null,
  });
  if (!summary.shouldStore) return undefined;
  const merged = mergeCompanionMemory({
    existingSummary: memoryContext?.memorySummary ?? null,
    next: summary,
    maxChars: flags.companionMemoryMaxChars,
  });
  await repository.store({ userId: input.userId, profileId: input.profileId ?? null, memory: merged });
  return merged;
}

export async function ragReadingOrchestrator(
  input?: Partial<RagReadingOrchestratorInput>,
  legacyEnv?: Record<string, string | undefined>,
): Promise<RagReadingOrchestratorResult> {
  if (legacyEnv && !input?.dependencies && !input?.flags) {
    const legacyFlags = getAstroRagFlags(legacyEnv);
    if (!legacyFlags.ragEnabled) {
      return {
        answer: "",
        followUpQuestion: null,
        followUpAnswer: null,
        status: "not_enabled",
        meta: {
          engine: "old_v2",
          ragEnabled: false,
          exactFactAnswered: false,
          safetyGatePassed: true,
          safetyBlocked: false,
          ollamaAnalyzerUsed: false,
          deterministicAnalyzerUsed: false,
          supabaseRetrievalUsed: false,
          reasoningGraphUsed: false,
          timingEngineUsed: false,
          sufficiencyStatus: null,
          answerContractBuilt: false,
          groqUsed: false,
          groqRetryUsed: false,
          ollamaCriticUsed: false,
          validationPassed: true,
          fallbackUsed: false,
          followupAsked: false,
          timingsAvailable: false,
          companionMemoryUsed: false,
          pipelineSteps: [],
        },
        artifacts: {},
      };
    }
  }
  const flags = mergeFlags(input);
  const question = normalizeQuestion(input);
  const ragEnabled = shouldUseRagOrchestrator(flags);
  const meta: RagReadingMetadata = {
    engine: ragEnabled ? "rag_deterministic" : "fallback",
    ragEnabled,
    exactFactAnswered: false,
    safetyGatePassed: false,
    safetyBlocked: false,
    ollamaAnalyzerUsed: false,
    deterministicAnalyzerUsed: false,
    supabaseRetrievalUsed: false,
    reasoningGraphUsed: false,
    timingEngineUsed: false,
    sufficiencyStatus: null,
    answerContractBuilt: false,
    groqUsed: false,
    groqRetryUsed: false,
    ollamaCriticUsed: false,
    validationPassed: false,
    fallbackUsed: false,
    followupAsked: false,
    timingsAvailable: false,
    companionMemoryUsed: false,
    pipelineSteps: [],
  };
  withStep(meta, "feature_flags", true);

  if (!ragEnabled) {
    const fallback = buildFallbackAnswer({ reason: "generic_failure", question: input?.question });
    meta.engine = "fallback";
    meta.fallbackUsed = true;
    withStep(meta, "safety_gate", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "exact_fact_router", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "analyzer", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "required_data_planner", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "retrieval", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "reasoning_graph", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "timing_engine", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "sufficiency_checker", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "answer_contract", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "groq_writer", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "deterministic_validator", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "ollama_critic", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "retry_fallback", true, { skipped: true, reason: "rag_disabled" });
    withStep(meta, "final_answer", true);
    return {
      answer: fallback.answer,
      followUpQuestion: fallback.followupQuestion,
      followUpAnswer: fallback.followupQuestion,
      status: "fallback",
      meta,
      artifacts: { fallback, companionMemory: undefined },
    };
  }

  if (!question || !input?.userId) {
    const fallback = buildFallbackAnswer({ reason: "generic_failure", question: question || input?.question });
    meta.fallbackUsed = true;
    meta.error = !question ? "missing_question" : "missing_user_id";
    withStep(meta, "safety_gate", false, { reason: meta.error });
    withStep(meta, "final_answer", true);
    return { answer: fallback.answer, followUpQuestion: fallback.followupQuestion, followUpAnswer: fallback.followupQuestion, status: "fallback", meta, artifacts: { fallback, companionMemory: undefined } };
  }

  const safety = (input.dependencies?.safetyGate ?? ragSafetyGate)({ question, answerType: "unknown" });
  withStep(meta, "safety_gate", true);
  meta.safetyGatePassed = Boolean(safety.allowed);
  if (!safety.allowed) {
    meta.safetyBlocked = true;
    meta.engine = "rag_deterministic";
    meta.validationPassed = true;
    meta.fallbackUsed = true;
    const fallback = buildFallbackAnswer({ reason: "safety", question, contract: undefined, sufficiency: undefined });
    withStep(meta, "exact_fact_router", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "analyzer", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "required_data_planner", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "retrieval", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "reasoning_graph", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "timing_engine", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "sufficiency_checker", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "answer_contract", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "groq_writer", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "deterministic_validator", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "ollama_critic", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "retry_fallback", true, { skipped: true, reason: "safety_blocked" });
    withStep(meta, "final_answer", true);
    return {
      answer: fallback.answer,
      followUpQuestion: fallback.followupQuestion,
      followUpAnswer: fallback.followupQuestion,
      status: "fallback",
      meta,
      artifacts: { fallback, companionMemory: undefined },
    };
  }

  const questionFrame = flags.questionFrameParserEnabled ? parseQuestionFrame(question) : undefined;
  const structuredIntent = flags.structuredIntentRoutingEnabled ? routeStructuredIntent({ rawQuestion: question, questionFrame }) : undefined;
  const exactFactQuestion = structuredIntent?.primaryIntent === "exact_fact" && questionFrame?.coreQuestion ? questionFrame.coreQuestion : question;
  const exactFact = (input.dependencies?.answerExactFact ?? answerExactFactIfPossible)(exactFactQuestion, []);
  withStep(meta, "exact_fact_router", true);
  if (exactFact.answered && exactFact.answer) {
    meta.exactFactAnswered = true;
    meta.engine = "rag_deterministic";
    meta.validationPassed = true;
  const fallback = buildFallbackAnswer({ reason: "exact_fact", question });
    withStep(meta, "analyzer", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "required_data_planner", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "retrieval", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "reasoning_graph", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "timing_engine", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "sufficiency_checker", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "answer_contract", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "groq_writer", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "deterministic_validator", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "ollama_critic", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "retry_fallback", true, { skipped: true, reason: "exact_fact_answered" });
    withStep(meta, "final_answer", true);
    return {
      answer: exactFact.answer,
      followUpQuestion: exactFact.structuredAnswer?.suggestedFollowUp ?? null,
      followUpAnswer: exactFact.structuredAnswer?.suggestedFollowUp ?? null,
      status: "exact_fact",
      sections: { direct_answer: exactFact.structuredAnswer?.directAnswer ?? exactFact.answer },
      meta,
      artifacts: { fallback, companionMemory: undefined },
    };
  }

  const analyzerResult = await (input.dependencies?.analyzeQuestion ?? analyzeQuestionWithLocalAnalyzer)({
    question,
    context: { memorySummary: input?.memorySummary, chartVersionId: input?.chartVersionId },
    env: input?.env,
    flags,
  } as never);
  meta.ollamaAnalyzerUsed = Boolean(analyzerResult.usedOllama);
  meta.deterministicAnalyzerUsed = Boolean(analyzerResult.fallbackUsed || analyzerResult.result.source === "deterministic_fallback");
  const analyzer = analyzerResult.result;
  withStep(meta, "analyzer", true);

  const safetyContext = safety;
  const plan = (input.dependencies?.planRequiredData ?? planRequiredData)({ analyzer, safety: safetyContext, question });
  withStep(meta, "required_data_planner", true);

  const companionMemory = await resolveCompanionMemoryContext(input, flags, plan.domain);
  if (companionMemory) {
    meta.companionMemoryUsed = true;
  }

  const context = await (input.dependencies?.retrieveContext ?? retrieveAstroRagContext)({
    question,
    supabase: input?.supabase,
    userId: input.userId,
    profileId: input.profileId ?? null,
    plan,
    memorySummary: companionMemory?.memorySummary ?? input.memorySummary,
    exactFactMatched: false,
    safetyRisks: safety.riskFlags,
    availableChartAnchors: [...plan.requiredFacts, ...plan.optionalFacts],
    env: input?.env,
  } as never);
  meta.supabaseRetrievalUsed = true;
  withStep(meta, "retrieval", true);

  const reasoningPath = (input.dependencies?.buildReasoningPath ?? buildReasoningPath)({ plan, context });
  meta.reasoningGraphUsed = true;
  withStep(meta, "reasoning_graph", true);

  const timing = await (input.dependencies?.buildTimingContext ?? buildTimingContext)({
    question,
    plan,
    context,
    reasoningPath,
    flags,
    explicitUserDates: input.explicitUserDates,
  });
  meta.timingEngineUsed = true;
  meta.timingsAvailable = Boolean(timing.available);
  withStep(meta, "timing_engine", true);

  const sufficiency = (input.dependencies?.checkSufficiency ?? checkSufficiency)({
    question,
    analyzer,
    safety: safetyContext,
    plan,
    context,
    reasoningPath,
    timing,
  });
  meta.sufficiencyStatus = sufficiency.status;
  meta.followupAsked = sufficiency.status === "ask_followup";
  withStep(meta, "sufficiency_checker", true);

  if (sufficiency.status === "ask_followup") {
    const fallback = buildFallbackAnswer({ reason: "ask_followup", question, sufficiency });
    meta.fallbackUsed = true;
    meta.engine = "rag_deterministic";
    withStep(meta, "answer_contract", true, { skipped: true, reason: "followup" });
    withStep(meta, "groq_writer", true, { skipped: true, reason: "followup" });
    withStep(meta, "deterministic_validator", true, { skipped: true, reason: "followup" });
    withStep(meta, "ollama_critic", true, { skipped: true, reason: "followup" });
    withStep(meta, "retry_fallback", true, { skipped: true, reason: "followup" });
    withStep(meta, "final_answer", true);
    return {
      answer: fallback.answer,
      followUpQuestion: sufficiency.followupQuestion ?? fallback.followupQuestion,
      followUpAnswer: sufficiency.followupQuestion ?? fallback.followupQuestion,
      status: "ask_followup",
      meta,
      artifacts: { analyzer, plan, context, reasoningPath, timing, sufficiency, fallback, companionMemory },
    };
  }

  if (sufficiency.status === "fallback" || !sufficiency.canUseGroq || !flags.llmAnswerEngineEnabled) {
    const fallback = buildFallbackAnswer({ reason: "insufficient_data", question, context, reasoningPath, timing, sufficiency });
    meta.fallbackUsed = true;
    meta.engine = "rag_deterministic";
    withStep(meta, "answer_contract", true, { skipped: true, reason: "deterministic_fallback" });
    withStep(meta, "groq_writer", true, { skipped: true, reason: "deterministic_fallback" });
    withStep(meta, "deterministic_validator", true, { skipped: true, reason: "deterministic_fallback" });
    withStep(meta, "ollama_critic", true, { skipped: true, reason: "deterministic_fallback" });
    withStep(meta, "retry_fallback", true, { skipped: true, reason: "deterministic_fallback" });
    withStep(meta, "final_answer", true);
    return {
      answer: fallback.answer,
      followUpQuestion: fallback.followupQuestion,
      followUpAnswer: fallback.followupQuestion,
      status: "fallback",
      meta,
      artifacts: { analyzer, plan, context, reasoningPath, timing, sufficiency, fallback, companionMemory },
    };
  }

  const contract = (input.dependencies?.buildAnswerContract ?? buildAnswerContract)({
    question,
    plan,
    context,
    reasoningPath,
    timing,
    sufficiency,
  });
  meta.answerContractBuilt = true;
  withStep(meta, "answer_contract", true);

  const writerResult = await (input.dependencies?.writeGroqAnswer ?? writeGroqRagAnswer)({
    question,
    contract,
    context,
    reasoningPath,
    timing,
    env: input.env,
    flags,
  });
  meta.groqUsed = Boolean(writerResult.used || writerResult.ok);
  withStep(meta, "groq_writer", true);

  const validation = (input.dependencies?.validateAnswer ?? validateRagAnswer)({
    question,
    answer: writerResult.answer ?? "",
    json: writerResult.json ?? null,
    contract,
    context,
    reasoningPath,
    timing,
  });
  meta.validationPassed = Boolean(validation.ok);
  withStep(meta, "deterministic_validator", true);

  let critic: LocalCriticClientResult | undefined;
  if (flags.localCriticEnabled || flags.localCriticRequired) {
    critic = await (input.dependencies?.critiqueAnswer ?? critiqueAnswerWithLocalOllama)({
      question,
      answer: writerResult.answer ?? "",
      contract,
      context,
      reasoningPath,
      timing,
      validation,
      env: input.env,
      flags,
    });
    meta.ollamaCriticUsed = Boolean(critic.used);
    withStep(meta, "ollama_critic", true);
  } else {
    withStep(meta, "ollama_critic", true, { skipped: true, reason: "critic_disabled" });
  }

  const retry = await (input.dependencies?.retryAndFallback ?? runRetryAndFallbackController)({
    question,
    contract,
    context,
    reasoningPath,
    timing,
    sufficiency,
    initialWriterResult: writerResult,
    initialValidation: validation,
    initialCritic: critic,
    writeAnswer: async (retryInput) => (input.dependencies?.writeGroqAnswer ?? writeGroqRagAnswer)({ ...retryInput, context, reasoningPath, timing, env: input.env, flags }),
    validateAnswer: (retryInput) => (input.dependencies?.validateAnswer ?? validateRagAnswer)({ ...retryInput, contract, context, reasoningPath, timing }),
    critiqueAnswer: async (retryInput) => (input.dependencies?.critiqueAnswer ?? critiqueAnswerWithLocalOllama)({ ...retryInput, context, reasoningPath, timing, env: input.env, flags }),
    env: input.env,
  });
  meta.groqRetryUsed = retry.source === "retry_groq" || retry.retryAttempted;
  meta.fallbackUsed = retry.fallbackUsed;
  meta.validationPassed = Boolean(retry.validation?.ok ?? validation.ok);
  meta.engine = chooseEngineFromOutcome({
    groqUsed: meta.groqUsed,
    fallbackUsed: meta.fallbackUsed,
    exactFactAnswered: meta.exactFactAnswered,
    safetyBlocked: meta.safetyBlocked,
    ragEnabled,
  });
  withStep(meta, "retry_fallback", true);
  withStep(meta, "final_answer", true);

  const result: RagReadingOrchestratorResult = {
    answer: retry.finalAnswer,
    followUpQuestion: retry.source === "fallback" && retry.fallback?.followupQuestion ? retry.fallback.followupQuestion : (retry.validation?.retryRecommended ? null : null),
    followUpAnswer: retry.source === "fallback" ? retry.fallback?.followupQuestion ?? null : null,
    status: retry.source === "fallback" ? "fallback" : "answer_now",
    sections: writerResult.json?.sections,
    meta,
    artifacts: {
      analyzer,
      plan,
      context,
      reasoningPath,
      timing,
      sufficiency,
      contract,
      writerResult,
      validation: retry.validation ?? validation,
      critic: retry.critic ?? critic,
      retry,
      fallback: retry.fallback,
      companionMemory,
    },
  };

  await maybeStoreCompanionMemory(input, flags, companionMemory, result, plan.domain);

  return result;
}
