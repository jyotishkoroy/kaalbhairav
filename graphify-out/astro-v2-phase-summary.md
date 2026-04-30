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
