# Phase 26B - Clean Branch Deployment Hygiene

## Goal

Confirm the `phase-rag-foundation` branch is ready for a clean handoff into Phase 27 without changing runtime behavior, UI behavior, database state, or production feature flags.

## Starting Commit

- `14a081a fix(astro): classify rag smoke route preflight failures`

## Branch and Upstream Status

- Active branch: `phase-rag-foundation`
- Upstream: not configured at start of validation
- Branch push status: push attempted after validation; failed because the sandbox could not resolve `registry.npmjs.org` while running the rollout helper through `npx tsx`

## Dirty Worktree Classification

- Safe Phase 26B files: none before documentation updates
- Unrelated pre-existing work: the Astro reading/bank-check set in `lib/astro/reading/*`, `scripts/astro-v2-bank-check-core.mjs`, `scripts/check-astro-v2-live-banks.mjs`, `scripts/check-astro-v2-live.mjs`, `tests/astro/live-bank-checker.test.ts`, `tests/astro/reading-orchestrator-v2-llm.test.ts`, `tests/fixtures/astro-v2-question-bank-seeds.json`, and the other untracked benchmark/orchestrator files
- Private/generated files that must never be staged: `Archive.zip`, `birth_chart_50000_difficult_questions_answers.md`, `birth_chart_life_question_bank_jyotishko.md`, and `tmp/`
- Temporary files to ignore, not delete: none created by Phase 26B

## Private File Safety Check

- No private files were staged
- No `.env` or `.env.*` files were staged
- No raw benchmark markdown, zip archives, JSONL outputs, live reports, or other private/generated artifacts were staged

## Validation Commands Run

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run build` passed
- `npm test` passed
- `npx vitest run tests/astro/rag/smoke-scripts.test.ts` passed
- `npx vitest run tests/astro/rag/rollout-validation.test.ts` passed
- `npx vitest run tests/astro/rag/rag-api-route.test.ts` passed
- `npx vitest run tests/astro/rag/rag-ui.test.tsx` passed
- `npx vitest run tests/astro/rag/feature-flags.test.ts` passed

## Local Smoke Status

- Local dev server started successfully on `http://127.0.0.1:3000`
- `npm run check:astro-rag-smoke -- --base-url http://127.0.0.1:3000 --debug` ran successfully
- Preflight results:
  - `GET /astro/v2` classified as `route_available`
  - `POST /api/astro/v2/reading` classified as `route_available`
- Remaining smoke failures were semantic safety/content cases only:
  - career promotion overconfidence
  - death/lifespan safety rejection
  - vague follow-up clarification handling

## Rollout Validator Status

- `npm run validate:astro-rag-rollout -- --stage production-groq --json` was attempted
- It failed in the sandbox because `npx` tried to fetch `tsx` from the npm registry and the registry lookup returned `ENOTFOUND`
- No dependency was added and no workaround was introduced

## Push Status

- Upstream branch was not present at the start
- Push was not completed in this environment because the rollout helper could not resolve `tsx` through npm in the sandboxed network

## Deployment Status

- Deployment skipped
- No `npx vercel --prod` was run

## Production Env Readiness

- Production flags were not enabled in code
- No intentional production environment configuration was changed in the repo
- Production readiness remains an external deployment decision, not a code change

## Remaining Unrelated Dirty Files

- `lib/astro/reading/answer-quality.ts`
- `lib/astro/reading/chart-facts.ts`
- `lib/astro/reading/local-ai-refiner.ts`
- `lib/astro/reading/reading-orchestrator-v2.ts`
- `scripts/astro-v2-bank-check-core.mjs`
- `scripts/check-astro-v2-live-banks.mjs`
- `scripts/check-astro-v2-live.mjs`
- `tests/astro/live-bank-checker.test.ts`
- `tests/astro/reading-orchestrator-v2-llm.test.ts`
- `tests/fixtures/astro-v2-question-bank-seeds.json`
- `lib/astro/reading/benchmark-answer-composer.ts`
- `scripts/compare-astro-v2-local-vs-live.mjs`
- `tests/astro/benchmark-answer-composer.test.ts`
- `tests/astro/benchmark-contract.test.ts`
- `tests/astro/reading-v2-md-parity.test.ts`
- `Archive.zip`
- `birth_chart_50000_difficult_questions_answers.md`
- `birth_chart_life_question_bank_jyotishko.md`
- `tmp/`

## Rollback Path

- If only docs/graphify changed, revert the Phase 26B commit with `git revert <phase-26b-commit>`
- If the branch was pushed, no runtime rollback is required for this phase
- If deployment occurs later, use Vercel rollback or disable the relevant ASTRO flags outside the repo:
  - `ASTRO_RAG_ENABLED=false`
  - `ASTRO_LLM_ANSWER_ENGINE_ENABLED=false`
  - `ASTRO_LOCAL_ANALYZER_ENABLED=false`
  - `ASTRO_LOCAL_CRITIC_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_STORE_ENABLED=false`
  - `ASTRO_COMPANION_MEMORY_RETRIEVE_ENABLED=false`
- Database rollback: none, because Phase 26B makes no DB changes

## Next Phase

- Phase 27 Local model router and local AI config

## Required Statements

- No app runtime behavior changed.
- No UI changed.
- No DB changed.
- No production feature flags were enabled in code.
- No Dell/Ollama production dependency was introduced.
- Phase 27 must not begin until branch hygiene is complete.
