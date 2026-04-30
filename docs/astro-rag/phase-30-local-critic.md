# Phase 30 - Strengthen Local Critic

## Goal
Strengthen the existing local Ollama critic so it can better detect weak, generic, unsafe, ungrounded, hallucinated, unsupported-timing, unsupported-remedy, and emotionally poor answers.

## What changed
- Expanded the critic result schema with advisory scoring and structured findings.
- Hardened critic JSON validation and normalization.
- Routed critic availability through the local model router.
- Kept the critic optional, feature-flagged, and soft-failing.
- Kept deterministic validators as the final authority.

## Critic responsibility
- Critic does not write the final answer.
- Critic does not invent facts.
- Critic does not override deterministic validators.
- Critic can return structured findings, warnings, and rewrite suggestions.

## What critic must not do
- Do not rewrite the answer generation flow.
- Do not add a tone polisher.
- Do not add companion UI.
- Do not require Ollama in production.
- Do not bypass safety or exact-fact validators.

## Router/model behavior
- Critic task routing goes through `local-model-router.ts`.
- `qwen2.5:3b` remains the default model.
- `qwen2.5:1.5b` is a fallback model with a warning.
- `qwen2.5:7b` is not the default and is treated as a deep/manual warning-only path.
- `ASTRO_LOCAL_CRITIC_ENABLED` and `ASTRO_OLLAMA_CRITIC_ENABLED` control critic use.
- `ASTRO_LOCAL_CRITIC_REQUIRED` defaults to `false`.
- Production-like required critic settings fail soft and do not make Ollama mandatory.

## Safety checks
- Detects unsafe claims, fear language, death/lifespan prediction, medical/legal/financial guarantees, gemstone certainty, and expensive remedy pressure.
- Detects internal metadata, raw facts JSON, local URLs, Groq/Ollama payloads, Supabase rows, and secret-like leakage.

## Grounding checks
- Detects invented chart facts.
- Detects unsupported timing claims.
- Detects unsupported remedy claims.
- Detects missing chart/evidence anchors when the answer claims chart grounding.

## Genericness checks
- Detects generic language.
- Detects repeated/template answers.
- Detects answers that ignore the actual user question.
- Detects vague non-answers that fail to move the reading forward.

## Fallback behavior
- Critic is optional and fails soft.
- Timeout, invalid JSON, invalid shape, fetch failure, and router skip all return fallback-safe critic output.
- Raw critic payload is not user-facing.

## Integration status
- Existing Groq writer behavior was preserved.
- Existing deterministic validation remains the final gate.
- Existing retry/fallback controller continues to decide whether to retry or fall back.

## Tests run
- `npx vitest run tests/astro/rag/local-critic.test.ts`
- `npx vitest run tests/astro/rag/local-model-router.test.ts`
- `npx vitest run tests/astro/rag/answer-validator.test.ts`
- `npx vitest run tests/astro/rag/groq-answer-writer.test.ts`
- `npx vitest run tests/astro/rag/rag-reading-orchestrator.test.ts`

## Runtime behavior changed
- Optional critic behavior is strengthened behind critic flags.

## UI changed
- No.

## DB changed
- No.

## Rollback
- Code rollback:
  `git revert <phase-30-commit>`
- Feature flag rollback:
  `ASTRO_LOCAL_CRITIC_ENABLED=false`
  `ASTRO_OLLAMA_CRITIC_ENABLED=false`
  `ASTRO_LOCAL_CRITIC_REQUIRED=false`
- Production fallback:
  deterministic validators and Groq/fallback path remain.
- Database rollback:
  no DB changes.
