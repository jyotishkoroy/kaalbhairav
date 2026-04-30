# Phase 24 — Full Validation Pass

## Goal

Run the complete pre-production validation pass for the tarayai RAG astrology pipeline. No new features were added.

## Commands Run

- `git branch --show-current`
- `git status --short`
- `git log --oneline -30`
- `git show --name-only --format= 8e234b6`
- `cat package.json`
- `sed -n '1,420p' scripts/check-astro-rag-smoke.ts`
- `sed -n '1,420p' scripts/check-astro-rag-live.ts`
- `sed -n '1,420p' scripts/compare-astro-rag-local-vs-live.ts`
- `sed -n '1,420p' scripts/check-local-ollama-health.ts`
- `sed -n '1,420p' scripts/astro-rag-smoke-utils.ts`
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run verify:astro-preview`
- `npm run check:astro-rag-smoke`
- `npm run check:local-ollama-health`
- `npm run dev:local`
- `node --experimental-strip-types scripts/check-astro-rag-smoke.ts`
- `node --experimental-strip-types scripts/check-astro-rag-live.ts`
- `node --experimental-strip-types scripts/compare-astro-rag-local-vs-live.ts`
- `node --experimental-strip-types scripts/check-local-ollama-health.ts`
- `find tests -maxdepth 5 -type f | sort | rg "ui|tsx|astro-v2|chat|component|reading|route|api"`
- `find tests -maxdepth 5 -type f | sort | rg "groq|llm|provider|answer-writer|local-provider"`
- `npx vitest run` for the focused RAG, UI, route, and provider suites listed in Phase 24
- `git status --short`
- `git diff --stat`
- `git diff --cached --stat`
- `git diff --check`
- `find . -maxdepth 3 -type f | rg "myVedicReport|astro_package|Archive.zip|graphify-out.zip|.env|jsonl|live.report|benchmark..md|tmp"`

## Focused RAG Suites

- `tests/astro/rag/smoke-scripts.test.ts`
- `tests/astro/rag/companion-memory.test.ts`
- `tests/astro/rag/benchmark-parser.test.ts`
- `tests/astro/rag/benchmark-ingestion.test.ts`
- `tests/astro/rag/rag-api-route.test.ts`
- `tests/astro/rag/rag-ui.test.tsx`
- `tests/astro/rag/rag-reading-orchestrator.test.ts`
- `tests/astro/rag/fallback-answer.test.ts`
- `tests/astro/rag/retry-controller.test.ts`
- `tests/astro/rag/groq-answer-prompt.test.ts`
- `tests/astro/rag/groq-answer-writer.test.ts`
- `tests/astro/rag/critic-schema.test.ts`
- `tests/astro/rag/local-critic.test.ts`
- `tests/astro/rag/fact-validator.test.ts`
- `tests/astro/rag/safety-validator.test.ts`
- `tests/astro/rag/timing-validator.test.ts`
- `tests/astro/rag/remedy-validator.test.ts`
- `tests/astro/rag/genericness-validator.test.ts`
- `tests/astro/rag/answer-validator.test.ts`
- `tests/astro/rag/contracts.test.ts`
- `tests/astro/rag/answer-contract-builder.test.ts`
- `tests/astro/rag/sufficiency-checker.test.ts`
- `tests/astro/rag/python-timing-adapter.test.ts`
- `tests/astro/rag/timing-engine.test.ts`
- `tests/astro/rag/reasoning-rule-selector.test.ts`
- `tests/astro/rag/reasoning-path-builder.test.ts`
- `tests/astro/rag/retrieval-service.test.ts`
- `tests/astro/rag/required-data-planner.test.ts`
- `tests/astro/rag/local-analyzer.test.ts`
- `tests/astro/rag/ollama-analyzer-proxy.test.ts`
- `tests/astro/rag/safety-gate.test.ts`
- `tests/astro/rag/exact-fact-answer.test.ts`
- `tests/astro/rag/schema.test.ts`
- `tests/astro/rag/feature-flags.test.ts`

## Full Validation Status

- `npm test`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `verify:astro-preview`: passed

## Local Smoke Status

- `npm run dev:local`: blocked by sandbox `EPERM` on `127.0.0.1:3000`
- `npm run check:astro-rag-smoke`: skipped in this shell because `npx` attempted registry access for `tsx`
- local smoke evidence from tests: passed

## Live Smoke Status

- `npm run check:astro-rag-live`: skipped in this shell because `npx` attempted registry access for `tsx`
- `npm run compare:astro-rag-local-live`: skipped in this shell because `npx` attempted registry access for `tsx`
- no live network/auth check was claimed as successful

## Ollama Health Status

- `npm run check:local-ollama-health`: skipped in this shell because `npx` attempted registry access for `tsx`
- Dell proxy remains optional and production must not depend on it

## Known Skipped Checks With Exact Reason

- `check:astro-rag-smoke`: `tsx` is not installed locally, and `npx` tried to resolve it from `registry.npmjs.org`, which is unavailable in the sandbox
- `check:astro-rag-live`: same `tsx` registry lookup issue
- `compare:astro-rag-local-live`: same `tsx` registry lookup issue
- `check:local-ollama-health`: same `tsx` registry lookup issue
- `dev:local`: sandbox `EPERM` prevented binding `127.0.0.1:3000`

## Runtime Behavior Changed

- no, unless validation fixes were required

## UI Changed

- no, unless validation fixes were required

## DB Changed

- no, unless validation fixes were required

## Feature Flags

- safe defaults verified
- production flags remain off

## Private File Check

- no private files staged
- no generated benchmark or live report files were staged

## Rollback

- If only docs or graphify were committed, revert the Phase 24 validation commit
- If code fixes were committed, revert the Phase 24 commit or cherry-pick revert only the fix file
- Database rollback: no DB changes expected
- Feature flag disable path:
  - `ASTRO_RAG_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_STORE_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED=false`
  - `ASTRO_LOCAL_ANALYZER_ENABLED=false`
  - `ASTRO_LOCAL_CRITIC_ENABLED=false`
  - `ASTRO_LLM_ANSWER_ENGINE_ENABLED=false`
- Production fallback path: old V2 path remains active when `ASTRO_RAG_ENABLED=false`
