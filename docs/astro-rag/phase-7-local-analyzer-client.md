# Phase 7 — Ollama Intent Analyzer Client

## Goal
Add a server-side local analyzer client for the RAG library with deterministic fallback and schema validation. This phase does not wire the client into routes or UI.

## Files Added/Updated
- `lib/astro/rag/analyzer-schema.ts`
- `lib/astro/rag/local-analyzer.ts`
- `tests/astro/rag/analyzer-schema.test.ts`
- `tests/astro/rag/local-analyzer.test.ts`
- `docs/astro-rag/phase-7-local-analyzer-client.md`
- `graphify-out/astro-v2-phase-summary.md`

## Proxy Endpoint Used
- `POST /analyze-question`

## Base URL
- `ASTRO_LOCAL_ANALYZER_BASE_URL`
- Default: `http://127.0.0.1:8787`

## Local Ollama Reference
- Direct Ollama API URL: `http://100.80.50.114:11434/api/chat`
- Model: `qwen2.5:3b`
- No API key
- Tailscale-only firewall
- The app client does not call raw Ollama directly.
- Phase 6 proxy is the preferred app path.

## Secret Env
- `TARAYAI_LOCAL_SECRET`
- `ASTRO_LOCAL_ANALYZER_SECRET`

## Timeout and Fallback
- The client uses the configured timeout when `AbortController` is available.
- If the proxy is disabled, missing a secret, slow, invalid, or non-2xx, the client falls back deterministically.
- Deterministic fallback covers exact facts, career, sleep/remedy, marriage, money, foreign, education, spirituality, vague prompts, and unsafe prompts.

## Runtime Behavior Changed
- No route integration yet.

## UI Changed
- No.

## DB Changed
- No.

## Groq Touched
- No.

## Ollama Touched
- Client code only.
- No live Ollama calls in tests.

## Validation
- Analyzer schema test: run `npx vitest run tests/astro/rag/analyzer-schema.test.ts`
- Local analyzer test: run `npx vitest run tests/astro/rag/local-analyzer.test.ts`
- Proxy test: run `npx vitest run tests/astro/rag/ollama-analyzer-proxy.test.ts`
- RAG safety test: run `npx vitest run tests/astro/rag/safety-gate.test.ts`
- Exact fact tests: run `npx vitest run tests/astro/rag/exact-fact-answer.test.ts` and `npx vitest run tests/astro/rag/exact-fact-router.test.ts`
- Extractor/repository tests: run `npx vitest run tests/astro/rag/chart-fact-extractor.test.ts` and `npx vitest run tests/astro/rag/chart-fact-repository.test.ts`
- Schema test: run `npx vitest run tests/astro/rag/schema.test.ts`
- Feature flag test: run `npx vitest run tests/astro/rag/feature-flags.test.ts`
- Typecheck: run `npm run typecheck`
- Lint: run `npm run lint`
- Build: run `npm run build`
- Full tests: run `npm test`
- Security check: no secrets, no private report/docx/zip data, no live Ollama/proxy calls in tests
- Live smoke if deployed: skipped for Phase 7 unless required by workflow

## Rollback
- Code rollback path: revert the Phase 7 commit.
- Database rollback or forward-fix path: no database changes in Phase 7.
- Feature flag disable path: set `ASTRO_LOCAL_ANALYZER_ENABLED=false`; deterministic fallback remains available.
- Production fallback path: the old Astro V2 route remains active because no route integration was added.
