Phase: 13 Answer contract builder
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no new migration
Groq runtime call added: no
Groq integration tests/contracts: checked if present; provider/full suite passed
Ollama live call added: no
Ollama/proxy/analyzer integration contracts: checked through existing proxy/local-analyzer tests
Supabase live call added: no
Supabase schema/retrieval contracts: checked through existing tests
Contracts:
- lib/astro/rag/answer-contract-types.ts
- lib/astro/rag/answer-contract-builder.ts
- lib/astro/rag/contracts/common.ts
- lib/astro/rag/contracts/career.ts
- lib/astro/rag/contracts/sleep.ts
- lib/astro/rag/contracts/marriage.ts
- lib/astro/rag/contracts/money.ts
- lib/astro/rag/contracts/safety.ts
- lib/astro/rag/contracts/general.ts
- deterministic only
- safety/exact/follow-up/fallback disable Groq
- interpretive/remedy/timing only allow Groq when sufficiency allows
- forbidden claims include invented facts, invented timing, guarantees, medical/legal/financial unsafe claims, gemstone certainty, expensive puja pressure
- storeAnswerContract supports caller-provided Supabase client only
Validation:
- answer contract builder test:
- contract domain tests:
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
- groq/provider tests if present:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped or completed
Remaining blockers:
- none or exact blockers
Phase: 14 Groq answer writer
Branch: phase-rag-foundation
Runtime behavior changed: no route/app integration
UI changed: no
DB changed: no new migration
Groq runtime call added: writer code added but not integrated into route; automated tests use mocked fetch only
Groq integration tests/contracts: existing provider tests and new answer-writer tests checked
Ollama live call added: no
Ollama/proxy/analyzer integration contracts: checked through existing proxy/local-analyzer tests
Supabase live call added: no
Supabase schema/retrieval contracts: checked through existing tests
Writer:
- lib/astro/rag/groq-answer-prompt.ts
- lib/astro/rag/groq-answer-writer.ts
- uses AnswerContract
- calls Groq only when contract and feature flags allow
- produces JSON answer shape
- validates obvious contract violations
- deterministic fallback on disabled/missing key/error/timeout/invalid JSON
- no route integration
Validation:
- groq answer prompt test: passed
- groq answer writer test: passed
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
- typecheck: passed
- lint: passed
- build: passed
- full tests: passed
Deployment: skipped
Remaining blockers: none
