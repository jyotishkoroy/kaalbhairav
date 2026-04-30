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
Phase: 24 Full validation pass
Branch: phase-rag-foundation
Runtime behavior changed: no, unless fixes were required
UI changed: no, unless fixes were required
DB changed: no, unless fixes were required
Validation:
- npm test: passed
- typecheck: passed
- lint: passed
- build: passed
- verify astro preview: passed
- check astro rag smoke: skipped in Codex shell because `npx tsx` required registry access and `tsx` is not installed locally; local dev server start was also blocked by sandbox `EPERM`
- check astro rag live: skipped in Codex shell because `npx tsx` required registry access and `tsx` is not installed locally
- compare local/live: skipped in Codex shell because `npx tsx` required registry access and `tsx` is not installed locally
- local ollama health: skipped in Codex shell because `npx tsx` required registry access and `tsx` is not installed locally
- focused RAG suites: passed
- old route/UI/provider suites: passed
Private file check:
- no new private files staged
Deployment:
- skipped
Remaining blockers:
- none in repo code; local smoke scripts need installed `tsx` or a shell path to run without network lookup
Phase: 25 Staged rollout
Branch: phase-rag-foundation
Runtime behavior changed: no code runtime behavior change unless validation helper only
UI changed: no
DB changed: no
Rollout:
- Stage A local deterministic RAG documented
- Stage B preview deterministic RAG documented
- Stage C preview Groq writer documented
- Stage D production RAG without laptop documented
- Stage E production optional laptop documented
- production laptop remains optional
- no production flags enabled in code
Validation helper:
- scripts/validate-astro-rag-rollout.ts
- validates safe rollout flag combinations
- rejects unsafe production laptop/validator settings
Validation:
- rollout validation tests:
- feature flag tests:

Phase: 26A blocker fix - route-aware smoke diagnostics
Branch: phase-rag-foundation
Runtime behavior changed: no
UI changed: no
DB changed: no
Smoke script:
- detects real page/API route availability
- classifies `route_missing`, `auth_blocked`, `profile_blocked`, `context_missing`, `request_shape_mismatch`, `server_error`, and `unknown_failure`
- supports `--page-path` and `--reading-path` overrides
- no six unexplained `not_found` semantic failures
Validation:
- smoke script tests:
- rollout validation tests:
- rag API route tests:
- rag UI tests:
- feature flag tests:
- typecheck:
- lint:
- build:
- full tests:
Manual:
- dev local:
- check astro rag smoke debug:
Deployment:
- skipped
Remaining blockers:
- none or exact blockers
- smoke script tests:
- rag API route tests:
- rag UI tests:
- orchestrator tests:
- companion memory tests:
- fallback/retry tests:
- groq writer tests:
- analyzer/critic/proxy tests:
- validator/safety/timing/remedy tests:
- schema tests:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped or completed
Remaining blockers:
- none or exact blockers

Phase: Rollout execution after Phase 25
Branch: phase-rag-foundation
Starting commit: 7d8dbf6
Runtime behavior changed: no
UI changed: no
DB changed: no
Validation:
- npm test: passed
- typecheck: passed
- lint: passed
- build: passed
- verify astro preview: passed
- focused RAG suites: passed
- rollout stage validation: blocked in Codex shell because `npx tsx` tried to fetch `tsx` and failed with `ENOTFOUND registry.npmjs.org`
- local smoke: blocked in Codex shell because `npm run dev:local` failed with `EPERM` on `127.0.0.1:3000`
- local ollama health: started but not completed in this shell; same `npx tsx` registry access limitation applies
- live smoke: not run
Deployment:
- skipped
Production flags:
- ASTRO_RAG_ENABLED: unchanged
- ASTRO_LLM_ANSWER_ENGINE_ENABLED: unchanged
- ASTRO_LOCAL_ANALYZER_ENABLED: unchanged
- ASTRO_LOCAL_CRITIC_ENABLED: unchanged
- ASTRO_COMPANION_MEMORY_ENABLED: unchanged
Rollback:
- disable ASTRO_RAG_ENABLED=false
Remaining blockers:
- no repo blocker; rollout-stage CLI needs local `tsx` availability without registry lookup, and local dev socket bind is blocked by the Codex sandbox
Phase: 26A Fix local rollout validation and smoke script
Branch: phase-rag-foundation
Runtime behavior changed: no app runtime behavior change
UI changed: no
DB changed: no
Smoke script:
- route availability preflight added/improved
- not_found diagnostics include endpoint/method/status/body/likely cause/suggested fix
- --debug supported
- profile/chart/user context flags supported where safe
Rollout validator:
- missing env diagnostics include copyable commands
- JSON output includes suggested env/command where safe
Validation:
- smoke script tests:
- rollout validation tests:
- feature flag tests:
- rag API route tests:
- rag UI tests:
- orchestrator tests:
- safety/exact/validator/fallback tests:
- local analyzer/critic/proxy tests:
- typecheck:
- lint:
- build:
- full tests:
Manual:
- validate rollout production-groq:
- local smoke debug:
Deployment:
- skipped
Remaining blockers:
- none or exact blockers
