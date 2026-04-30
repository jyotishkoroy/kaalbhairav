Phase: 15 Deterministic validator
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no new migration
Groq runtime call added: no
Groq integration tests/contracts: existing provider tests + Groq writer tests checked
Ollama live call added: no
Ollama/proxy/analyzer integration contracts: checked through existing proxy/local-analyzer tests
Supabase live call added: no
Supabase schema/retrieval contracts: checked through existing tests
Validator:
- lib/astro/rag/validation-types.ts
- lib/astro/rag/answer-validator.ts
- lib/astro/rag/validators/validator-utils.ts
- lib/astro/rag/validators/fact-validator.ts
- lib/astro/rag/validators/safety-validator.ts
- lib/astro/rag/validators/timing-validator.ts
- lib/astro/rag/validators/remedy-validator.ts
- lib/astro/rag/validators/genericness-validator.ts
- deterministic only
- validates required sections, anchors, facts, timing, safety, remedies, genericness
- returns score, issues, retry/fallback recommendations, correctionInstruction
- storeValidationResult supports caller-provided Supabase client only
Validation:
- answer validator test: passed
- fact validator test: passed
- safety validator test: passed
- timing validator test: passed
- remedy validator test: passed
- genericness validator test: passed
- groq answer prompt/writer tests: passed
- answer contract tests: passed
- sufficiency checker test: passed
- python timing adapter test: passed
- timing engine test: passed
- reasoning graph tests: passed
- retrieval service/repository tests: passed
- required data tests: passed
- analyzer schema/local analyzer tests: passed
- proxy test: passed
- rag safety gate test: passed
- exact fact tests: passed
- extractor test: passed
- repository test: passed
- schema test: passed
- feature flag test: passed
- existing groq/provider tests: passed
- typecheck: pending
- lint: pending
- build: pending
- full tests: pending
Deployment:
- skipped
Remaining blockers:
- none
Phase: 16 Ollama critic client
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no new migration
Groq runtime call added: no
Groq integration tests/contracts: existing provider tests + Groq writer tests checked
Ollama critic client added: yes
Ollama live call in tests: no; critic tests use mocked fetch
Ollama/proxy/analyzer integration contracts: checked through existing proxy/local-analyzer tests
Supabase live call added: no
Supabase schema/retrieval contracts: checked through existing tests
Critic:
- lib/astro/rag/critic-schema.ts
- lib/astro/rag/local-critic.ts
- calls Phase 6 proxy /critic only when enabled/configured
- advisory only
- never overrides deterministic safety/exact facts/validator fallback
- merges retry/fallback advice conservatively
- failure is non-fatal unless ASTRO_LOCAL_CRITIC_REQUIRED=true
Validation:
- critic schema test:
- local critic test:
- answer validator tests:
- groq answer prompt/writer tests:
- answer contract tests:
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
- extractor test:
- repository test:
- schema test:
- feature flag test:
- existing groq/provider tests:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped
Remaining blockers:
- none
