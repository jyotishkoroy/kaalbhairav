# Phase 1 - Ollama Listening Analyzer

## Goal
Add a listening-only analyzer that classifies the user's topic, emotional tone, emotional need, missing context, safety risks, follow-up need, and humanization hints before any reading work begins.

## Position in Pipeline
This layer sits before the reading pipeline. It listens first, then either returns structured context or falls back deterministically.

## Files Added
- `lib/astro/listening/listening-types.ts`
- `lib/astro/listening/listening-analyzer.ts`
- `lib/astro/listening/listening-prompts.ts`
- `lib/astro/listening/listening-fallback.ts`
- `lib/astro/listening/listening-policy.ts`
- `lib/astro/listening/index.ts`
- `tests/astro/listening/listening-analyzer.test.ts`
- `tests/astro/listening/listening-fallback.test.ts`
- `tests/astro/listening/listening-policy.test.ts`

## Feature Flags
- `ASTRO_LISTENING_ANALYZER_ENABLED=false` by default.
- `ASTRO_COMPANION_PIPELINE_ENABLED=false` by default.
- `ASTRO_RAG_ENABLED` alone does not enable the listener.
- `ASTRO_LOCAL_ANALYZER_ENABLED` alone does not enable the listener.

## Local Model / Router Behavior
- Listener requests use the Phase 27 local model router path.
- `qwen2.5:3b` remains the default model.
- `qwen2.5:7b` is not the default path.
- Production does not require Ollama.

## Deterministic Fallback
- The listener falls back without network access.
- Invalid JSON, timeout, client error, or unsafe output all return deterministic fallback output.

## Safety-Risk Mapping
- Listening risks are mapped into existing safety metadata for downstream compatibility.
- Death, medical, legal, financial guarantee, self-harm, curse fear, expensive remedy pressure, pregnancy, and deterministic prediction are covered.

## What Ollama May Do
- Classify the question.
- Summarize emotional context.
- Identify missing context.
- Flag safety concerns.
- Suggest follow-up needs.

## What Ollama Must Not Do
- Listening analyzer does not answer the user.
- Listening analyzer does not invent chart facts.
- Listening analyzer does not predict events.
- Listening analyzer does not recommend remedies.

## Tests Run
- `tests/astro/listening/listening-analyzer.test.ts`
- `tests/astro/listening/listening-fallback.test.ts`
- `tests/astro/listening/listening-policy.test.ts`
- Existing RAG regression tests remain intact.

## Runtime Behavior Changed
- No production behavior change by default.
- Listener is disabled unless `ASTRO_LISTENING_ANALYZER_ENABLED=true`.

## UI Changed
- No.

## DB Changed
- No.

## Rollback
- Set `ASTRO_LISTENING_ANALYZER_ENABLED=false`.
- Set `ASTRO_COMPANION_PIPELINE_ENABLED=false`.
- Keep the deterministic fallback path.
- No database rollback required.
