Phase: 12 Sufficiency checker
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
Sufficiency:
- lib/astro/rag/sufficiency-checker.ts
- deterministic only
- uses AnalyzerResult, RagSafetyGateResult, RequiredDataPlan, RetrievalContext, ReasoningPath, TimingContext
- safety always wins
- vague questions ask follow-up
- missing required facts fallback
- missing timing source prevents timing claims
- partial retrieval can answer only if critical facts are present
- gates Groq/critic eligibility
Validation:
- sufficiency checker test:
- python timing adapter test:
- timing engine test:
- reasoning graph tests:
- retrieval service/repository tests:
- required data tests:
- analyzer schema/local analyzer tests:
- proxy test:
- rag safety gate test:
- exact fact tests:
- extractor/repository tests:
- schema test:
- feature flag test:
- groq/provider tests if present:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped or completed
Remaining blockers:
- none or exact blockers
