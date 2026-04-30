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
