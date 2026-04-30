# Phase 25 — Staged Rollout

## Goal

Execute the staged rollout plan safely. This phase documents how to move from local deterministic RAG to production with optional laptop support without breaking old routes, without enabling risky production behavior accidentally, and without making the Dell Ollama laptop a production dependency.

## Current Safe Default State

- `ASTRO_RAG_ENABLED=false`
- `ASTRO_REASONING_GRAPH_ENABLED=false`
- `ASTRO_LLM_ANSWER_ENGINE_ENABLED=false`
- `ASTRO_LOCAL_ANALYZER_ENABLED=false`
- `ASTRO_LOCAL_CRITIC_ENABLED=false`
- `ASTRO_COMPANION_MEMORY_ENABLED=false`
- `ASTRO_COMPANION_MEMORY_STORE_ENABLED=false`
- `ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED=false`
- Old V2 fallback route remains active when RAG is off.
- Production must keep working if the Dell laptop is offline.

## Stage A - Local Deterministic RAG

Env:

- `ASTRO_RAG_ENABLED=true`
- `ASTRO_REASONING_GRAPH_ENABLED=true`
- `ASTRO_LOCAL_ANALYZER_ENABLED=true`
- `ASTRO_LLM_ANSWER_ENGINE_ENABLED=false`
- `ASTRO_LOCAL_CRITIC_ENABLED=false`
- `ASTRO_VALIDATE_LLM_OUTPUT=true`
- `ASTRO_COMPANION_MEMORY_ENABLED=false`

Expected:

- exact facts
- retrieval
- sufficiency
- follow-up
- no Groq writing
- local analyzer can help but deterministic fallback must work

## Stage B - Preview Deterministic RAG

Env:

- `ASTRO_RAG_ENABLED=true`
- `ASTRO_REASONING_GRAPH_ENABLED=true`
- `ASTRO_LOCAL_ANALYZER_ENABLED=false`
- `ASTRO_LOCAL_CRITIC_ENABLED=false`
- `ASTRO_LLM_ANSWER_ENGINE_ENABLED=false`
- `ASTRO_VALIDATE_LLM_OUTPUT=true`

Expected:

- preview does not depend on the laptop
- exact facts and deterministic/fallback paths work

## Stage C - Preview Groq Writer

Env:

- `ASTRO_RAG_ENABLED=true`
- `ASTRO_REASONING_GRAPH_ENABLED=true`
- `ASTRO_LOCAL_ANALYZER_ENABLED=false`
- `ASTRO_LOCAL_CRITIC_ENABLED=false`
- `ASTRO_LLM_ANSWER_ENGINE_ENABLED=true`
- `ASTRO_VALIDATE_LLM_OUTPUT=true`
- `ASTRO_LLM_RETRY_ON_VALIDATION_FAIL=true`

Expected:

- interpretive answer quality improves
- validator blocks weak output
- no laptop dependency

## Stage D - Production RAG Without Laptop

Env:

- `ASTRO_RAG_ENABLED=true`
- `ASTRO_REASONING_GRAPH_ENABLED=true`
- `ASTRO_LLM_ANSWER_ENGINE_ENABLED=true`
- `ASTRO_VALIDATE_LLM_OUTPUT=true`
- `ASTRO_LOCAL_ANALYZER_ENABLED=false`
- `ASTRO_LOCAL_CRITIC_ENABLED=false`
- `ASTRO_COMPANION_MEMORY_ENABLED=false`

Expected:

- production uses deterministic analyzer/fallback and Groq writer
- laptop offline does not break production
- old V2 fallback remains available

## Stage E - Production With Optional Laptop

Only after proxy and tunnel are stable.

Env:

- `ASTRO_LOCAL_ANALYZER_ENABLED=true`
- `ASTRO_LOCAL_CRITIC_ENABLED=true`
- `ASTRO_LOCAL_CRITIC_REQUIRED=false`

Expected:

- Ollama improves analysis and critic only when reachable
- if laptop offline, system still works
- `qwen2.5:3b` remains default

## Required Validation Before Each Stage

- `npm run validate:astro-rag-rollout -- --stage <stage> --json`
- `npx vitest run tests/astro/rag/rollout-validation.test.ts`
- `npx vitest run tests/astro/rag/feature-flags.test.ts`
- `npx vitest run tests/astro/rag/smoke-scripts.test.ts`
- `npx vitest run tests/astro/rag/rag-api-route.test.ts`
- `npx vitest run tests/astro/rag/rag-ui.test.tsx`
- `npx vitest run tests/astro/rag/rag-reading-orchestrator.test.ts`
- `npx vitest run tests/astro/rag/companion-memory.test.ts`
- `npx vitest run tests/astro/rag/fallback-answer.test.ts`
- `npx vitest run tests/astro/rag/retry-controller.test.ts`
- `npx vitest run tests/astro/rag/groq-answer-prompt.test.ts`
- `npx vitest run tests/astro/rag/groq-answer-writer.test.ts`
- `npx vitest run tests/astro/rag/local-critic.test.ts`
- `npx vitest run tests/astro/rag/local-analyzer.test.ts`
- `npx vitest run tests/astro/rag/ollama-analyzer-proxy.test.ts`
- `npx vitest run tests/astro/rag/answer-validator.test.ts`
- `npx vitest run tests/astro/rag/safety-validator.test.ts`
- `npx vitest run tests/astro/rag/timing-validator.test.ts`
- `npx vitest run tests/astro/rag/remedy-validator.test.ts`
- `npx vitest run tests/astro/rag/schema.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`

## Required Smoke Prompts

1. What is my Lagna?
2. Where is Sun placed?
3. I am working hard and not getting promotion.
4. Give me remedy for bad sleep.
5. Can my chart tell when I will die?
6. What will happen?

## Feature Flag Matrix

| Stage | RAG | Reasoning graph | LLM writer | Local analyzer | Local critic | Companion memory |
| --- | --- | --- | --- | --- | --- | --- |
| Local deterministic | `true` | `true` | `false` | `true` | `false` | `false` |
| Preview deterministic | `true` | `true` | `false` | `false` | `false` | `false` |
| Preview Groq writer | `true` | `true` | `true` | `false` | `false` | `false` |
| Production Groq | `true` | `true` | `true` | `false` | `false` | `false` initially |
| Production optional laptop | `true` | `true` | `true` | `true` optional | `true` optional | `false` until explicitly approved |

## Rollback Matrix

- Disable all RAG: `ASTRO_RAG_ENABLED=false`
- Disable Groq writer: `ASTRO_LLM_ANSWER_ENGINE_ENABLED=false`
- Disable laptop: `ASTRO_LOCAL_ANALYZER_ENABLED=false`, `ASTRO_LOCAL_CRITIC_ENABLED=false`
- Disable memory: `ASTRO_COMPANION_MEMORY_ENABLED=false`, `ASTRO_COMPANION_MEMORY_STORE_ENABLED=false`, `ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED=false`
- Production fallback: old V2 route remains active when `ASTRO_RAG_ENABLED=false`

## Production Safety Rules

- Never enable production RAG flags in code.
- Keep `ASTRO_VALIDATE_LLM_OUTPUT=true` when the LLM writer is enabled.
- Keep `ASTRO_LOCAL_CRITIC_REQUIRED=false` in production stages.
- Keep the laptop optional.
- Do not enable companion memory store/retrieve in production without explicit approval.
- Do not change V1 route behavior.
- Do not change old V2 fallback behavior.

## Dell/Ollama Optionality Rule

The Dell Ollama laptop is optional. Production must work if the laptop is offline. If the local analyzer or critic is enabled, they must be treated as best-effort helpers with fallback behavior, not as production dependencies.

## No Private Files in Git Rule

- Do not commit `.env` files, secrets, raw benchmark markdown, live reports, generated JSONL, tmp output, archives, or uploaded/private files.
- Do not stage machine-specific paths or local proxy credentials.

## Deployment Commands

- `git push`
- `npx vercel --prod`

## Live Verification Commands

- `npm run check:astro-rag-live -- --base-url https://tarayai.com`
- `npm run compare:astro-rag-local-live -- --local-base-url http://127.0.0.1:3000 --live-base-url https://tarayai.com`

## Known Environment Limitations

- `npm run dev:local` may be blocked by sandbox `EPERM` when binding localhost in Codex.
- `npx tsx` may require registry access in this shell if `tsx` is not already installed locally.
- Live verification may be blocked by auth, profile setup, or network restrictions.
- Production rollout should not depend on the laptop being reachable.
