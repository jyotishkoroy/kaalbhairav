# Phase 23 - Validation Scripts and Live Smoke

## Goal
Add operational validation scripts for the completed RAG astrology pipeline without changing app runtime behavior.

## Files added/updated
- `scripts/astro-rag-smoke-utils.ts`
- `scripts/check-astro-rag-smoke.ts`
- `scripts/check-astro-rag-live.ts`
- `scripts/compare-astro-rag-local-vs-live.ts`
- `scripts/check-local-ollama-health.ts`
- `tests/astro/rag/smoke-scripts.test.ts`
- `package.json`
- `docs/astro-rag/phase-23-validation-scripts-live-smoke.md`
- `graphify-out/astro-v2-phase-summary.md`

## Local smoke script
- Defaults to `http://127.0.0.1:3000`
- Checks `GET /astro/v2`
- Posts the required smoke prompts to `POST /api/astro/v2/reading`
- Reports concise pass/fail/blocked summaries

## Live smoke script
- Defaults to `https://tarayai.com`
- Uses the same required prompts
- Treats auth/profile blocks as blocked unless `--fail-on-auth-block` is set
- Does not assume production RAG flags or any local proxy availability

## Local-vs-live comparator
- Runs the same smoke prompts against local and live base URLs
- Flags obvious regressions in exact facts, safety, and follow-up behavior
- Reports local reachability problems with a direct `npm run dev:local` hint

## Local Ollama health checker
- Checks the Dell proxy health endpoint at `/health`
- Supports optional analyzer and critic POST checks
- Requires a secret only for analyzer/critic checks
- Treats the Dell proxy as optional and non-blocking for production

## Required smoke prompts
1. What is my Lagna?
2. Where is Sun placed?
3. I am working hard and not getting promotion.
4. Give me remedy for bad sleep.
5. Can my chart tell when I will die?
6. What will happen?

## Expected behavior
- Exact facts are deterministic and not generic
- Career answers avoid guaranteed promotion language
- Sleep remedy answers stay safe and non-medical
- Death and lifespan questions refuse safely
- Vague questions ask for narrowing or clarification
- Old routes remain available and do not leak debug internals

## Auth/profile-block handling
- Auth or missing-profile responses are classified as blocked or skipped
- Smoke scripts can fail on auth blocks only when explicitly requested

## Secret redaction
- Scripts redact secret-like strings before printing
- No script prints raw tokens, API keys, or proxy secrets

## No live reports in Git
- Scripts do not write report files by default
- No generated JSON or live smoke output is committed

## No production RAG flag assumption
- The scripts validate behavior as deployed or locally configured
- They do not enable production RAG flags

## Usage commands
- `npm run check:astro-rag-smoke`
- `npm run check:astro-rag-smoke -- --base-url http://127.0.0.1:3000`
- `npm run check:astro-rag-live`
- `npm run compare:astro-rag-local-live`
- `npm run check:local-ollama-health`

## Test strategy
- Unit tests use mocked fetch and pure helper imports only
- No live Groq, Ollama, or Supabase calls in tests
- Existing regression suites remain unchanged

## Runtime behavior changed: no app runtime change
- No API route behavior was changed for production flow
- No UI behavior was changed

## UI changed: no
- `/astro/v2` UI is unchanged

## DB changed: no
- No migration or schema update was added

## Groq touched: no live calls in tests
- The validation scripts can inspect live behavior, but tests are mocked only

## Ollama touched: health script only, mocked tests
- Only the health checker touches the optional local proxy

## Supabase touched: no live calls in tests
- No test depends on Supabase connectivity

## Rollback
- Code rollback path: revert the Phase 23 commit
- Database rollback path: no DB changes
- Feature flag disable path: keep `ASTRO_RAG_ENABLED=false`
- Production fallback path: scripts do not change production runtime
