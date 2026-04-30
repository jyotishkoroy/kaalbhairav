Phase: 7 Ollama intent analyzer client
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no
Groq touched: no
Ollama touched: client code only; tests use fake fetch
Client:
- lib/astro/rag/analyzer-schema.ts
- lib/astro/rag/local-analyzer.ts
- uses Phase 6 proxy /analyze-question
- uses timeout
- requires secret when enabled
- deterministic fallback if disabled/offline/timeout/invalid JSON
- does not call raw Ollama directly
Validation:
- analyzer schema test:
- local analyzer test:
- proxy test:
- rag safety gate test:
- exact fact tests:
- extractor test:
- repository test:
- schema test:
- feature flag test:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped
Remaining blockers:
- none
Phase: 8 Required-data planner
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no
Groq touched: no
Ollama touched: no live calls; uses analyzer result type only
Planner:
- lib/astro/rag/required-data-matrix.ts
- lib/astro/rag/required-data-planner.ts
- deterministic only
- uses AnalyzerResult + RagSafetyGateResult
- safety overrides data planning
- timing claims require timing_source
- exact facts stay narrow
- remedies require safe_remedy_rules where appropriate
Validation:
- required data matrix test:
- required data planner test:
- analyzer schema/local analyzer tests:
- proxy test:
- rag safety gate test:
- exact fact tests:
- extractor test:
- repository test:
- schema test:
- feature flag test:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped or completed
Remaining blockers:
- none or exact blockers
