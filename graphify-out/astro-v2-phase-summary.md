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
