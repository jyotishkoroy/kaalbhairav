# Phase 6 - Local Ubuntu Ollama Analyzer Proxy

## Goal

Add a secure local Node proxy on the Ubuntu laptop for controlled analyzer and critic access to Ollama `qwen2.5:3b`.

## Files added

- `local-services/ollama-analyzer-proxy/package.json`
- `local-services/ollama-analyzer-proxy/server.js`
- `local-services/ollama-analyzer-proxy/README.md`
- `local-services/ollama-analyzer-proxy/systemd/tarayai-ollama-proxy.service`
- `tests/astro/rag/ollama-analyzer-proxy.test.ts`

## Endpoints

- `GET /health`
- `POST /analyze-question`
- `POST /critic`

## Security controls

- POST requests require `X-tarayai-local-secret`
- Binds to `127.0.0.1` by default
- Raw Ollama API is not exposed
- JSON only

## Timeout, concurrency, and limits

- Body limit: 20 KB
- Timeout: 15000 ms
- Concurrency: 1
- Queue limit: 5

## Laptop optional rule

The proxy is local-only and optional. The main app does not depend on it yet.

## Runtime behavior changed

- No main app integration yet
- UI changed: no
- DB changed: no
- Groq touched: no
- Ollama touched: proxy code only, no live calls in tests

## Validation

- Proxy test: `npx vitest run tests/astro/rag/ollama-analyzer-proxy.test.ts`
- RAG safety test: `npx vitest run tests/astro/rag/safety-gate.test.ts`
- Exact fact tests: `npx vitest run tests/astro/rag/exact-fact-answer.test.ts` and `npx vitest run tests/astro/rag/exact-fact-router.test.ts`
- Extractor/repository tests: `npx vitest run tests/astro/rag/chart-fact-extractor.test.ts` and `npx vitest run tests/astro/rag/chart-fact-repository.test.ts`
- Schema test: `npx vitest run tests/astro/rag/schema.test.ts`
- Feature flag test: `npx vitest run tests/astro/rag/feature-flags.test.ts`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Full tests: `npm test`
- Security check: no real secrets, no private report/docx/zip data, no live Ollama calls in tests
- Live smoke if deployed: deferred until integration work

## Rollback

- Code rollback path: revert the Phase 6 commit.
- Database rollback or forward-fix path: no database changes in Phase 6.
- Feature flag disable path: keep `ASTRO_LOCAL_ANALYZER_ENABLED=false` and `ASTRO_LOCAL_CRITIC_ENABLED=false`.
- Production fallback path: old Astro V2 route remains active; production does not depend on the laptop proxy.
