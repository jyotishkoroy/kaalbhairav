Phase: 20 UI integration fix pass
Branch: phase-rag-foundation
Runtime behavior changed: no additional backend pipeline change except route sanitization and compatibility shaping
UI changed: hardened structured RAG section rendering
Old UI fallback: preserved
DB changed: no migration
Hardcoded content: none
Security:
- unsafe/internal section keys omitted
- raw meta/artifacts/raw facts not rendered
- secrets/env/local URLs not rendered
- HTML rendered as text, no dangerouslySetInnerHTML
Validation:
- rag UI test: passed
- rag API route test: passed
- broader RAG tests: passed for selected UI/provider/RAG suites
- existing UI tests: passed for selected UI suites
- existing groq/provider tests: passed for selected provider suites
- typecheck: pending
- lint: pending
- build: pending
- tests: pending
Visual:
- local: Codex sandbox EPERM on socket bind; use normal Mac terminal for dev smoke
- live: not run
Deployment:
- skipped
Remaining blockers:
- none
Phase: 21 Benchmark ingestion
Branch: phase-rag-foundation
Runtime behavior changed: no API/UI runtime change
UI changed: no
DB changed: no migration unless schema compatibility required
Groq live call added: no
Ollama live call added: no
Supabase live call in tests: no; ingestion tests use mocked Supabase
Benchmark ingestion:
- lib/astro/rag/benchmark-parser.ts
- scripts/parse-astro-benchmark-md.ts
- scripts/ingest-astro-benchmark-examples.ts
- parses Markdown examples locally
- extracts question, answer, reasoning, accuracy class, reading style, follow-up, tags
- filters unsafe examples
- dry-run default
- write requires explicit --write
- raw benchmark files not committed
Validation:
- benchmark parser test:
- benchmark ingestion test:
- retrieval service test:
- rag API route test:
- rag UI test:
- rag reading orchestrator test:
- fallback/retry tests:
- groq answer prompt/writer tests:
- critic tests:
- validator tests:
- answer contract tests:
- sufficiency checker test:
- timing tests:
- reasoning graph tests:
- required data tests:
- analyzer/local analyzer tests:
- proxy test:
- rag safety gate test:
- exact fact tests:
- extractor/repository tests:
- schema test:
- feature flag test:
- existing UI tests:
- existing groq/provider tests:
- typecheck:
- lint:
- build:
- full tests:
Manual dry-run:
- parser:
- ingestion:
Deployment:
- skipped or completed
Remaining blockers:
- none or exact blockers
Phase: 22 Companion memory
Branch: phase-rag-foundation
Runtime behavior changed: optional companion memory behind flags only
UI changed: no
DB changed: migration added only if needed
Groq live call added: no
Ollama live call added: no
Supabase live call in tests: no; repository tests mocked
Companion memory:
- lib/astro/rag/companion-memory.ts
- safe summary fields only
- sensitive domains redacted/not stored
- domain-scoped memory
- retrieval/store optional via flags
- no raw messages, raw chart facts, secrets, or artifacts stored
Validation:
- companion memory test:
- orchestrator tests:
- retrieval service tests:
- feature flag tests:
- schema test if migration added:
- rag API route test:
- rag UI test:
- fallback/retry tests:
- groq answer prompt/writer tests:
- critic tests:
- validator tests:
- answer contract tests:
- sufficiency checker test:
- timing tests:
- reasoning graph tests:
- required data tests:
- analyzer/local analyzer tests:
- proxy test:
- rag safety gate test:
- exact fact tests:
- extractor/repository tests:
- benchmark parser/ingestion tests:
- existing groq/provider tests:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped or completed
Remaining blockers:
- none or exact blockers
Phase: 23 Validation scripts and live smoke
Branch: phase-rag-foundation
Runtime behavior changed: no app runtime change
UI changed: no
DB changed: no
Groq live call added in tests: no
Ollama live call added in tests: no; health script supports optional live proxy check
Supabase live call in tests: no
Validation scripts:
- scripts/astro-rag-smoke-utils.ts
- scripts/check-astro-rag-smoke.ts
- scripts/check-astro-rag-live.ts
- scripts/compare-astro-rag-local-vs-live.ts
- scripts/check-local-ollama-health.ts
- validates exact facts, career grounding, sleep remedy safety, death safety, vague follow-up, old route/page availability
- redacts secrets and does not write reports by default
Validation:
- smoke script tests:
- companion memory tests:
- benchmark parser/ingestion tests:
- rag API route test:
- rag UI test:
- orchestrator tests:
- fallback/retry tests:
- groq answer prompt/writer tests:
- critic tests:
- validator tests:
- answer contract tests:
- sufficiency checker test:
- timing tests:
- reasoning graph tests:
- retrieval service tests:
- feature flag tests:
- schema test:
- existing groq/provider tests:
- typecheck:
- lint:
- build:
- full tests:
Manual:
- local smoke:
- live smoke:
- local ollama health:
Deployment:
- skipped or completed
Remaining blockers:
- none or exact blockers
