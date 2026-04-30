Phase: 17 Retry and fallback controller
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no new migration
Local dev smoke fix:
- `npm run dev:local` binds to `127.0.0.1`
- `npm run verify:astro-local` binds to `127.0.0.1:3001`
- sandbox still returns EPERM on socket bind, so localhost smoke is documented even though the sandbox cannot open the port
Groq live call added: no; retry tests use mocked writer
Ollama live call added: no; critic tests use mocked critic/proxy
Supabase live call added: no
Retry/fallback:
- `lib/astro/rag/retry-controller.ts`
- `lib/astro/rag/fallback-answer.ts`
- retries Groq once max only for repairable issues
- never returns unvalidated Groq output
- fatal deterministic validator failures go directly to fallback
- critic is advisory and cannot override deterministic fallback
- fallback answers are deterministic and safe
Validation:
- `tests/astro/rag/fallback-answer.test.ts`: passed
- `tests/astro/rag/retry-controller.test.ts`: passed
- `tests/astro/rag/groq-answer-prompt.test.ts`: passed
- `tests/astro/rag/groq-answer-writer.test.ts`: passed
- `tests/astro/rag/critic-schema.test.ts`: passed
- `tests/astro/rag/local-critic.test.ts`: passed
- `tests/astro/rag/fact-validator.test.ts`: pending
- `tests/astro/rag/safety-validator.test.ts`: pending
- `tests/astro/rag/timing-validator.test.ts`: pending
- `tests/astro/rag/remedy-validator.test.ts`: pending
- `tests/astro/rag/genericness-validator.test.ts`: pending
- `tests/astro/rag/answer-validator.test.ts`: pending
- `tests/astro/rag/contracts.test.ts`: pending
- `tests/astro/rag/answer-contract-builder.test.ts`: pending
- `tests/astro/rag/sufficiency-checker.test.ts`: pending
- `tests/astro/rag/python-timing-adapter.test.ts`: pending
- `tests/astro/rag/timing-engine.test.ts`: pending
- `tests/astro/rag/reasoning-rule-selector.test.ts`: pending
- `tests/astro/rag/reasoning-path-builder.test.ts`: pending
- `tests/astro/rag/reasoning-rule-repository.test.ts`: pending
- `tests/astro/rag/benchmark-repository.test.ts`: pending
- `tests/astro/rag/timing-repository.test.ts`: pending
- `tests/astro/rag/retrieval-service.test.ts`: pending
- `tests/astro/rag/required-data-matrix.test.ts`: pending
- `tests/astro/rag/required-data-planner.test.ts`: pending
- `tests/astro/rag/analyzer-schema.test.ts`: pending
- `tests/astro/rag/local-analyzer.test.ts`: pending
- `tests/astro/rag/ollama-analyzer-proxy.test.ts`: pending
- `tests/astro/rag/safety-gate.test.ts`: pending
- `tests/astro/rag/exact-fact-answer.test.ts`: pending
- `tests/astro/rag/exact-fact-router.test.ts`: pending
- `tests/astro/rag/chart-fact-extractor.test.ts`: pending
- `tests/astro/rag/chart-fact-repository.test.ts`: pending
- `tests/astro/rag/schema.test.ts`: pending
- `tests/astro/rag/feature-flags.test.ts`: pending
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Deployment:
- skipped
Remaining blockers:
- sandbox EPERM still prevents an actual local dev socket bind here
