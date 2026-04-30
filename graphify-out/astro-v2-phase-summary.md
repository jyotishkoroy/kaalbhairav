Phase: 19 API route integration
Branch: phase-rag-foundation
Runtime behavior changed: /api/astro/v2/reading can call RAG orchestrator only when ASTRO_RAG_ENABLED=true
UI changed: no
DB changed: no migration
Groq live call added: no; route tests mock orchestrator
Ollama live call added: no; route tests mock orchestrator
Supabase live call added in tests: no; auth/profile mocked
Route:
- app/api/astro/v2/reading/route.ts
- flag off preserves old V2 path
- flag on can call ragReadingOrchestrator
- RAG failure falls back to old V2 path
- safe compact metadata only
- no artifacts/secrets/raw facts in response
Validation:
- rag api route test:
- rag reading orchestrator test:
- fallback/retry tests:
- groq answer prompt/writer tests:
- critic tests:
- validator tests:
- answer contract tests:
- sufficiency checker test:
- timing tests:
- reasoning graph tests:
- retrieval service/repository tests:
- required data tests:
- analyzer/local analyzer tests:
- proxy test:
- rag safety gate test:
- exact fact tests:
- extractor/repository tests:
- schema test:
- feature flag test:
- old route tests:
- existing groq/provider tests:
- typecheck:
- lint:
- build:
- full tests:
Deployment:
- skipped or completed
Remaining blockers:
- none or exact blockers
Phase: 20 UI integration
Branch: phase-rag-foundation
Runtime behavior changed: /astro/v2 can render structured RAG sections when API returns them
Old UI fallback: preserved for plain answer responses
DB changed: no migration
Groq live call added: no
Ollama live call added: no
Supabase live call added in tests: no
UI:
- components/astro/RagReadingPanel.tsx
- components/astro/AstroV2ChatClient.tsx
- renders direct answer, chart basis, reasoning, timing, what to do, safe remedies, accuracy, limitations, suggested follow-up, safety response
- hides debug/internal metadata
- does not expose artifacts/secrets/raw facts
- does not hardcode answer content
Validation:
- rag UI test: passed
- rag API route test:
- rag reading orchestrator test:
- fallback/retry tests:
- groq answer prompt/writer tests:
- critic tests:
- validator tests:
- answer contract tests:
- sufficiency checker test:
- timing tests:
- reasoning graph tests:
- retrieval service/repository tests:
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
Visual:
- local: pending
- live: not run
Deployment:
- skipped
Remaining blockers:
- none
