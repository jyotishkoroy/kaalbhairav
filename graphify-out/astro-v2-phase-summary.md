Phase: 18 RAG reading orchestrator
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no migration
Groq live call added: no; orchestrator tests use mocked writer
Ollama live call added: no; orchestrator tests use mocked analyzer/critic
Supabase live call added: no; orchestrator tests use mocked retrieval
Orchestrator:
- `lib/astro/rag/rag-reading-orchestrator.ts`
- enforces strict pipeline order
- safety and exact facts short-circuit before analyzer/Groq
- analyzer/planner/retrieval/reasoning/timing/sufficiency/contract run before writer
- Groq output validated before final answer
- critic advisory only
- retry/fallback controller produces final safe answer
- exposes metadata and artifacts for Phase 19 API integration
Validation:
- `tests/astro/rag/rag-reading-orchestrator.test.ts`: passed
- `tests/astro/rag/fallback-answer.test.ts`: pending
- `tests/astro/rag/retry-controller.test.ts`: pending
- `tests/astro/rag/groq-answer-prompt.test.ts`: pending
- `tests/astro/rag/groq-answer-writer.test.ts`: pending
- `tests/astro/rag/critic-schema.test.ts`: pending
- `tests/astro/rag/local-critic.test.ts`: pending
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
- none or exact blockers
