# Phase 27 - Local Model Router and Local AI Config

## Goal

Centralize local Ollama model selection, base URL handling, timeout defaults, task routing, fallback rules, and redaction logic for future local AI phases without changing production answer generation by default.

## Why qwen2.5:3b is default

`qwen2.5:3b` remains the default for request-path local AI because it is the best balance of speed, JSON reliability, English stability, and reasoning quality for the Dell proxy setup.

## qwen2.5:1.5b fallback policy

`qwen2.5:1.5b` is allowed only as a fast fallback with a warning that it is weaker on reasoning.

## qwen2.5:7b deep/manual critic policy

`qwen2.5:7b` is not the default and is not for normal live request-path flow. It is reserved for optional deep/manual critic work and must be explicitly enabled when used.

## Task routing table

- `listening_analyzer` - optional local analyzer helper
- `intent_analyzer` - optional local analyzer helper
- `query_expander` - disabled by default
- `sufficiency_hint` - optional local analyzer helper
- `critic` - optional local critic helper
- `deep_critic` - optional deep/manual critic helper
- `tone_polisher` - optional local tone helper
- `memory_extractor` - optional local memory helper
- `health_check` - config validation only

## Environment variables

- `ASTRO_LOCAL_ANALYZER_MODEL`
- `ASTRO_LOCAL_LISTENING_MODEL`
- `ASTRO_LOCAL_QUERY_EXPANDER_MODEL`
- `ASTRO_LOCAL_CRITIC_MODEL`
- `ASTRO_LOCAL_DEEP_CRITIC_MODEL`
- `ASTRO_LOCAL_TONE_POLISHER_MODEL`
- `ASTRO_LOCAL_MEMORY_EXTRACTOR_MODEL`
- `ASTRO_LOCAL_ANALYZER_BASE_URL`
- `ASTRO_LOCAL_ANALYZER_TIMEOUT_MS`
- `ASTRO_LOCAL_ANALYZER_MAX_INPUT_CHARS`
- `ASTRO_LOCAL_ANALYZER_CONCURRENCY`
- `ASTRO_LOCAL_CRITIC_TIMEOUT_MS`
- `ASTRO_LOCAL_CRITIC_REQUIRED`
- `ASTRO_LOCAL_QUERY_EXPANDER_TIMEOUT_MS`
- `ASTRO_LOCAL_DEEP_CRITIC_TIMEOUT_MS`
- `ASTRO_LOCAL_TONE_POLISHER_TIMEOUT_MS`
- `ASTRO_LOCAL_MEMORY_EXTRACTOR_TIMEOUT_MS`

Base URL defaults to `http://127.0.0.1:8787` when no explicit local URL is provided.

## Production safety rules

- Production must keep `ASTRO_LOCAL_ANALYZER_ENABLED=false` and `ASTRO_LOCAL_CRITIC_ENABLED=false` unless networking is intentionally configured.
- Local AI required flags must stay false in production.
- Production must not fail if Ollama is offline.
- Router does not call Ollama; it only decides config and fallback.

## Dell proxy optionality

The Dell-hosted proxy remains optional. It can be enabled for local development or future opt-in workflows, but it is not a production dependency.

## Secret redaction

Diagnostic logging must redact `TARAYAI_LOCAL_SECRET`, `Authorization`, `x-tarayai-local-secret`, `token`, `api_key`, `secret`, bearer values, and long hex strings.

## Tests run

- `tests/astro/rag/local-model-router.test.ts`
- `tests/astro/rag/local-analyzer.test.ts`
- `tests/astro/rag/local-critic.test.ts`
- `tests/astro/rag/ollama-analyzer-proxy.test.ts`
- `tests/astro/rag/feature-flags.test.ts`
- `tests/astro/rag/smoke-scripts.test.ts`
- `tests/astro/rag/rollout-validation.test.ts`
- `tests/astro/rag/rag-api-route.test.ts`
- `tests/astro/rag/rag-ui.test.tsx`
- `tests/astro/rag/rag-reading-orchestrator.test.ts`
- `tests/astro/rag/safety-validator.test.ts`
- `tests/astro/rag/answer-validator.test.ts`
- `tests/astro/rag/fallback-answer.test.ts`

## Runtime behavior changed

No production runtime behavior changed by default.

## UI changed

No.

## DB changed

No.

## Rollback

- Code rollback: `git revert <phase-27-commit>`
- Feature flag rollback:
  - `ASTRO_LOCAL_ANALYZER_ENABLED=false`
  - `ASTRO_LOCAL_CRITIC_ENABLED=false`
  - `ASTRO_LOCAL_QUERY_EXPANDER_ENABLED=false`
  - `ASTRO_LOCAL_TONE_POLISHER_ENABLED=false`
  - `ASTRO_LOCAL_MEMORY_EXTRACTOR_ENABLED=false`
- Production fallback: old deterministic, Groq, and Supabase paths remain available.
- Database rollback: no DB changes.
