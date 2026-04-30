# Rollout Execution Record

## Goal

Execute the Phase 25 rollout preparation and first safe rollout validation step without adding new RAG features or changing the production behavior in code.

## Starting Commit

- `7d8dbf6` `chore(astro): document staged rag rollout`

## Validation Commands Run

- `npm test` - passed
- `npm run typecheck` - passed
- `npm run lint` - passed
- `npm run build` - passed
- `npm run verify:astro-preview` - passed
- `npx vitest run tests/astro/rag/rollout-validation.test.ts` - passed
- `npx vitest run tests/astro/rag/smoke-scripts.test.ts` - passed
- `npx vitest run tests/astro/rag/feature-flags.test.ts` - passed
- `npx vitest run tests/astro/rag/rag-api-route.test.ts` - passed
- `npx vitest run tests/astro/rag/rag-ui.test.tsx` - passed
- `npx vitest run tests/astro/rag/rag-reading-orchestrator.test.ts` - passed
- `npx vitest run tests/astro/rag/companion-memory.test.ts` - passed
- `npx vitest run tests/astro/rag/fallback-answer.test.ts` - passed
- `npx vitest run tests/astro/rag/retry-controller.test.ts` - passed
- `npx vitest run tests/astro/rag/groq-answer-prompt.test.ts` - passed
- `npx vitest run tests/astro/rag/groq-answer-writer.test.ts` - passed
- `npx vitest run tests/astro/rag/local-analyzer.test.ts` - passed
- `npx vitest run tests/astro/rag/local-critic.test.ts` - passed
- `npx vitest run tests/astro/rag/ollama-analyzer-proxy.test.ts` - passed
- `npx vitest run tests/astro/rag/answer-validator.test.ts` - passed
- `npx vitest run tests/astro/rag/safety-validator.test.ts` - passed
- `npx vitest run tests/astro/rag/timing-validator.test.ts` - passed
- `npx vitest run tests/astro/rag/remedy-validator.test.ts` - passed
- `npx vitest run tests/astro/rag/schema.test.ts` - passed
- `npx vitest run tests/astro/rag/retrieval-service.test.ts` - passed
- `npx vitest run tests/astro/rag/exact-fact-router.test.ts` - passed
- `npx vitest run tests/astro/rag/exact-fact-answer.test.ts` - passed
- `npx vitest run tests/astro/rag/benchmark-parser.test.ts` - passed
- `npx vitest run tests/astro/rag/benchmark-ingestion.test.ts` - passed

## Rollout Stage Executed

- Attempted `npm run validate:astro-rag-rollout -- --stage local-deterministic --json`
- Attempted `npm run validate:astro-rag-rollout -- --stage preview-deterministic --json`
- Attempted `npm run validate:astro-rag-rollout -- --stage preview-groq --json`
- Attempted `npm run validate:astro-rag-rollout -- --stage production-groq --json`
- Attempted `npm run validate:astro-rag-rollout -- --stage production-optional-laptop --json`
- Result: blocked in this shell because `npx tsx` tried to fetch `tsx` from `registry.npmjs.org` and failed with `ENOTFOUND`

## Production Env State Used or Required

- Not changed from repo code
- Required for first rollout without laptop:
  - `ASTRO_RAG_ENABLED=true`
  - `ASTRO_REASONING_GRAPH_ENABLED=true`
  - `ASTRO_LLM_ANSWER_ENGINE_ENABLED=true`
  - `ASTRO_VALIDATE_LLM_OUTPUT=true`
  - `ASTRO_LLM_RETRY_ON_VALIDATION_FAIL=true`
  - `ASTRO_LOCAL_ANALYZER_ENABLED=false`
  - `ASTRO_LOCAL_CRITIC_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_STORE_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED=false`

## Deployment Status

- Not deployed
- No code changes were made for production behavior

## Local Smoke Status

- `npm run dev:local` failed in this sandbox with `EPERM: operation not permitted 127.0.0.1:3000`
- No browser smoke could be run here because the local server could not bind

## Live Smoke Status

- Not run
- Deployment did not occur

## Ollama Health Status

- `npm run check:local-ollama-health` was started, but the underlying `npx tsx` path is blocked in this shell by npm registry access
- Optional and non-blocking for production rollout

## Feature Flags

- No production flags were enabled in code
- Old V2 fallback remains available when `ASTRO_RAG_ENABLED=false`
- Production laptop dependency remains optional, not required

## Rollback Path

- Code rollback: `git revert <rollout-execution-commit>`
- If production behavior regresses after deployment:
  - `ASTRO_RAG_ENABLED=false`
  - `ASTRO_LLM_ANSWER_ENGINE_ENABLED=false`
  - `ASTRO_LOCAL_ANALYZER_ENABLED=false`
  - `ASTRO_LOCAL_CRITIC_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_STORE_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED=false`
- Production fallback: old V2 route remains active when `ASTRO_RAG_ENABLED=false`
- Database rollback: no DB changes expected

## Known Skipped Checks With Exact Reason

- `npm run validate:astro-rag-rollout -- --stage <stage> --json` could not complete because `npx tsx` required registry access in this shell and failed with `ENOTFOUND registry.npmjs.org`
- `npm run dev:local` could not start because the sandbox rejected binding `127.0.0.1:3000` with `EPERM`
- Live smoke was not attempted because there was no local server and no deployment

## Private File Check

- No private files were staged
- No `.env`, archive, docx, zip, tmp, or raw benchmark report files were staged for this rollout record
