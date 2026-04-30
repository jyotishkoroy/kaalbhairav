Phase: 9 Supabase retrieval service
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no new migration
Groq touched: no
Ollama touched: no live calls
Retrieval:
- lib/astro/rag/retrieval-types.ts
- lib/astro/rag/retrieval-service.ts
- lib/astro/rag/reasoning-rule-repository.ts
- lib/astro/rag/benchmark-repository.ts
- lib/astro/rag/timing-repository.ts
- uses caller-provided Supabase client
- retrieves compact chart facts/rules/examples/timing/remedies
- partial failures return metadata.errors and partial true
- no full raw report sent forward
Validation:
- retrieval service test:
- reasoning rule repository test:
- benchmark repository test:
- timing repository test:
- required data tests:
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
- skipped
Remaining blockers:
- none
Phase: 10 Reasoning graph selector
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no new migration
Groq touched: no
Ollama touched: no live calls
Reasoning:
- lib/astro/rag/reasoning-rule-selector.ts
- lib/astro/rag/reasoning-path-builder.ts
- deterministic only
- selects rules from RetrievalContext + RequiredDataPlan
- scores by domain, required facts, tags, weight, safety
- builds domain-specific paths for career/sleep/marriage/money/foreign/education/safety/general
- lists missing anchors
- no hallucinated facts
Validation:
- reasoning rule selector test:
- reasoning path builder test:
- retrieval service/repository tests:
- required data tests:
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
Phase: 11 Timing engine
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no new migration
Groq runtime call added: no
Groq integration tests/contracts: checked if present; otherwise full suite passed and Groq writer not implemented yet
Ollama live call added: no
Ollama/proxy/analyzer integration contracts: checked through existing proxy/local-analyzer tests
Supabase live call added: no
Supabase schema/retrieval contracts: checked through existing tests
Timing:
- lib/astro/rag/timing-engine.ts
- lib/astro/rag/python-timing-adapter.ts
- deterministic only
- uses stored timing windows, dasha facts, Varshaphal facts, explicit user dates, optional injected Python adapter
- never invents vague timing windows
- blocks timing when safety/planner restricts it
Validation:
- python timing adapter test:
- timing engine test:
- reasoning graph tests:
- retrieval service/repository tests:
- required data tests:
- analyzer schema/local analyzer tests:
- proxy test:
- rag safety gate test:
- exact fact tests:
- extractor test:
- repository test:
- schema test:
- feature flag test:
- groq/provider tests if present:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped
Remaining blockers:
- none
